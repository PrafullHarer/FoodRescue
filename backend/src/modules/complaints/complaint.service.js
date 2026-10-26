const db = require('../../config/db');
const notificationService = require('../notifications/notification.service');

/**
 * Create a new complaint.
 */
const createComplaint = async ({ userId, subject, category, description, donationId }) => {
  const { rows } = await db.query(
    `INSERT INTO complaints (reporter_id, subject, category, description, donation_id)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, subject, category || null, description, donationId || null]
  );

  const complaint = rows[0];

  // Notify all admin users about the new complaint
  try {
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );
    const { rows: reporter } = await db.query(
      `SELECT full_name, role FROM users WHERE id = $1`,
      [userId]
    );
    const reporterName = reporter[0]?.full_name || 'A user';
    const reporterRole = reporter[0]?.role || 'user';

    for (const admin of admins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: '⚠️ New Complaint Submitted',
        body: `${reporterName} (${reporterRole}) submitted: "${subject}"`,
        type: 'in_app',
        data: { type: 'new_complaint', complaint_id: complaint.id },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify admins of new complaint:', err.message);
  }

  return complaint;
};

/**
 * Get complaints for a specific user.
 */
const getUserComplaints = async (userId, { page = 1, limit = 20, status }) => {
  const offset = (page - 1) * limit;
  const params = [userId];
  let whereClause = 'WHERE c.reporter_id = $1';

  if (status) {
    params.push(status);
    whereClause += ` AND c.status = $${params.length}`;
  }

  const countResult = await db.query(
    `SELECT COUNT(*) FROM complaints c ${whereClause}`,
    params
  );

  const dataParams = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT c.*, u.full_name AS resolved_by_name
     FROM complaints c
     LEFT JOIN users u ON u.id = c.resolved_by
     ${whereClause}
     ORDER BY c.created_at DESC
     LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}`,
    dataParams
  );

  const total = parseInt(countResult.rows[0].count, 10);

  return {
    complaints: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get a single complaint by ID (with ownership check).
 */
const getComplaintById = async (complaintId, userId, userRole) => {
  const { rows } = await db.query(
    `SELECT c.*, u.full_name AS reporter_name, u.email AS reporter_email, u.role AS reporter_role,
            ru.full_name AS resolved_by_name
     FROM complaints c
     JOIN users u ON u.id = c.reporter_id
     LEFT JOIN users ru ON ru.id = c.resolved_by
     WHERE c.id = $1`,
    [complaintId]
  );

  if (rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const complaint = rows[0];

  // Non-admin users can only view their own complaints
  if (userRole !== 'admin' && complaint.reporter_id !== userId) {
    const err = new Error('Access denied.');
    err.statusCode = 403;
    throw err;
  }

  return complaint;
};

module.exports = {
  createComplaint,
  getUserComplaints,
  getComplaintById,
};
