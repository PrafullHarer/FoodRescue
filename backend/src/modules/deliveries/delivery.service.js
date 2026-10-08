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
 */
const updateDeliveryStatus = async (deliveryId, status, userId) => {
  const validTransitions = {
    pending: ['accepted'],
    accepted: ['picked_up', 'failed'],
    picked_up: ['in_transit', 'failed'],
    in_transit: ['delivered', 'failed'],
    delivered: [],
    failed: [],
  };

  const delivery = await getDeliveryById(deliveryId);

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

  // Sync donation status
  if (status === 'picked_up') {
    await db.query(
      `UPDATE food_donations SET status = 'collected' WHERE id = $1`,
      [delivery.donation_id]
    );
  } else if (status === 'delivered') {
    await db.query(
      `UPDATE food_donations SET status = 'delivered' WHERE id = $1`,
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
  }

  return rows[0];
};

/**
 * Get delivery by ID.
 */
const getDeliveryById = async (deliveryId) => {
  const { rows } = await db.query(
    `SELECT d.*, fd.title AS donation_title, fd.pickup_address
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     WHERE d.id = $1`,
    [deliveryId]
  );

  if (rows.length === 0) {
    const err = new Error('Delivery not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

/**
 * Get all deliveries (with filters).
 */
const getDeliveries = async ({ page = 1, limit = 20, status, volunteerId }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`d.status = $${params.length}`);
  }

  if (volunteerId) {
    params.push(volunteerId);
    conditions.push(`d.volunteer_id = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM deliveries d ${whereClause}`,
    params
  );
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params];
  dataParams.push(limit);
  dataParams.push(offset);

  const { rows } = await db.query(
    `SELECT d.*, fd.title AS donation_title
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     ${whereClause}
     ORDER BY d.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    deliveries: rows,
    pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
  };
};

module.exports = {
  createDelivery,
  acceptDelivery,
  updateDeliveryStatus,
  getDeliveryById,
  getDeliveries,
};
