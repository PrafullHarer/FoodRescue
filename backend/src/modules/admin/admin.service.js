const db = require('../../config/db');
const notificationService = require('../notifications/notification.service');

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
 * Get all registrations and verifications with comprehensive filtering, search, and stats.
 * Prioritizes PENDING accounts at the top.
 */
const getVerifications = async ({ page = 1, limit = 20, status, role, search }) => {
  const offset = (page - 1) * limit;
  const conditions = [];
  const params = [];

  // Exclude admin role users from verification queue
  conditions.push(`u.role != 'admin'`);

  if (status && status !== 'ALL') {
    params.push(status.toUpperCase());
    conditions.push(`u.verification_status = $${params.length}`);
  }

  if (role && role !== 'ALL') {
    params.push(role.toLowerCase());
    conditions.push(`u.role = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    const pIdx = params.length;
    conditions.push(`(
      u.full_name ILIKE $${pIdx} OR
      u.email ILIKE $${pIdx} OR
      u.phone ILIKE $${pIdx} OR
      fp.business_name ILIKE $${pIdx} OR
      n.organization_name ILIKE $${pIdx}
    )`);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Get count breakdown across statuses for fast UI counters
  const statsRes = await db.query(`
    SELECT
      COUNT(*) FILTER (WHERE verification_status = 'PENDING') AS pending_count,
      COUNT(*) FILTER (WHERE verification_status = 'APPROVED') AS approved_count,
      COUNT(*) FILTER (WHERE verification_status = 'REJECTED') AS rejected_count,
      COUNT(*) FILTER (WHERE verification_status = 'SUSPENDED') AS suspended_count,
      COUNT(*) AS total_count
    FROM users
    WHERE role != 'admin'
  `);
  const stats = statsRes.rows[0] || {
    pending_count: 0,
    approved_count: 0,
    rejected_count: 0,
    suspended_count: 0,
    total_count: 0,
  };

  // Filtered total count
  const countRes = await db.query(
    `SELECT COUNT(*)
     FROM users u
     LEFT JOIN food_providers fp ON fp.user_id = u.id
     LEFT JOIN ngos n ON n.user_id = u.id
     ${whereClause}`,
    params
  );
  const total = parseInt(countRes.rows[0]?.count || '0', 10);

  // Paginated query with priority ordering: PENDING first, then newest
  const dataParams = [...params, limit, offset];
  const query = `
    SELECT
      u.id,
      u.email,
      u.role,
      u.full_name,
      u.phone,
      u.avatar_url,
      u.status,
      u.verification_status,
      u.auth_provider,
      u.profile_completed,
      u.created_at,
      u.updated_at,
      u.approved_at,
      u.rejected_at,
      u.rejection_reason,
      u.info_requested_notes,
      u.info_requested_at,
      u.suspended_at,
      appr.full_name AS approved_by_name,
      rej.full_name AS rejected_by_name,
      COALESCE(fp.business_name, n.organization_name) AS organization_name,
      fp.business_type,
      fp.address AS provider_address,
      n.registration_no,
      n.address AS ngo_address,
      v.vehicle_type
    FROM users u
    LEFT JOIN food_providers fp ON fp.user_id = u.id
    LEFT JOIN ngos n ON n.user_id = u.id
    LEFT JOIN volunteers v ON v.user_id = u.id
    LEFT JOIN users appr ON appr.id = u.approved_by
    LEFT JOIN users rej ON rej.id = u.rejected_by
    ${whereClause}
    ORDER BY
      CASE WHEN u.verification_status = 'PENDING' THEN 0 ELSE 1 END ASC,
      u.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const { rows } = await db.query(query, dataParams);

  return {
    users: rows,
    stats: {
      pending: parseInt(stats.pending_count, 10),
      approved: parseInt(stats.approved_count, 10),
      rejected: parseInt(stats.rejected_count, 10),
      suspended: parseInt(stats.suspended_count, 10),
      total: parseInt(stats.total_count, 10),
    },
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Get complete registration & verification details for a single user.
 * Excludes passwords, hashes, and secrets.
 */
const getVerificationDetail = async (userId) => {
  const { rows } = await db.query(
    `SELECT
      u.id,
      u.email,
      u.role,
      u.full_name,
      u.phone,
      u.avatar_url,
      u.status,
      u.verification_status,
      u.auth_provider,
      u.profile_completed,
      u.created_at,
      u.updated_at,
      u.approved_by,
      u.approved_at,
      u.rejected_by,
      u.rejected_at,
      u.rejection_reason,
      u.info_requested_notes,
      u.info_requested_at,
      u.suspended_at,
      appr.full_name AS approved_by_name,
      appr.email AS approved_by_email,
      rej.full_name AS rejected_by_name,
      rej.email AS rejected_by_email
     FROM users u
     LEFT JOIN users appr ON appr.id = u.approved_by
     LEFT JOIN users rej ON rej.id = u.rejected_by
     WHERE u.id = $1`,
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];
  let roleProfile = null;

  if (user.role === 'provider') {
    const res = await db.query('SELECT * FROM food_providers WHERE user_id = $1', [userId]);
    roleProfile = res.rows[0] || null;
  } else if (user.role === 'ngo') {
    const res = await db.query('SELECT * FROM ngos WHERE user_id = $1', [userId]);
    roleProfile = res.rows[0] || null;
  } else if (user.role === 'volunteer') {
    const res = await db.query('SELECT * FROM volunteers WHERE user_id = $1', [userId]);
    roleProfile = res.rows[0] || null;
  }

  // Supporting documents
  const docsRes = await db.query(
    'SELECT * FROM user_verification_documents WHERE user_id = $1 ORDER BY uploaded_at DESC',
    [userId]
  );

  return {
    user,
    roleProfile,
    documents: docsRes.rows,
  };
};

/**
 * Approve a user registration.
 */
const approveVerification = async (userId, adminUserId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT id, email, role, full_name, verification_status FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    const targetUser = check.rows[0];

    const { rows } = await client.query(
      `UPDATE users
       SET verification_status = 'APPROVED',
           status = 'active',
           approved_by = $1,
           approved_at = NOW(),
           rejection_reason = NULL,
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, role, full_name, status, verification_status, approved_at`,
      [adminUserId, userId]
    );

    // Sync is_verified on role tables
    if (targetUser.role === 'provider') {
      await client.query('UPDATE food_providers SET is_verified = TRUE WHERE user_id = $1', [userId]);
    } else if (targetUser.role === 'ngo') {
      await client.query('UPDATE ngos SET is_verified = TRUE WHERE user_id = $1', [userId]);
    }

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'user.approve', 'user', $2, $3)`,
      [
        adminUserId,
        userId,
        JSON.stringify({
          previous_status: targetUser.verification_status,
          new_status: 'APPROVED',
          approved_at: new Date().toISOString(),
        }),
      ]
    );

    // Invalidate auth cache
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // In-app notification for the user
    try {
      await notificationService.createNotification({
        userId,
        title: 'Account Approved',
        body: 'Congratulations! Your FoodRescue account has been verified and approved. You can now log in and access your dashboard.',
        data: { type: 'account_approved', verification_status: 'APPROVED' },
      });

      // Send email notification
      await notificationService.sendEmail(
        targetUser.email,
        'Congratulations! Your FoodRescue account is approved',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded-radius: 8px;">
          <h2 style="color: #10B981;">Account Approved</h2>
          <p>Hello ${targetUser.full_name},</p>
          <p>Congratulations! Your FoodRescue account has been verified and approved by our administrative team.</p>
          <p>You can now log in and access your full ${targetUser.role.toUpperCase()} dashboard.</p>
          <p style="margin-top: 24px;"><a href="${process.env.APP_URL || 'http://localhost:5173'}/login" style="background-color: #10B981; color: white; padding: 10px 20px; text-decoration: none; border-radius: 6px; font-weight: bold;">Log In Now</a></p>
        </div>`
      );
    } catch (notifErr) {
      console.warn('[NOTIFY] Approval notification warning:', notifErr.message);
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Reject a user registration with a required reason.
 */
const rejectVerification = async (userId, reason, adminUserId) => {
  if (!reason || !reason.trim()) {
    const err = new Error('A rejection reason is required.');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT id, email, role, full_name, verification_status FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    const targetUser = check.rows[0];

    const { rows } = await client.query(
      `UPDATE users
       SET verification_status = 'REJECTED',
           status = 'blocked',
           rejected_by = $1,
           rejected_at = NOW(),
           rejection_reason = $2,
           updated_at = NOW()
       WHERE id = $3
       RETURNING id, email, role, full_name, status, verification_status, rejection_reason, rejected_at`,
      [adminUserId, reason.trim(), userId]
    );

    // Revoke any active refresh tokens
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'user.reject', 'user', $2, $3)`,
      [
        adminUserId,
        userId,
        JSON.stringify({
          previous_status: targetUser.verification_status,
          new_status: 'REJECTED',
          reason: reason.trim(),
          rejected_at: new Date().toISOString(),
        }),
      ]
    );

    // Invalidate auth cache
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // In-app notification for the user
    try {
      await notificationService.createNotification({
        userId,
        title: 'Registration Rejected',
        body: 'Your FoodRescue registration could not be approved. Please review the reason provided by the administrator.',
        data: { type: 'account_rejected', verification_status: 'REJECTED', reason: reason.trim() },
      });

      // Send email notification
      await notificationService.sendEmail(
        targetUser.email,
        'FoodRescue Registration Update',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded-radius: 8px;">
          <h2 style="color: #EF4444;">Registration Not Approved</h2>
          <p>Hello ${targetUser.full_name},</p>
          <p>Your FoodRescue registration could not be approved at this time.</p>
          <p><strong>Reason provided by administrator:</strong></p>
          <blockquote style="background: #f9f9f9; padding: 12px; border-left: 4px solid #EF4444; margin: 16px 0;">${reason.trim()}</blockquote>
          <p>If you have any questions or additional documentation to provide, please contact our support team.</p>
        </div>`
      );
    } catch (notifErr) {
      console.warn('[NOTIFY] Rejection notification warning:', notifErr.message);
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Request additional information from a pending registrant.
 */
const requestVerificationInfo = async (userId, notes, adminUserId) => {
  if (!notes || !notes.trim()) {
    const err = new Error('Information request notes are required.');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT id, email, role, full_name, verification_status FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    const targetUser = check.rows[0];

    const { rows } = await client.query(
      `UPDATE users
       SET info_requested_notes = $1,
           info_requested_at = NOW(),
           updated_at = NOW()
       WHERE id = $2
       RETURNING id, email, role, full_name, status, verification_status, info_requested_notes, info_requested_at`,
      [notes.trim(), userId]
    );

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'user.request_info', 'user', $2, $3)`,
      [adminUserId, userId, JSON.stringify({ notes: notes.trim(), requested_at: new Date().toISOString() })]
    );

    // Invalidate auth cache
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // In-app notification
    try {
      await notificationService.createNotification({
        userId,
        title: 'Additional Information Requested',
        body: `Additional verification information requested: ${notes.trim()}`,
        data: { type: 'info_requested', notes: notes.trim() },
      });

      // Send email notification
      await notificationService.sendEmail(
        targetUser.email,
        'Action Required: Additional Information Needed for FoodRescue Account',
        `<div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; rounded-radius: 8px;">
          <h2 style="color: #F59E0B;">Additional Information Requested</h2>
          <p>Hello ${targetUser.full_name},</p>
          <p>Our administrator reviewed your FoodRescue registration and requires additional details before approving your account:</p>
          <blockquote style="background: #fffbeb; padding: 12px; border-left: 4px solid #F59E0B; margin: 16px 0;">${notes.trim()}</blockquote>
          <p>Your account will remain pending until this information is reviewed.</p>
        </div>`
      );
    } catch (notifErr) {
      console.warn('[NOTIFY] Request info notification warning:', notifErr.message);
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Suspend an approved user and immediately revoke all active sessions.
 */
const suspendUser = async (userId, adminUserId) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const check = await client.query('SELECT id, email, role, full_name, verification_status FROM users WHERE id = $1', [userId]);
    if (check.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }
    const targetUser = check.rows[0];

    if (targetUser.role === 'admin') {
      const err = new Error('Administrator accounts cannot be suspended via this endpoint.');
      err.statusCode = 403;
      throw err;
    }

    const { rows } = await client.query(
      `UPDATE users
       SET verification_status = 'SUSPENDED',
           status = 'suspended',
           suspended_at = NOW(),
           updated_at = NOW()
       WHERE id = $1
       RETURNING id, email, role, full_name, status, verification_status, suspended_at`,
      [userId]
    );

    // Immediately revoke/delete all active refresh tokens for this user
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    // Audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
       VALUES ($1, 'user.suspend', 'user', $2, $3)`,
      [
        adminUserId,
        userId,
        JSON.stringify({
          previous_status: targetUser.verification_status,
          new_status: 'SUSPENDED',
          suspended_at: new Date().toISOString(),
        }),
      ]
    );

    // Invalidate auth cache immediately
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // In-app notification
    try {
      await notificationService.createNotification({
        userId,
        title: 'Account Suspended',
        body: 'Your account has been suspended by an administrator. Please contact support.',
        data: { type: 'account_suspended', verification_status: 'SUSPENDED' },
      });
    } catch (notifErr) {
      console.warn('[NOTIFY] Suspension notification warning:', notifErr.message);
    }

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
};

/**
 * Get pending verifications (legacy support).
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
const getComplaints = async ({ page = 1, limit = 20, status, role, category, search }) => {
  const offset = (page - 1) * limit;
  const params = [];
  const conditions = [];

  if (status) {
    params.push(status);
    conditions.push(`c.status = $${params.length}`);
  }

  if (role) {
    params.push(role);
    conditions.push(`u.role = $${params.length}`);
  }

  if (category) {
    params.push(category);
    conditions.push(`c.category = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    conditions.push(`(c.subject ILIKE $${params.length} OR u.full_name ILIKE $${params.length} OR u.email ILIKE $${params.length} OR c.id::text ILIKE $${params.length})`);
  }

  const whereClause = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  const countResult = await db.query(
    `SELECT COUNT(*) FROM complaints c JOIN users u ON u.id = c.reporter_id ${whereClause}`,
    params
  );

  const dataParams = [...params, limit, offset];
  const { rows } = await db.query(
    `SELECT c.*, u.full_name AS reporter_name, u.email AS reporter_email, u.role AS reporter_role,
            ru.full_name AS reported_user_name
     FROM complaints c
     JOIN users u ON u.id = c.reporter_id
     LEFT JOIN users ru ON ru.id = c.reported_user_id
     ${whereClause}
     ORDER BY
       CASE c.status WHEN 'open' THEN 0 WHEN 'investigating' THEN 1 WHEN 'resolved' THEN 2 WHEN 'dismissed' THEN 3 END,
       c.created_at DESC
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

  // Notify the reporter
  try {
    await notificationService.createNotification({
      userId: rows[0].reporter_id,
      title: '✅ Complaint Resolved',
      body: `Your complaint "${rows[0].subject}" has been resolved.`,
      type: 'in_app',
      data: { type: 'complaint_resolved', complaint_id: complaintId },
    });
  } catch (err) {
    console.error('[NOTIFY] Failed to notify reporter:', err.message);
  }

  return rows[0];
};

/**
 * Update complaint status (full lifecycle).
 */
const updateComplaintStatus = async (complaintId, { status, admin_response }, adminUserId) => {
  const validStatuses = ['open', 'investigating', 'resolved', 'dismissed'];
  if (!validStatuses.includes(status)) {
    const err = new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    err.statusCode = 400;
    throw err;
  }

  const fields = ['status = $1'];
  const params = [status];

  if (admin_response !== undefined) {
    params.push(admin_response);
    fields.push(`resolution_notes = $${params.length}`);
  }

  if (status === 'resolved' || status === 'dismissed') {
    params.push(adminUserId);
    fields.push(`resolved_by = $${params.length}`);
    fields.push('resolved_at = NOW()');
  }

  params.push(complaintId);
  const { rows } = await db.query(
    `UPDATE complaints SET ${fields.join(', ')} WHERE id = $${params.length} RETURNING *`,
    params
  );

  if (rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  // Audit log
  await db.query(
    `INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, changes)
     VALUES ($1, 'complaint.status_update', 'complaint', $2, $3)`,
    [adminUserId, complaintId, JSON.stringify({ status, admin_response })]
  );

  // Notify the reporter of status change
  const statusLabels = {
    investigating: '🔍 Complaint Under Review',
    resolved: '✅ Complaint Resolved',
    dismissed: '🚫 Complaint Dismissed',
    open: '📋 Complaint Reopened',
  };

  try {
    await notificationService.createNotification({
      userId: rows[0].reporter_id,
      title: statusLabels[status] || 'Complaint Updated',
      body: admin_response
        ? `Your complaint "${rows[0].subject}" status: ${status}. Response: ${admin_response}`
        : `Your complaint "${rows[0].subject}" status changed to: ${status}.`,
      type: 'in_app',
      data: { type: 'complaint_status_update', complaint_id: complaintId, status },
    });
  } catch (err) {
    console.error('[NOTIFY] Failed to notify reporter:', err.message);
  }

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

/**
 * Attach a verification document to a user record.
 */
const addVerificationDocument = async (userId, { document_name, document_url, document_type, file_size }) => {
  const { rows } = await db.query(
    `INSERT INTO user_verification_documents (user_id, document_name, document_url, document_type, file_size)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, document_name, document_url, document_type || 'application/pdf', file_size || 0]
  );
  return rows[0];
};

module.exports = {
  getVerifications,
  getVerificationDetail,
  approveVerification,
  rejectVerification,
  requestVerificationInfo,
  suspendUser,
  addVerificationDocument,
  verifyEntity,
  getPendingVerifications,
  getComplaints,
  resolveComplaint,
  updateComplaintStatus,
  getAuditLogs,
};
