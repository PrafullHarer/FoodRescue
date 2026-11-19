const db = require('../../config/db');
const { DONATION_STATUS_TRANSITIONS } = require('../../config/constants');

/**
 * Generate a unique human-friendly donation code (e.g. DON-849201).
 */
const generateDonationCode = async (client = db) => {
  let uniqueCode = '';
  let attempts = 0;
  while (!uniqueCode && attempts < 100) {
    attempts++;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    const candidate = `DON-${randomNum}`;
    const check = await client.query('SELECT id FROM food_donations WHERE donation_code = $1', [candidate]);
    if (check.rows.length === 0) {
      uniqueCode = candidate;
    }
  }
  if (!uniqueCode) {
    uniqueCode = `DON-${Date.now().toString().slice(-6)}`;
  }
  return uniqueCode;
};

/**
 * Create a new food donation.
 */
const createDonation = async (providerId, data) => {
  const donationCode = await generateDonationCode();
  const { rows } = await db.query(
    `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg,
        image_url, pickup_address, latitude, longitude,
        pickup_window_start, pickup_window_end, expiry_time, special_instructions, donation_code)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
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
      donationCode,
    ]
  );

  // Increment provider's total_donations counter
  await db.query(
    'UPDATE food_providers SET total_donations = total_donations + 1 WHERE id = $1',
    [providerId]
  );

  // Record initial DONATION_CREATED timeline event
  const donationEmailService = require('./donation-email.service');
  await donationEmailService.recordTimelineEvent(
    rows[0].id,
    'DONATION_CREATED',
    null,
    { title: rows[0].title, quantity: rows[0].quantity, category: rows[0].category }
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
  search,
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
      // NGO viewing only their claimed donations (pending, accepted, delivered, etc.)
      const ngoRes = await db.query(
        'SELECT id FROM ngos WHERE user_id = $1',
        [user.id]
      );
      const myNgoId = ngoRes.rows[0]?.id || '00000000-0000-0000-0000-000000000000';
      params.push(myNgoId);
      conditions.push(`c.ngo_id = $${params.length} AND c.claimed_at IS NOT NULL`);
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

  if (user?.role === 'ngo') {
    selectFields += `,
      (SELECT c2.status FROM donation_claims c2 JOIN ngos n2 ON n2.id = c2.ngo_id WHERE c2.donation_id = fd.id AND n2.user_id = '${user.id}' AND (c2.claimed_at IS NOT NULL OR c2.status = 'rejected') LIMIT 1) AS my_claim_status,
      (SELECT c2.id FROM donation_claims c2 JOIN ngos n2 ON n2.id = c2.ngo_id WHERE c2.donation_id = fd.id AND n2.user_id = '${user.id}' AND (c2.claimed_at IS NOT NULL OR c2.status = 'rejected') LIMIT 1) AS my_claim_id
    `;
  } else if (user?.role === 'provider') {
    selectFields += `,
      COALESCE((SELECT COUNT(*) FROM donation_claims c2 WHERE c2.donation_id = fd.id AND c2.status = 'pending' AND c2.claimed_at IS NOT NULL), 0) AS pending_claims_count,
      COALESCE((SELECT COUNT(*) FROM donation_claims c2 WHERE c2.donation_id = fd.id AND c2.claimed_at IS NOT NULL), 0) AS total_claims_count
    `;
  }

  const claimJoinCondition = (user?.role === 'ngo' && myClaimsOnly)
    ? `c.donation_id = fd.id AND c.ngo_id = (SELECT id FROM ngos WHERE user_id = '${user.id}') AND c.claimed_at IS NOT NULL`
    : `c.donation_id = fd.id AND c.status = 'accepted'`;

  let fromClause = `
    FROM food_donations fd
    JOIN food_providers fp ON fp.id = fd.provider_id
    JOIN users u ON u.id = fp.user_id
    LEFT JOIN deliveries del ON del.donation_id = fd.id
    LEFT JOIN volunteers v ON v.id = del.volunteer_id
    LEFT JOIN users v_user ON v_user.id = v.user_id
    LEFT JOIN donation_claims c ON ${claimJoinCondition}
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

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    conditions.push(`(fd.title ILIKE $${params.length} OR fd.donation_code ILIKE $${params.length} OR fd.pickup_address ILIKE $${params.length})`);
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
     LEFT JOIN donation_claims c ON ${claimJoinCondition}
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
  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(donationId);
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
      ngo.capacity AS ngo_capacity,
      ngo.total_received AS ngo_total_received,
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
     WHERE ${isUuid ? 'fd.id = $1' : 'fd.donation_code = $1'}`,
    [donationId]
  );

  if (rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = rows[0];
  const actualDonationId = donation.id;

  // Role-based data ownership verification
  if (user) {
    if (user.role === 'provider') {
      if (donation.provider_user_id !== user.id) {
        const err = new Error('Access denied. You can only view your own donation listings.');
        err.statusCode = 403;
        throw err;
      }
      donation.claims = await getDonationClaims(actualDonationId, user);
    } else if (user.role === 'ngo') {
      // Check if this NGO has submitted a claim for this donation
      const ngoClaimRes = await db.query(
        `SELECT c.id, c.status, c.pickup_type, c.claimed_at, c.responded_at
         FROM donation_claims c
         JOIN ngos ngo ON ngo.id = c.ngo_id
         WHERE c.donation_id = $1 AND ngo.user_id = $2 AND (c.claimed_at IS NOT NULL OR c.status = 'rejected')
         LIMIT 1`,
        [actualDonationId, user.id]
      );
      donation.my_claim = ngoClaimRes.rows[0] || null;

      const isAvailable = ['posted', 'matched'].includes(donation.status);
      const isClaimedByMe = donation.ngo_user_id === user.id || !!donation.my_claim;
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
    [actualDonationId]
  );

  donation.reviews = reviews;

  // Attach complete donation lifecycle timeline and completion email delivery status
  const donationEmailService = require('./donation-email.service');
  donation.timeline = await donationEmailService.buildDonationTimeline(actualDonationId);
  donation.completion_emails = await donationEmailService.getDonationEmailStatus(actualDonationId);

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

  // If donation reached terminal completion, record event & trigger emails
  if (newStatus === 'completed' || newStatus === 'delivered') {
    const donationEmailService = require('./donation-email.service');
    await donationEmailService.recordTimelineEvent(donationId, 'DONATION_COMPLETED');
    donationEmailService.triggerDonationCompletionEmails(donationId);
  }

  return rows[0];
};

/**
 * Retrieve all shelter claim requests for a donation with rich verification, capacity,
 * past days donation history, and reviews. Accessible by the food provider who posted it or an admin.
 */
const getDonationClaims = async (donationId, user = null) => {
  const donationRes = await db.query(
    `SELECT fd.*, fp.user_id AS provider_user_id
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (donationRes.rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = donationRes.rows[0];

  if (user && user.role !== 'admin' && donation.provider_user_id !== user.id) {
    const err = new Error('Access denied. Only the food provider can review shelter claim requests for this donation.');
    err.statusCode = 403;
    throw err;
  }

  // Fetch all active NGO claims (where claimed_at is not null)
  const { rows: claims } = await db.query(
    `SELECT
       c.id AS claim_id,
       c.status AS claim_status,
       c.pickup_type AS claim_pickup_type,
       c.claimed_at,
       c.responded_at,
       c.match_score,
       ngo.id AS ngo_id,
       ngo.user_id AS ngo_user_id,
       ngo.organization_name AS ngo_name,
       ngo.registration_no AS ngo_registration_no,
       ngo.address AS ngo_address,
       ngo.latitude AS ngo_latitude,
       ngo.longitude AS ngo_longitude,
       ngo.capacity AS ngo_capacity,
       ngo.total_received AS ngo_total_received,
       ngo.is_verified AS ngo_is_verified,
       ngo_u.full_name AS ngo_contact_name,
       ngo_u.phone AS ngo_phone,
       ngo_u.email AS ngo_email,
       ngo_u.avatar_url AS ngo_avatar
     FROM donation_claims c
     JOIN ngos ngo ON ngo.id = c.ngo_id
     JOIN users ngo_u ON ngo_u.id = ngo.user_id
     WHERE c.donation_id = $1 AND c.claimed_at IS NOT NULL
     ORDER BY
       CASE WHEN c.status = 'pending' THEN 1 WHEN c.status = 'accepted' THEN 2 ELSE 3 END,
       c.claimed_at ASC`,
    [donationId]
  );

  const { haversineDistance } = require('../matching/matching.service');
  const { rankDonationClaims, persistClaimMatchScores } = require('../matching/claim-ranking.service');

  const decoratedClaims = await Promise.all(
    claims.map(async (claim) => {
      // 1. Distance in KM from pickup location
      let distance_km = null;
      if (donation.latitude && donation.longitude && claim.ngo_latitude && claim.ngo_longitude) {
        distance_km = Math.round(
          haversineDistance(
            donation.latitude,
            donation.longitude,
            claim.ngo_latitude,
            claim.ngo_longitude
          ) * 10
        ) / 10;
      }

      // 2. Amount of donations received in the past days (past 7 days, past 30 days, total)
      const pastDaysRes = await db.query(
        `SELECT
           COUNT(*) FILTER (
             WHERE fd.status IN ('delivered', 'completed', 'claimed', 'volunteer_assigned', 'collected')
               AND COALESCE(del.delivery_time, c2.claimed_at, c2.created_at) >= NOW() - INTERVAL '7 days'
           ) AS past_7_days_count,
           COALESCE(SUM(fd.quantity) FILTER (
             WHERE fd.status IN ('delivered', 'completed', 'claimed', 'volunteer_assigned', 'collected')
               AND COALESCE(del.delivery_time, c2.claimed_at, c2.created_at) >= NOW() - INTERVAL '7 days'
           ), 0) AS past_7_days_quantity,
           COUNT(*) FILTER (
             WHERE fd.status IN ('delivered', 'completed', 'claimed', 'volunteer_assigned', 'collected')
               AND COALESCE(del.delivery_time, c2.claimed_at, c2.created_at) >= NOW() - INTERVAL '30 days'
           ) AS past_30_days_count,
           COALESCE(SUM(fd.quantity) FILTER (
             WHERE fd.status IN ('delivered', 'completed', 'claimed', 'volunteer_assigned', 'collected')
               AND COALESCE(del.delivery_time, c2.claimed_at, c2.created_at) >= NOW() - INTERVAL '30 days'
           ), 0) AS past_30_days_quantity,
           COUNT(*) FILTER (
             WHERE fd.status IN ('delivered', 'completed')
           ) AS total_completed_count,
           COALESCE(SUM(fd.quantity) FILTER (
             WHERE fd.status IN ('delivered', 'completed')
           ), 0) AS total_completed_quantity
         FROM donation_claims c2
         JOIN food_donations fd ON fd.id = c2.donation_id
         LEFT JOIN deliveries del ON del.donation_id = fd.id
         WHERE c2.ngo_id = $1 AND c2.status = 'accepted'`,
        [claim.ngo_id]
      );
      const pastStats = pastDaysRes.rows[0] || {};

      // 3. Reviews & Ratings
      const revSummaryRes = await db.query(
        `SELECT
           COUNT(*) AS total_reviews,
           COALESCE(AVG(rating), 0) AS average_rating
         FROM reviews
         WHERE reviewee_id = $1 AND moderation_status = 'approved'`,
        [claim.ngo_user_id]
      );
      const revSummary = revSummaryRes.rows[0] || {};
      const totalReviews = parseInt(revSummary.total_reviews || 0, 10);
      const averageRating = totalReviews > 0 ? parseFloat(parseFloat(revSummary.average_rating).toFixed(1)) : 0;

      // Recent 5 verified reviews
      const recentReviewsRes = await db.query(
        `SELECT
           r.id,
           r.rating,
           r.comment,
           r.tags,
           r.created_at,
           u.full_name AS reviewer_name,
           u.avatar_url AS reviewer_avatar,
           fp.business_name AS reviewer_business_name
         FROM reviews r
         JOIN users u ON u.id = r.reviewer_id
         LEFT JOIN food_providers fp ON fp.user_id = u.id
         WHERE r.reviewee_id = $1 AND r.moderation_status = 'approved'
         ORDER BY r.created_at DESC
         LIMIT 5`,
        [claim.ngo_user_id]
      );

      return {
        ...claim,
        distance_km,
        past_7_days_count: parseInt(pastStats.past_7_days_count || 0, 10),
        past_7_days_quantity: parseInt(pastStats.past_7_days_quantity || 0, 10),
        past_30_days_count: parseInt(pastStats.past_30_days_count || 0, 10),
        past_30_days_quantity: parseInt(pastStats.past_30_days_quantity || 0, 10),
        total_completed_count: parseInt(pastStats.total_completed_count || 0, 10),
        total_completed_quantity: parseInt(pastStats.total_completed_quantity || 0, 10),
        average_rating: averageRating,
        total_reviews: totalReviews,
        recent_reviews: recentReviewsRes.rows,
      };
    })
  );

  // Rank applicant NGOs using the multi-factor Priority & Need algorithm
  const rankedClaims = rankDonationClaims(decoratedClaims, donation);

  // Asynchronously synchronize computed match_score in donation_claims table
  persistClaimMatchScores(rankedClaims).catch((err) => {
    console.warn('Failed to persist claim match scores:', err.message);
  });

  return rankedClaims;
};

/**
 * Claim a donation by an NGO.
 * Allows all verified NGOs to submit a claim request with their preferred pickup type ('self_pickup' | 'volunteer').
 * The donation remains in 'posted' or 'matched' status so the food provider can review all applicant NGOs.
 */
const claimDonation = async (donationId, ngoId, { pickupType = 'volunteer' } = {}) => {
  const cleanPickupType = (pickupType === 'self_pickup' || pickupType === 'self') ? 'self_pickup' : 'volunteer';
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Lock the donation row
    const donationResult = await client.query(
      'SELECT fd.*, fp.user_id AS provider_user_id FROM food_donations fd JOIN food_providers fp ON fp.id = fd.provider_id WHERE fd.id = $1 FOR UPDATE OF fd',
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

    // Check if this NGO has already claimed
    const existingClaim = await client.query(
      'SELECT id, status, claimed_at FROM donation_claims WHERE donation_id = $1 AND ngo_id = $2',
      [donationId, ngoId]
    );

    let claimResult;
    if (existingClaim.rows.length > 0) {
      const ec = existingClaim.rows[0];
      if (ec.status === 'rejected') {
        const err = new Error('Your claim request for this donation was declined by the food provider. You cannot claim this donation again.');
        err.statusCode = 403;
        throw err;
      }
      if (ec.status === 'accepted') {
        const err = new Error('You have already claimed and been awarded this donation.');
        err.statusCode = 409;
        throw err;
      }
      // If already pending or pre-matched, update preference and set claimed_at
      claimResult = await client.query(
        `UPDATE donation_claims
         SET status = 'pending', pickup_type = $1, claimed_at = NOW(), updated_at = NOW()
         WHERE id = $2
         RETURNING *`,
        [cleanPickupType, ec.id]
      );
    } else {
      claimResult = await client.query(
        `INSERT INTO donation_claims (donation_id, ngo_id, status, pickup_type, claimed_at)
         VALUES ($1, $2, 'pending', $3, NOW())
         RETURNING *`,
        [donationId, ngoId, cleanPickupType]
      );
    }

    // Record timeline event for shelter claim request
    await client.query(
      `INSERT INTO donation_timeline_events (donation_id, event_type, metadata)
       VALUES ($1, 'CLAIM_REQUEST_SUBMITTED', $2)`,
      [donationId, JSON.stringify({ ngo_id: ngoId, pickup_type: cleanPickupType })]
    );

    // Fetch NGO name for notification
    const ngoRes = await client.query('SELECT organization_name FROM ngos WHERE id = $1', [ngoId]);
    const ngoName = ngoRes.rows[0]?.organization_name || 'A community shelter';

    await client.query('COMMIT');

    // Notify provider of new claim request
    if (donation.provider_user_id) {
      const notifService = require('../notifications/notification.service');
      notifService.createNotification({
        userId: donation.provider_user_id,
        title: 'New Shelter Claim Request 🍽️',
        body: `${ngoName} has requested to claim "${donation.title}". Review their capacity, reviews, and past donation history to select the recipient.`,
        type: 'in_app',
        data: { donation_id: donationId, ngo_id: ngoId, type: 'claim_requested' },
      }).catch(err => console.error('[NOTIFY] Failed to notify provider:', err.message));
    }

    return {
      claim: claimResult.rows[0],
      message: 'Claim request submitted! The food provider will review all shelter requests and choose the recipient based on capacity, reviews, and past donation history.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Food Provider selects and awards a donation to one of the claiming NGOs.
 */
const selectClaim = async (donationId, claimId, providerUserId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Lock donation and verify ownership
    const donationRes = await client.query(
      `SELECT fd.*, fp.user_id AS provider_user_id, fp.business_name AS provider_name
       FROM food_donations fd
       JOIN food_providers fp ON fp.id = fd.provider_id
       WHERE fd.id = $1
       FOR UPDATE OF fd`,
      [donationId]
    );

    if (donationRes.rows.length === 0) {
      const err = new Error('Donation not found.');
      err.statusCode = 404;
      throw err;
    }

    const donation = donationRes.rows[0];

    if (donation.provider_user_id !== providerUserId) {
      const err = new Error('Access denied. You can only choose recipients for your own donations.');
      err.statusCode = 403;
      throw err;
    }

    if (donation.status !== 'posted' && donation.status !== 'matched') {
      const err = new Error(`Donation cannot be awarded. Current status: "${donation.status}".`);
      err.statusCode = 400;
      throw err;
    }

    // 2. Lock chosen claim
    const claimRes = await client.query(
      `SELECT c.*, ngo.organization_name, ngo.user_id AS ngo_user_id
       FROM donation_claims c
       JOIN ngos ngo ON ngo.id = c.ngo_id
       WHERE c.id = $1 AND c.donation_id = $2
       FOR UPDATE OF c`,
      [claimId, donationId]
    );

    if (claimRes.rows.length === 0) {
      const err = new Error('Claim request not found for this donation.');
      err.statusCode = 404;
      throw err;
    }

    const chosenClaim = claimRes.rows[0];

    if (chosenClaim.status !== 'pending') {
      const err = new Error(`This claim request is already "${chosenClaim.status}".`);
      err.statusCode = 400;
      throw err;
    }

    const cleanPickupType = (chosenClaim.pickup_type === 'self_pickup' || chosenClaim.pickup_type === 'self')
      ? 'self_pickup'
      : 'volunteer';

    // 3. Mark chosen claim accepted
    await client.query(
      `UPDATE donation_claims
       SET status = 'accepted', responded_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [claimId]
    );

    // 4. Reject other pending claims for this donation
    const rejectedClaimsRes = await client.query(
      `UPDATE donation_claims
       SET status = 'rejected', responded_at = NOW(), updated_at = NOW()
       WHERE donation_id = $1 AND id != $2 AND status = 'pending'
       RETURNING ngo_id`,
      [donationId, claimId]
    );

    // 5. Transition donation status to 'claimed'
    await client.query(
      `UPDATE food_donations
       SET status = 'claimed', pickup_type = $1, updated_at = NOW()
       WHERE id = $2`,
      [cleanPickupType, donationId]
    );

    // 6. Create or update delivery record
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
        [donationId, chosenClaim.ngo_id, cleanPickupType]
      );
      deliveryId = delRes.rows[0].id;
    } else {
      deliveryId = existingDelivery.rows[0].id;
      await client.query(
        `UPDATE deliveries SET ngo_id = $1, pickup_type = $2, status = 'pending' WHERE id = $3`,
        [chosenClaim.ngo_id, cleanPickupType, deliveryId]
      );
    }

    // 7. Record timeline event
    await client.query(
      `INSERT INTO donation_timeline_events (donation_id, event_type, metadata)
       VALUES ($1, 'DONATION_CLAIMED', $2)`,
      [
        donationId,
        JSON.stringify({
          claim_id: claimId,
          ngo_id: chosenClaim.ngo_id,
          ngo_name: chosenClaim.organization_name,
          pickup_type: cleanPickupType,
          awarded_by_provider: true,
        }),
      ]
    );

    await client.query('COMMIT');

    // 8. Generate QR codes for pickup & delivery
    try {
      const qrcodeService = require('../qrcodes/qrcode.service');
      await qrcodeService.generateQRCodes(deliveryId);
    } catch (qrErr) {
      console.error('[QR] Failed to generate QR codes on claim acceptance:', qrErr.message);
    }

    // 9. Send Notifications
    const notifService = require('../notifications/notification.service');

    // Notify chosen NGO
    notifService.createNotification({
      userId: chosenClaim.ngo_user_id,
      title: 'Claim Request Accepted! 🎉',
      body: `Congratulations! ${donation.provider_name || 'The Food Provider'} selected your shelter for donation "${donation.title}". Please prepare for ${cleanPickupType === 'self_pickup' ? 'self-pickup' : 'volunteer delivery'}.`,
      type: 'in_app',
      data: { donation_id: donationId, claim_id: claimId, type: 'claim_accepted' },
    }).catch(err => console.error('[NOTIFY] Failed to notify chosen NGO:', err.message));

    // Notify rejected NGOs
    if (rejectedClaimsRes.rows.length > 0) {
      const rejectedNgoIds = rejectedClaimsRes.rows.map(r => r.ngo_id);
      db.query(
        `SELECT user_id FROM ngos WHERE id = ANY($1)`,
        [rejectedNgoIds]
      ).then(usersRes => {
        usersRes.rows.forEach(u => {
          notifService.createNotification({
            userId: u.user_id,
            type: 'in_app',
            title: 'Donation Awarded to Another Shelter',
            body: `The food provider has selected another shelter for donation "${donation.title}". Thank you for your willingness to rescue surplus food!`,
            data: { donation_id: donationId, type: 'claim_rejected' },
          }).catch(() => {});
        });
      }).catch(err => console.error('[NOTIFY] Failed to notify rejected NGOs:', err.message));
    }

    // If volunteer pickup, notify volunteers
    if (cleanPickupType === 'volunteer') {
      notifService.notifyVolunteersOfPickupMission(donation, deliveryId).catch(err =>
        console.error('[NOTIFY] Volunteer broadcast failed:', err.message)
      );
    }

    // Auto-mark notifications
    notifService.markDonationNotificationsReadOnClaim(donationId).catch(() => {});

    return {
      success: true,
      message: `Donation successfully awarded to ${chosenClaim.organization_name}!`,
      delivery_id: deliveryId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Food Provider declines a single NGO claim request without accepting another yet.
 */
const rejectClaim = async (donationId, claimId, providerUserId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    const donationRes = await client.query(
      `SELECT fd.*, fp.user_id AS provider_user_id, fp.business_name AS provider_name
       FROM food_donations fd
       JOIN food_providers fp ON fp.id = fd.provider_id
       WHERE fd.id = $1`,
      [donationId]
    );

    if (donationRes.rows.length === 0) {
      const err = new Error('Donation not found.');
      err.statusCode = 404;
      throw err;
    }

    const donation = donationRes.rows[0];

    if (donation.provider_user_id !== providerUserId) {
      const err = new Error('Access denied. You can only manage claims for your own donations.');
      err.statusCode = 403;
      throw err;
    }

    const claimRes = await client.query(
      `SELECT c.*, ngo.organization_name, ngo.user_id AS ngo_user_id
       FROM donation_claims c
       JOIN ngos ngo ON ngo.id = c.ngo_id
       WHERE c.id = $1 AND c.donation_id = $2
       FOR UPDATE OF c`,
      [claimId, donationId]
    );

    if (claimRes.rows.length === 0) {
      const err = new Error('Claim request not found.');
      err.statusCode = 404;
      throw err;
    }

    const claim = claimRes.rows[0];

    if (claim.status !== 'pending') {
      const err = new Error(`Claim is already "${claim.status}".`);
      err.statusCode = 400;
      throw err;
    }

    await client.query(
      `UPDATE donation_claims
       SET status = 'rejected', responded_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [claimId]
    );

    // Record timeline event for declined claim
    await client.query(
      `INSERT INTO donation_timeline_events (donation_id, event_type, metadata)
       VALUES ($1, 'CLAIM_REQUEST_DECLINED', $2)`,
      [donationId, JSON.stringify({ claim_id: claimId, ngo_id: claim.ngo_id, ngo_name: claim.organization_name })]
    );

    await client.query('COMMIT');

    const notifService = require('../notifications/notification.service');
    notifService.createNotification({
      userId: claim.ngo_user_id,
      type: 'in_app',
      title: 'Claim Request Declined',
      body: `Your claim request for donation "${donation.title}" was declined by ${donation.provider_name || 'the donor'}.`,
      data: { donation_id: donationId, type: 'claim_rejected' },
    }).catch(err => console.error('[NOTIFY] Failed to notify declined NGO:', err.message));

    return {
      success: true,
      message: `Claim request from ${claim.organization_name} has been declined.`,
    };
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
  getDonationClaims,
  selectClaim,
  rejectClaim,
  updateDonation,
  deleteDonation,
  transitionStatus,
  claimDonation,
  updatePickupType,
  cancelDonation,
};
