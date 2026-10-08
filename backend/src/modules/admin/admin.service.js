const db = require('../../config/db');

/**
 * Verify a provider or NGO.
 */
const verifyEntity = async (type, entityId, adminUserId) => {
  const table = type === 'provider' ? 'food_providers' : 'ngos';

  const { rows } = await db.query(
    `UPDATE ${table} SET is_verified = TRUE WHERE id = $1 RETURNING *`,
    [entityId]
  );

  if (rows.length === 0) {
    const err = new Error(`${type} not found.`);
    err.statusCode = 404;
    throw err;
  }

  // Also activate the user
  await db.query(
    `UPDATE users SET status = 'active' WHERE id = $1`,
    [rows[0].user_id]
  );

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, $2, $3, $4, $5)`,
    [adminUserId, `${type}.verify`, type, entityId, JSON.stringify({ is_verified: true })]
  );

  return rows[0];
};

/**
 * Get pending verifications.
 */
const getPendingVerifications = async () => {
  const providers = await db.query(
    `SELECT fp.*, u.full_name, u.email, u.phone, 'provider' AS type
     FROM food_providers fp
     JOIN users u ON u.id = fp.user_id
     WHERE fp.is_verified = FALSE`
  );

  const ngos = await db.query(
    `SELECT n.*, u.full_name, u.email, u.phone, 'ngo' AS type
     FROM ngos n
     JOIN users u ON u.id = n.user_id
     WHERE n.is_verified = FALSE`
  );

  return {
    providers: providers.rows,
    ngos: ngos.rows,
    total: providers.rows.length + ngos.rows.length,
  };
};

/**
 * Get all complaints with filtering.
 */
const getComplaints = async ({ page = 1, limit = 20, status }) => {
  const offset = (page - 1) * limit;
  const params = [];
  let whereClause = '';

  if (status) {
    params.push(status);
    whereClause = `WHERE c.status = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM complaints c ${whereClause}`,
    params
  );

  const dataParams = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT c.*, u.full_name AS reporter_name, u.email AS reporter_email,
            ru.full_name AS reported_user_name
     FROM complaints c
     JOIN users u ON u.id = c.reporter_id
     LEFT JOIN users ru ON ru.id = c.reported_user_id
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    complaints: rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0].count, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

/**
 * Resolve a complaint.
 */
const resolveComplaint = async (complaintId, resolution_notes, adminUserId) => {
  const { rows } = await db.query(
    `UPDATE complaints
     SET status = 'resolved', resolution_notes = $1, resolved_by = $2, resolved_at = NOW()
     WHERE id = $3 RETURNING *`,
    [resolution_notes, adminUserId, complaintId]
  );

  if (rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'complaint.resolve', 'complaint', $2, $3)`,
    [adminUserId, complaintId, JSON.stringify({ status: 'resolved', resolution_notes })]
  );

  return rows[0];
};

/**
 * Get audit logs.
 */
const getAuditLogs = async ({ page = 1, limit = 50, actorId, action, entityType }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (actorId) {
    params.push(actorId);
    conditions.push(`al.actor_id = $${params.length}`);
  }

  if (action) {
    params.push(action);
    conditions.push(`al.action = $${params.length}`);
  }

  if (entityType) {
    params.push(entityType);
    conditions.push(`al.entity_type = $${params.length}`);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM audit_logs al ${whereClause}`,
    params
  );

  const dataParams = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT al.*, u.full_name AS actor_name
     FROM audit_logs al
     LEFT JOIN users u ON u.id = al.actor_id
     ${whereClause}
     ORDER BY al.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  return {
    logs: rows,
    pagination: {
      page, limit,
      total: parseInt(countResult.rows[0].count, 10),
      totalPages: Math.ceil(parseInt(countResult.rows[0].count, 10) / limit),
    },
  };
};

module.exports = {
  verifyEntity,
  getPendingVerifications,
  getComplaints,
  resolveComplaint,
  getAuditLogs,
};
