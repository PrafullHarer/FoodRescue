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
 * Get all donations with optional filters.
 */
const getDonations = async ({ page = 1, limit = 20, status, category, providerId, lat, lng, radiusKm }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  let selectFields = 'fd.*, fp.business_name AS provider_name, u.full_name AS provider_contact';
  let fromClause = `
    FROM food_donations fd
    JOIN food_providers fp ON fp.id = fd.provider_id
    JOIN users u ON u.id = fp.user_id
  `;

  if (status) {
    params.push(status);
    conditions.push(`fd.status = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`fd.category = $${params.length}`);
  }

  if (providerId) {
    params.push(providerId);
    conditions.push(`fd.provider_id = $${params.length}`);
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

  // Count
  const countResult = await db.query(
    `SELECT COUNT(*) ${fromClause} ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  // Paginated results
  const dataParams = [...params];
  dataParams.push(limit);
  const limitPlaceholder = `$${dataParams.length}`;
  dataParams.push(offset);
  const offsetPlaceholder = `$${dataParams.length}`;

  const orderBy = lat && lng ? 'ORDER BY distance_km ASC' : 'ORDER BY fd.created_at DESC';

  const { rows } = await db.query(
    `SELECT ${selectFields} ${fromClause} ${whereClause} ${orderBy} LIMIT ${limitPlaceholder} OFFSET ${offsetPlaceholder}`,
    dataParams
  );

  return {
    donations: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

/**
 * Get a single donation by ID.
 */
const getDonationById = async (donationId) => {
  const { rows } = await db.query(
    `SELECT fd.*, fp.business_name AS provider_name, u.full_name AS provider_contact
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u ON u.id = fp.user_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
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
 * Claim a donation by an NGO.
 */
const claimDonation = async (donationId, ngoId) => {
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

    // Create claim
    const claimResult = await client.query(
      `INSERT INTO donation_claims (donation_id, ngo_id, status, claimed_at)
       VALUES ($1, $2, 'accepted', NOW())
       RETURNING *`,
      [donationId, ngoId]
    );

    // Transition donation to claimed
    await client.query(
      'UPDATE food_donations SET status = $1 WHERE id = $2',
      ['claimed', donationId]
    );

    // Reject other pending claims
    await client.query(
      `UPDATE donation_claims SET status = 'rejected', responded_at = NOW()
       WHERE donation_id = $1 AND ngo_id != $2 AND status = 'pending'`,
      [donationId, ngoId]
    );

    await client.query('COMMIT');

    return claimResult.rows[0];
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
  updateDonation,
  transitionStatus,
  claimDonation,
  cancelDonation,
};
