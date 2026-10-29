const db = require('../../config/db');
const { DONATION_STATUS_TRANSITIONS } = require('../../config/constants');

/**
 * Create a new food donation.
 */
const createDonation = async (providerId, data) => {
  const { rows } = await db.query(
    `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg,
        image_url, pickup_address, latitude, longitude,
        pickup_window_start, pickup_window_end, expiry_time, special_instructions)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15)
     RETURNING *`,
    [
      providerId,
      data.title,
      data.description || null,
      data.category,
      data.quantity,
      data.unit || 'servings',
      data.weight_kg || null,
      data.image_url || null,
      data.pickup_address,
      data.latitude,
      data.longitude,
      data.pickup_window_start,
      data.pickup_window_end,
      data.expiry_time,
      data.special_instructions || null,
    ]
  );

  // Increment provider's total_donations counter
  await db.query(
    'UPDATE food_providers SET total_donations = total_donations + 1 WHERE id = $1',
    [providerId]
  );

  return rows[0];
};

/**
 * Get all donations with role-based data isolation and optional filters.
 */
const getDonations = async ({
  page = 1,
  limit = 20,
  status,
  category,
  providerId,
  myClaimsOnly = false,
  user = null,
  lat,
  lng,
  radiusKm,
}) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  // 1. Enforce strict role-based data ownership
  if (user?.role === 'provider') {
    // Food provider CAN ONLY view their own donations
    const provRes = await db.query(
      'SELECT id FROM food_providers WHERE user_id = $1',
      [user.id]
    );
    const myProviderId = provRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
    params.push(myProviderId);
    conditions.push(`fd.provider_id = $${params.length}`);
  } else if (user?.role === 'ngo') {
    if (myClaimsOnly) {
      // NGO viewing only their claimed donations
      const ngoRes = await db.query(
        'SELECT id FROM ngos WHERE user_id = $1',
        [user.id]
      );
      const myNgoId = ngoRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
      params.push(myNgoId);
      conditions.push(`c.ngo_id = $${params.length} AND c.status = 'accepted'`);
    } else {
      // NGO browsing available donations: only show active/unclaimed/unexpired donations
      conditions.push(`fd.status IN ('posted', 'matched') AND fd.expiry_time > NOW()`);
    }
  } else if (user?.role === 'volunteer') {
    if (!status) {
      conditions.push(`fd.status IN ('claimed', 'posted', 'matched', 'volunteer_assigned', 'collected')`);
    }
  } else if (user?.role === 'admin') {
    // Admins can filter by specific providerId if supplied
    if (providerId) {
      params.push(providerId);
      conditions.push(`fd.provider_id = $${params.length}`);
    }
  } else {
    // Public / unauthenticated: strictly posted and unexpired
    conditions.push(`fd.status = 'posted' AND fd.expiry_time > NOW()`);
  }

  let selectFields = `
    fd.*,
    fp.user_id AS provider_user_id,
    fp.business_name AS provider_name,
    fp.business_type AS provider_business_type,
    fp.address AS provider_address,
    fp.is_verified AS provider_is_verified,
    fp.total_donations AS provider_total_donations,
    fp.operating_hours AS provider_operating_hours,
    u.id AS donor_user_id,
    u.full_name AS provider_contact,
    u.phone AS provider_phone,
    u.email AS provider_email,
    u.avatar_url AS provider_avatar,
    del.id AS delivery_id,
    del.status AS delivery_status,
    del.pickup_type AS pickup_type,
    del.pickup_time AS delivery_pickup_time,
    del.delivery_time AS delivery_completed_time,
    del.notes AS delivery_notes,
    del.distance_km AS delivery_distance_km,
    v.id AS volunteer_id,
    v_user.id AS volunteer_user_id,
    v_user.full_name AS volunteer_name,
    v_user.phone AS volunteer_phone,
    v_user.email AS volunteer_email,
    v.vehicle_type AS volunteer_vehicle_type,
    v.rating AS volunteer_rating,
    v.total_deliveries AS volunteer_total_deliveries,
    c.id AS claim_id,
    c.status AS claim_status,
    c.pickup_type AS claim_pickup_type,
    c.claimed_at AS claim_time,
    ngo.id AS ngo_id,
    ngo_u.id AS ngo_user_id,
    ngo.organization_name AS ngo_name,
    ngo_u.phone AS ngo_phone,
    ngo_u.email AS ngo_email
  `;

  let fromClause = `
    FROM food_donations fd
    JOIN food_providers fp ON fp.id = fd.provider_id
    JOIN users u ON u.id = fp.user_id
    LEFT JOIN deliveries del ON del.donation_id = fd.id
    LEFT JOIN volunteers v ON v.id = del.volunteer_id
    LEFT JOIN users v_user ON v_user.id = v.user_id
    LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
    LEFT JOIN ngos ngo ON ngo.id = c.ngo_id
    LEFT JOIN users ngo_u ON ngo_u.id = ngo.user_id
  `;

  if (status && (user?.role === 'provider' || user?.role === 'admin' || myClaimsOnly)) {
    params.push(status);
    conditions.push(`fd.status = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`fd.category = $${params.length}`);
  }

  // Geo-filtering using Haversine approximation
  if (lat && lng && radiusKm) {
    params.push(parseFloat(lat));
    params.push(parseFloat(lng));
    params.push(parseFloat(radiusKm));
    const haversine = `
      (6371 * acos(
        cos(radians($${params.length - 2})) * cos(radians(fd.latitude)) *
        cos(radians(fd.longitude) - radians($${params.length - 1})) +
        sin(radians($${params.length - 2})) * sin(radians(fd.latitude))
      ))
    `;
    conditions.push(`${haversine} <= $${params.length}`);
    selectFields += `, ${haversine} AS distance_km`;
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Run lean count and data query concurrently
  const countPromise = db.query(
    `SELECT COUNT(*) FROM food_donations fd
     LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
     ${whereClause}`,
    params
  );

  // Paginated results
  const dataParams = [...params];
  dataParams.push(limit);
  const limitPlaceholder = `$${dataParams.length}`;
  dataParams.push(offset);
  const offsetPlaceholder = `$${dataParams.length}`;

  const orderBy = lat && lng ? 'ORDER BY distance_km ASC' : 'ORDER BY fd.created_at DESC';

  const dataPromise = db.query(
    `SELECT ${selectFields} ${fromClause} ${whereClause} ${orderBy} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    dataParams
  );

  const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);
  const total = parseInt(countResult.rows[0]?.count || 0, 10);
  const rows = dataResult.rows;

  // Redact sensitive contact info for unauthenticated visitors
  if (!user) {
    rows.forEach((r) => {
      r.provider_phone = null;
      r.provider_email = null;
      r.ngo_phone = null;
      r.ngo_email = null;
    });
  }

  return {
    donations: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

/**
 * Get a single donation by ID with comprehensive Provider, Volunteer, Delivery and Review details.
 * Strictly verifies ownership so providers only view their own listings, NGOs only view available or claimed listings.
 */
const getDonationById = async (donationId, user = null) => {
  const { rows } = await db.query(
    `SELECT
      fd.*,
      fp.business_name AS provider_name,
      fp.business_type AS provider_business_type,
      fp.address AS provider_address,
      fp.is_verified AS provider_is_verified,
      fp.total_donations AS provider_total_donations,
      fp.operating_hours AS provider_operating_hours,
      u.id AS provider_user_id,
      u.full_name AS provider_contact,
      u.phone AS provider_phone,
      u.email AS provider_email,
      u.avatar_url AS provider_avatar,
      del.id AS delivery_id,
      del.status AS delivery_status,
      del.pickup_type AS pickup_type,
      del.pickup_time AS delivery_pickup_time,
      del.delivery_time AS delivery_completed_time,
      del.notes AS delivery_notes,
      del.distance_km AS delivery_distance_km,
      v.id AS volunteer_id,
      v_user.id AS volunteer_user_id,
      v_user.full_name AS volunteer_name,
      v_user.phone AS volunteer_phone,
      v_user.email AS volunteer_email,
      v_user.avatar_url AS volunteer_avatar,
      v.vehicle_type AS volunteer_vehicle_type,
      v.rating AS volunteer_rating,
      v.total_deliveries AS volunteer_total_deliveries,
      v.availability AS volunteer_availability,
      c.id AS claim_id,
      c.status AS claim_status,
      c.pickup_type AS claim_pickup_type,
      c.claimed_at AS claim_time,
      ngo.id AS ngo_id,
      ngo_u.id AS ngo_user_id,
      ngo.organization_name AS ngo_name,
      ngo.address AS ngo_address,
      ngo.latitude AS ngo_latitude,
      ngo.longitude AS ngo_longitude,
      ngo.is_verified AS ngo_is_verified,
      ngo_u.full_name AS ngo_contact,
      ngo_u.phone AS ngo_phone,
      ngo_u.email AS ngo_email
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u ON u.id = fp.user_id
     LEFT JOIN deliveries del ON del.donation_id = fd.id
     LEFT JOIN volunteers v ON v.id = del.volunteer_id
     LEFT JOIN users v_user ON v_user.id = v.user_id
     LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
     LEFT JOIN ngos ngo ON ngo.id = c.ngo_id
     LEFT JOIN users ngo_u ON ngo_u.id = ngo.user_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = rows[0];

  // Role-based data ownership verification
  if (user) {
    if (user.role === 'provider') {
      if (donation.provider_user_id !== user.id) {
        const err = new Error('Access denied. You can only view your own donation listings.');
        err.statusCode = 403;
        throw err;
      }
    } else if (user.role === 'ngo') {
      const isAvailable = ['posted', 'matched'].includes(donation.status);
      const isClaimedByMe = donation.ngo_user_id === user.id;
      if (!isAvailable && !isClaimedByMe) {
        const err = new Error('Access denied. This donation was claimed by another organization.');
        err.statusCode = 403;
        throw err;
      }
    } else if (user.role === 'volunteer') {
      const isOpenMission = !donation.volunteer_id && ['claimed', 'posted', 'matched'].includes(donation.status);
      const isAssignedToMe = donation.volunteer_user_id === user.id;
      if (!isOpenMission && !isAssignedToMe) {
        const err = new Error('Access denied. This delivery is assigned to another volunteer.');
        err.statusCode = 403;
        throw err;
      }
    }
  } else {
    // Unauthenticated: only public 'posted' donations
    if (donation.status !== 'posted') {
      const err = new Error('Donation not found or not publicly accessible.');
      err.statusCode = 404;
      throw err;
    }
    donation.provider_phone = null;
    donation.provider_email = null;
  }

  // Fetch reviews for this donation
  const { rows: reviews } = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name, u.role AS reviewer_role
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.donation_id = $1
     ORDER BY r.created_at DESC`,
    [donationId]
  );

  donation.reviews = reviews;

  return donation;
};

/**
 * Get all donations claimed by an NGO.
 */
const getMyClaims = async (userId, { page = 1, limit = 50, status } = {}) => {
  return getDonations({
    page,
    limit,
    status,
    myClaimsOnly: true,
    user: { id: userId, role: 'ngo' },
  });
};

/**
 * Delete a donation (only by the provider who created it, while status is 'posted' or 'cancelled').
 */
const deleteDonation = async (donationId, providerId) => {
  const existing = await getDonationById(donationId);

  if (existing.provider_id !== providerId) {
    const err = new Error('You can only delete your own donations.');
    err.statusCode = 403;
    throw err;
  }

  const nonDeletable = ['claimed', 'volunteer_assigned', 'collected', 'delivered', 'completed'];
  if (nonDeletable.includes(existing.status)) {
    const err = new Error(
      `Cannot delete donation with status "${existing.status}". Active claims or deliveries are in progress. Cancel it instead if needed.`
    );
    err.statusCode = 400;
    throw err;
  }

  await db.query('DELETE FROM food_donations WHERE id = $1', [donationId]);
  return { success: true, message: 'Donation deleted successfully.' };
};

/**
 * Update a donation (only by the provider who created it, while status is 'posted').
 */
const updateDonation = async (donationId, providerId, data) => {
  // Check ownership and status
  const existing = await getDonationById(donationId);

  if (existing.provider_id !== providerId) {
    const err = new Error('You can only edit your own donations.');
    err.statusCode = 403;
    throw err;
  }

  if (existing.status !== 'posted') {
    const err = new Error(`Cannot edit a donation with status "${existing.status}".`);
    err.statusCode = 400;
    throw err;
  }

  const fields = [];
  const params = [];

  const allowedFields = [
    'title', 'description', 'category', 'quantity', 'unit', 'weight_kg',
    'image_url', 'pickup_address', 'latitude', 'longitude',
    'pickup_window_start', 'pickup_window_end', 'expiry_time', 'special_instructions',
  ];

  for (const field of allowedFields) {
    if (data[field] !== undefined) {
      params.push(data[field]);
      fields.push(`${field} = $${params.length}`);
    }
  }

  if (fields.length === 0) {
    const err = new Error('No fields to update.');
    err.statusCode = 400;
    throw err;
  }

  params.push(donationId);
  const { rows } = await db.query(
    `UPDATE food_donations SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  return rows[0];
};

/**
 * Transition donation status with validation.
 */
const transitionStatus = async (donationId, newStatus) => {
  const donation = await getDonationById(donationId);

  const allowedTransitions = DONATION_STATUS_TRANSITIONS[donation.status];
  if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
    const err = new Error(
      `Invalid status transition: "${donation.status}" → "${newStatus}". Allowed: [${allowedTransitions?.join(', ')}]`
    );
    err.statusCode = 400;
    throw err;
  }

  const { rows } = await db.query(
    'UPDATE food_donations SET status = $1 WHERE id = $2 RETURNING *',
    [newStatus, donationId]
  );

  return rows[0];
};

/**
 * Claim a donation by an NGO. Supports { pickupType: 'self_pickup' | 'volunteer' }
 */
const claimDonation = async (donationId, ngoId, { pickupType = 'volunteer' } = {}) => {
  const cleanPickupType = (pickupType === 'self_pickup' || pickupType === 'self') ? 'self_pickup' : 'volunteer';
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Lock the donation row
    const donationResult = await client.query(
      'SELECT * FROM food_donations WHERE id = $1 FOR UPDATE',
      [donationId]
    );

    if (donationResult.rows.length === 0) {
      const err = new Error('Donation not found.');
      err.statusCode = 404;
      throw err;
    }

    const donation = donationResult.rows[0];

    if (donation.status !== 'posted' && donation.status !== 'matched') {
      const err = new Error(`Donation cannot be claimed. Current status: "${donation.status}".`);
      err.statusCode = 400;
      throw err;
    }

    // Check if already claimed by this NGO
    const existingClaim = await client.query(
      'SELECT id FROM donation_claims WHERE donation_id = $1 AND ngo_id = $2',
      [donationId, ngoId]
    );

    if (existingClaim.rows.length > 0) {
      const err = new Error('You have already claimed this donation.');
      err.statusCode = 409;
      throw err;
    }

    // Create claim with pickup_type
    const claimResult = await client.query(
      `INSERT INTO donation_claims (donation_id, ngo_id, status, pickup_type, claimed_at)
       VALUES ($1, $2, 'accepted', $3, NOW())
       RETURNING *`,
      [donationId, ngoId, cleanPickupType]
    );

    // Transition donation to claimed
    await client.query(
      'UPDATE food_donations SET status = $1, pickup_type = $2 WHERE id = $3',
      ['claimed', cleanPickupType, donationId]
    );

    // Reject other pending claims
    await client.query(
      `UPDATE donation_claims SET status = 'rejected', responded_at = NOW()
       WHERE donation_id = $1 AND ngo_id != $2 AND status = 'pending'`,
      [donationId, ngoId]
    );

    // Create pending delivery if one does not exist
    const existingDelivery = await client.query(
      'SELECT id FROM deliveries WHERE donation_id = $1',
      [donationId]
    );

    let deliveryId = null;
    if (existingDelivery.rows.length === 0) {
      const delRes = await client.query(
        `INSERT INTO deliveries (donation_id, ngo_id, status, pickup_type)
         VALUES ($1, $2, 'pending', $3)
         RETURNING id`,
        [donationId, ngoId, cleanPickupType]
      );
      deliveryId = delRes.rows[0].id;
    } else {
      deliveryId = existingDelivery.rows[0].id;
      await client.query(
        `UPDATE deliveries SET ngo_id = $1, pickup_type = $2 WHERE id = $3`,
        [ngoId, cleanPickupType, deliveryId]
      );
    }

    await client.query('COMMIT');

    // Generate initial QR codes for pickup & delivery
    try {
      const qrcodeService = require('../qrcodes/qrcode.service');
      await qrcodeService.generateQRCodes(deliveryId);
    } catch (qrErr) {
      console.error('[QR] Failed to pre-generate QR codes on claim:', qrErr.message);
    }

    // If volunteer pickup is requested, broadcast notification to volunteers
    if (cleanPickupType === 'volunteer') {
      try {
        const notifService = require('../notifications/notification.service');
        notifService.notifyVolunteersOfPickupMission(donation, deliveryId).catch(() => {});
      } catch (notifErr) {
        console.error('[NOTIFY] Failed to notify volunteers:', notifErr.message);
      }
    }

    return claimResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Update pickup type for an active claimed donation (e.g. NGO switching between self-pickup and volunteer).
 */
const updatePickupType = async (donationId, ngoId, pickupType) => {
  const cleanPickupType = (pickupType === 'self_pickup' || pickupType === 'self') ? 'self_pickup' : 'volunteer';
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const donationRes = await client.query('SELECT * FROM food_donations WHERE id = $1', [donationId]);
    if (donationRes.rows.length === 0) {
      const err = new Error('Donation not found.');
      err.statusCode = 404;
      throw err;
    }
    const donation = donationRes.rows[0];

    const claimRes = await client.query(
      'SELECT * FROM donation_claims WHERE donation_id = $1 AND ngo_id = $2 AND status = $3',
      [donationId, ngoId, 'accepted']
    );

    if (claimRes.rows.length === 0) {
      const err = new Error('You have not claimed this donation.');
      err.statusCode = 403;
      throw err;
    }

    await client.query('UPDATE food_donations SET pickup_type = $1 WHERE id = $2', [cleanPickupType, donationId]);
    await client.query('UPDATE donation_claims SET pickup_type = $1 WHERE id = $2', [cleanPickupType, claimRes.rows[0].id]);
    const delRes = await client.query(
      'UPDATE deliveries SET pickup_type = $1 WHERE donation_id = $2 RETURNING id',
      [cleanPickupType, donationId]
    );

    await client.query('COMMIT');

    const deliveryId = delRes.rows[0]?.id;

    // If switched to volunteer delivery, broadcast notification to volunteers
    if (cleanPickupType === 'volunteer' && deliveryId) {
      try {
        const notifService = require('../notifications/notification.service');
        notifService.notifyVolunteersOfPickupMission(donation, deliveryId).catch(() => {});
      } catch (notifErr) {
        console.error('[NOTIFY] Failed to notify volunteers on pickup type switch:', notifErr.message);
      }
    }

    return { success: true, pickup_type: cleanPickupType };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Cancel a donation (provider only, pre-collection).
 */
const cancelDonation = async (donationId, providerId) => {
  const donation = await getDonationById(donationId);

  if (donation.provider_id !== providerId) {
    const err = new Error('You can only cancel your own donations.');
    err.statusCode = 403;
    throw err;
  }

  const nonCancellable = ['collected', 'delivered', 'completed', 'expired', 'cancelled'];
  if (nonCancellable.includes(donation.status)) {
    const err = new Error(`Cannot cancel a donation with status "${donation.status}".`);
    err.statusCode = 400;
    throw err;
  }

  return transitionStatus(donationId, 'cancelled');
};

module.exports = {
  createDonation,
  getDonations,
  getDonationById,
  getMyClaims,
  updateDonation,
  deleteDonation,
  transitionStatus,
  claimDonation,
  updatePickupType,
  cancelDonation,
};
