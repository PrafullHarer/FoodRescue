const db = require('../../config/db');

/**
 * Create a delivery record when a volunteer is assigned.
 */
const createDelivery = async (donationId, volunteerId, ngoId) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Create delivery
    const { rows } = await client.query(
      `INSERT INTO deliveries (donation_id, volunteer_id, ngo_id, status)
       VALUES ($1, $2, $3, 'pending')
       RETURNING *`,
      [donationId, volunteerId, ngoId]
    );

    // Update donation status
    await client.query(
      `UPDATE food_donations SET status = 'volunteer_assigned' WHERE id = $1`,
      [donationId]
    );

    // Record timeline event for volunteer assignment
    await client.query(
      `INSERT INTO donation_timeline_events (donation_id, event_type, metadata)
       VALUES ($1, 'VOLUNTEER_ASSIGNED', $2)`,
      [donationId, JSON.stringify({ volunteer_id: volunteerId, delivery_id: rows[0].id })]
    );

    // Set volunteer as busy
    await client.query(
      `UPDATE volunteers SET availability = 'busy' WHERE id = $1`,
      [volunteerId]
    );

    await client.query('COMMIT');

    return rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Volunteer accepts a delivery assignment.
 */
const acceptDelivery = async (deliveryId, userId) => {
  // Get volunteer id from user
  const volResult = await db.query(
    'SELECT id FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (volResult.rows.length === 0) {
    const err = new Error('Volunteer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  const volunteerId = volResult.rows[0].id;

  const { rows } = await db.query(
    `UPDATE deliveries SET status = 'accepted', volunteer_id = $1
     WHERE id = $2 AND (volunteer_id IS NULL OR volunteer_id = $1)
     RETURNING *`,
    [volunteerId, deliveryId]
  );

  if (rows.length === 0) {
    const err = new Error('Delivery not found or already assigned to another volunteer.');
    err.statusCode = 400;
    throw err;
  }

  return rows[0];
};

/**
 * Update delivery status.
 * Strictly verifies that only the assigned volunteer (or admin) can advance delivery status.
 */
const updateDeliveryStatus = async (deliveryId, status, userId, userRole = 'volunteer') => {
  const validTransitions = {
    pending: ['accepted'],
    accepted: ['picked_up', 'failed'],
    picked_up: ['in_transit', 'failed'],
    in_transit: ['delivered', 'failed'],
    delivered: [],
    failed: [],
  };

  const delivery = await getDeliveryById(deliveryId);

  // Ownership verification: Volunteers can only update deliveries assigned to them
  if (userRole === 'volunteer') {
    if (delivery.volunteer_user_id && delivery.volunteer_user_id !== userId) {
      const err = new Error('Access denied. You can only update deliveries assigned to you.');
      err.statusCode = 403;
      throw err;
    }
  }

  const allowed = validTransitions[delivery.status];
  if (!allowed || !allowed.includes(status)) {
    const err = new Error(
      `Invalid transition: "${delivery.status}" → "${status}".`
    );
    err.statusCode = 400;
    throw err;
  }

  const updates = { status };
  if (status === 'picked_up') updates.pickup_time = new Date();
  if (status === 'delivered') updates.delivery_time = new Date();

  const fields = Object.keys(updates)
    .map((key, i) => `${key} = $${i + 1}`)
    .join(', ');
  const values = Object.values(updates);

  values.push(deliveryId);
  const { rows } = await db.query(
    `UPDATE deliveries SET ${fields} WHERE id = $${values.length} RETURNING *`,
    values
  );

  // Sync donation status & timeline events
  const donationEmailService = require('../donations/donation-email.service');
  if (status === 'picked_up') {
    await db.query(
      `UPDATE food_donations SET status = 'collected' WHERE id = $1`,
      [delivery.donation_id]
    );
    await donationEmailService.recordTimelineEvent(
      delivery.donation_id,
      'PICKUP_CONFIRMED',
      userId,
      { delivery_id: deliveryId, status: 'picked_up' }
    );
  } else if (status === 'in_transit') {
    await donationEmailService.recordTimelineEvent(
      delivery.donation_id,
      'DELIVERY_STARTED',
      userId,
      { delivery_id: deliveryId, status: 'in_transit' }
    );
  } else if (status === 'delivered') {
    await db.query(
      `UPDATE food_donations SET status = 'completed' WHERE id = $1`,
      [delivery.donation_id]
    );
    // Set volunteer back to available
    if (delivery.volunteer_id) {
      await db.query(
        `UPDATE volunteers SET availability = 'available', total_deliveries = total_deliveries + 1 WHERE id = $1`,
        [delivery.volunteer_id]
      );
    }
    // Update NGO total_received
    await db.query(
      `UPDATE ngos SET total_received = total_received + 1 WHERE id = $1`,
      [delivery.ngo_id]
    );

    // Record completion timeline events
    await donationEmailService.recordTimelineEvent(
      delivery.donation_id,
      'FOOD_RECEIVED',
      userId,
      { delivery_id: deliveryId, status: 'delivered' }
    );
    await donationEmailService.recordTimelineEvent(
      delivery.donation_id,
      'DONATION_COMPLETED',
      userId,
      { delivery_id: deliveryId, status: 'completed' }
    );

    // Trigger automated completion confirmation emails post-commit
    donationEmailService.triggerDonationCompletionEmails(delivery.donation_id);
  }

  return rows[0];
};

/**
 * Get delivery by ID with strict ownership validation.
 */
const getDeliveryById = async (deliveryId, user = null) => {
  const { rows } = await db.query(
    `SELECT d.*,
            fd.title AS donation_title,
            fd.category AS donation_category,
            fd.quantity AS donation_quantity,
            fd.unit AS donation_unit,
            fd.pickup_address,
            fd.expiry_time,
            fp.id AS provider_id,
            fp.user_id AS provider_user_id,
            fp.business_name AS provider_name,
            fp.is_verified AS provider_verified,
            ng.id AS ngo_id,
            ng.user_id AS ngo_user_id,
            ng.organization_name AS ngo_name,
            ng.is_verified AS ngo_verified,
            ng.address AS ngo_address,
            vo.id AS volunteer_id,
            v_user.id AS volunteer_user_id,
            v_user.full_name AS volunteer_name,
            vo.vehicle_type AS volunteer_vehicle_type,
            vo.rating AS volunteer_rating
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN ngos ng ON ng.id = d.ngo_id
     LEFT JOIN volunteers vo ON vo.id = d.volunteer_id
     LEFT JOIN users v_user ON v_user.id = vo.user_id
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (rows.length === 0) {
    const err = new Error('Delivery not found.');
    err.statusCode = 404;
    throw err;
  }

  const delivery = rows[0];

  // Ownership verification
  if (user) {
    if (user.role === 'volunteer') {
      if (delivery.volunteer_id && delivery.volunteer_user_id !== user.id) {
        const err = new Error('Access denied. You can only view deliveries assigned to you.');
        err.statusCode = 403;
        throw err;
      }
    } else if (user.role === 'ngo') {
      if (delivery.ngo_user_id !== user.id) {
        const err = new Error('Access denied. You can only view deliveries for your organization.');
        err.statusCode = 403;
        throw err;
      }
    } else if (user.role === 'provider') {
      if (delivery.provider_user_id !== user.id) {
        const err = new Error('Access denied. You can only view deliveries for your own donations.');
        err.statusCode = 403;
        throw err;
      }
    }
  }

  return delivery;
};

/**
 * Get all deliveries with role-based isolation.
 */
const getDeliveries = async ({ page = 1, limit = 20, status, volunteerId, user = null }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  // Role-based scoping
  if (user?.role === 'volunteer') {
    params.push(user.id);
    conditions.push(`v_user.id = $${params.length}`);
  } else if (user?.role === 'ngo') {
    params.push(user.id);
    conditions.push(`ng.user_id = $${params.length}`);
  } else if (user?.role === 'provider') {
    params.push(user.id);
    conditions.push(`fp.user_id = $${params.length}`);
  } else if (user?.role === 'admin') {
    if (volunteerId) {
      params.push(volunteerId);
      conditions.push(`d.volunteer_id = $${params.length}`);
    }
  }

  if (status) {
    params.push(status);
    conditions.push(`d.status = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN ngos ng ON ng.id = d.ngo_id
     LEFT JOIN volunteers vo ON vo.id = d.volunteer_id
     LEFT JOIN users v_user ON v_user.id = vo.user_id
     ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0]?.count || 0, 10);

  const dataParams = [...params];
  dataParams.push(limit);
  dataParams.push(offset);

  const { rows } = await db.query(
    `SELECT d.*,
            fd.title AS donation_title,
            fd.category AS donation_category,
            fd.quantity AS donation_quantity,
            fd.unit AS donation_unit,
            fd.pickup_address,
            fd.expiry_time,
            fp.id AS provider_id,
            fp.user_id AS provider_user_id,
            fp.business_name AS provider_name,
            fp.is_verified AS provider_verified,
            ng.id AS ngo_id,
            ng.user_id AS ngo_user_id,
            ng.organization_name AS ngo_name,
            ng.is_verified AS ngo_verified,
            ng.address AS ngo_address,
            vo.id AS volunteer_id,
            v_user.id AS volunteer_user_id,
            v_user.full_name AS volunteer_name,
            vo.vehicle_type AS volunteer_vehicle_type,
            vo.rating AS volunteer_rating
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN ngos ng ON ng.id = d.ngo_id
     LEFT JOIN volunteers vo ON vo.id = d.volunteer_id
     LEFT JOIN users v_user ON v_user.id = vo.user_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    deliveries: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) || 1 },
  };
};

module.exports = {
  createDelivery,
  acceptDelivery,
  updateDeliveryStatus,
  getDeliveryById,
  getDeliveries,
};
