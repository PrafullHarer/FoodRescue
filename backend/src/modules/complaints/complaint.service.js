const crypto = require('crypto');
const db = require('../../config/db');
const notificationService = require('../notifications/notification.service');

// State Machine definition
const VALID_TRANSITIONS = {
  submitted: ['under_review', 'assigned', 'rejected', 'closed'],
  under_review: ['assigned', 'awaiting_user_response', 'escalated', 'resolved', 'rejected', 'closed'],
  assigned: ['under_review', 'awaiting_user_response', 'escalated', 'resolved', 'rejected', 'closed'],
  awaiting_user_response: ['under_review', 'assigned', 'escalated', 'resolved', 'rejected', 'closed'],
  escalated: ['under_review', 'assigned', 'awaiting_user_response', 'resolved', 'rejected', 'closed'],
  resolved: ['closed', 'reopened'],
  rejected: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['under_review', 'assigned', 'escalated', 'resolved', 'rejected', 'closed'],
};

/**
 * Generate unique, human-friendly complaint reference
 */
const generateComplaintReference = () => {
  const year = new Date().getFullYear();
  const rand = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `CMP-${year}-${rand}`;
};

/**
 * Check if a user is an authorized participant in a donation or delivery
 */
const verifyTransactionAccess = async (userId, userRole, { donationId, deliveryId }) => {
  if (userRole === 'admin') return true;

  if (donationId) {
    const { rows } = await db.query(
      `SELECT d.id
       FROM food_donations d
       LEFT JOIN food_providers fp ON fp.id = d.provider_id
       LEFT JOIN donation_claims c ON c.donation_id = d.id
       LEFT JOIN ngos n ON n.id = c.ngo_id
       LEFT JOIN deliveries del ON del.donation_id = d.id
       LEFT JOIN ngos del_n ON del_n.id = del.ngo_id
       LEFT JOIN volunteers v ON v.id = del.volunteer_id
       WHERE d.id = $1 
         AND (
           fp.user_id = $2 
           OR n.user_id = $2 
           OR del_n.user_id = $2
           OR del.ngo_id = $2
           OR v.user_id = $2
           OR del.volunteer_id = $2
         )
       LIMIT 1`,
      [donationId, userId]
    );
    if (rows.length === 0) {
      const err = new Error('You are not authorized to file a complaint for this donation.');
      err.statusCode = 403;
      throw err;
    }
  }

  if (deliveryId) {
    const { rows } = await db.query(
      `SELECT del.id
       FROM deliveries del
       JOIN food_donations d ON d.id = del.donation_id
       LEFT JOIN food_providers fp ON fp.id = d.provider_id
       LEFT JOIN ngos n ON n.id = del.ngo_id
       LEFT JOIN volunteers v ON v.id = del.volunteer_id
       WHERE del.id = $1
         AND (
           v.user_id = $2
           OR del.volunteer_id = $2
           OR n.user_id = $2
           OR fp.user_id = $2
         )
       LIMIT 1`,
      [deliveryId, userId]
    );
    if (rows.length === 0) {
      const err = new Error('You are not authorized to file a complaint for this delivery.');
      err.statusCode = 403;
      throw err;
    }
  }

  return true;
};

/**
 * Submit a new complaint
 */
const createComplaint = async (userId, userRole, data) => {
  const {
    title,
    category,
    description,
    donation_id,
    delivery_id,
    subject_user_id,
    incident_date,
    supporting_evidence_url,
  } = data;

  // 1. Verify access to referenced transactions
  await verifyTransactionAccess(userId, userRole, {
    donationId: donation_id,
    deliveryId: delivery_id,
  });

  // 2. Generate unique reference
  let reference = generateComplaintReference();
  let unique = false;
  while (!unique) {
    const { rows: existing } = await db.query(
      'SELECT id FROM complaints WHERE complaint_reference = $1',
      [reference]
    );
    if (existing.length === 0) {
      unique = true;
    } else {
      reference = generateComplaintReference();
    }
  }

  // 3. Compute initial SLA deadlines
  const responseDue = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  const resolutionDue = new Date(Date.now() + 72 * 60 * 60 * 1000); // 72 hours

  // 4. Insert complaint record
  const { rows } = await db.query(
    `INSERT INTO complaints (
      complaint_reference,
      reporter_id,
      complainant_user_id,
      subject_user_id,
      donation_id,
      delivery_id,
      category,
      title,
      subject,
      description,
      priority,
      status,
      response_due_at,
      resolution_due_at,
      incident_date,
      supporting_evidence_url
    ) VALUES ($1, $2, $2, $3, $4, $5, $6, $7, $7, $8, 'medium', 'submitted', $9, $10, $11, $12)
    RETURNING *`,
    [
      reference,
      userId,
      subject_user_id || null,
      donation_id || null,
      delivery_id || null,
      category,
      title,
      description,
      responseDue,
      resolutionDue,
      incident_date ? new Date(incident_date) : null,
      supporting_evidence_url || null,
    ]
  );

  const complaint = rows[0];

  // 5. Create initial audit log entry
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      new_value,
      reason
    ) VALUES ($1, $2, 'created', 'submitted', 'Complaint submitted by user')`,
    [complaint.id, userId]
  );

  // 6. Notify active administrators
  try {
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );
    const { rows: userRow } = await db.query(
      `SELECT full_name, role FROM users WHERE id = $1`,
      [userId]
    );
    const reporterName = userRow[0]?.full_name || 'A user';

    for (const admin of admins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: '⚠️ New Complaint Raised',
        body: `${reporterName} raised complaint ${reference}: "${title}"`,
        type: 'in_app',
        data: {
          type: 'complaint_created',
          complaint_id: complaint.id,
          reference: reference,
        },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify admins of complaint:', err.message);
  }

  return complaint;
};

/**
 * Get complaints submitted by the authenticated user with filtering & pagination
 */
const getUserComplaints = async (userId, query = {}) => {
  const {
    page = 1,
    limit = 10,
    status,
    category,
    search,
    dateRange,
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const params = [userId];
  let whereConditions = ['(c.complainant_user_id = $1 OR c.reporter_id = $1)'];

  if (status && status !== 'all') {
    params.push(status);
    whereConditions.push(`c.status = $${params.length}`);
  }

  if (category && category !== 'all') {
    params.push(category);
    whereConditions.push(`c.category = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereConditions.push(`(c.complaint_reference ILIKE $${params.length} OR c.title ILIKE $${params.length} OR c.subject ILIKE $${params.length})`);
  }

  if (dateRange) {
    let days = null;
    if (dateRange === '7d') days = 7;
    else if (dateRange === '30d') days = 30;
    else if (dateRange === '90d') days = 90;
    if (days) {
      whereConditions.push(`c.created_at >= NOW() - INTERVAL '${days} days'`);
    }
  }

  const whereClause = `WHERE ${whereConditions.join(' AND ')}`;

  const countQuery = `SELECT COUNT(*) FROM complaints c ${whereClause}`;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params, limitNum, offset];
  const dataQuery = `
    SELECT 
      c.id,
      c.complaint_reference,
      COALESCE(c.title, c.subject) AS title,
      c.category,
      c.priority,
      c.status,
      c.donation_id,
      c.delivery_id,
      c.created_at,
      c.updated_at,
      c.resolved_at,
      c.closed_at,
      c.resolution_summary,
      c.rejection_reason,
      u_admin.full_name AS assigned_admin_name,
      (
        SELECT message 
        FROM complaint_messages cm 
        WHERE cm.complaint_id = c.id AND cm.visibility = 'user' 
        ORDER BY cm.created_at DESC 
        LIMIT 1
      ) AS latest_message,
      (
        SELECT COUNT(*)::int
        FROM complaint_messages cm
        WHERE cm.complaint_id = c.id AND cm.visibility = 'user'
      ) AS message_count
    FROM complaints c
    LEFT JOIN users u_admin ON u_admin.id = c.assigned_admin_user_id
    ${whereClause}
    ORDER BY c.created_at DESC
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const { rows } = await db.query(dataQuery, dataParams);

  return {
    complaints: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * Get complaint details with access verification
 */
const getComplaintById = async (complaintId, userId, userRole) => {
  const { rows } = await db.query(
    `SELECT 
      c.*,
      COALESCE(c.title, c.subject) AS title,
      u_comp.full_name AS complainant_name,
      u_comp.email AS complainant_email,
      u_comp.role AS complainant_role,
      u_subj.full_name AS subject_user_name,
      u_subj.email AS subject_user_email,
      u_subj.role AS subject_user_role,
      u_admin.full_name AS assigned_admin_name,
      u_admin.email AS assigned_admin_email,
      d.title AS donation_title,
      d.status AS donation_status,
      del.status AS delivery_status
     FROM complaints c
     LEFT JOIN users u_comp ON u_comp.id = COALESCE(c.complainant_user_id, c.reporter_id)
     LEFT JOIN users u_subj ON u_subj.id = COALESCE(c.subject_user_id, c.reported_user_id)
     LEFT JOIN users u_admin ON u_admin.id = COALESCE(c.assigned_admin_user_id, c.resolved_by)
     LEFT JOIN food_donations d ON d.id = c.donation_id
     LEFT JOIN deliveries del ON del.id = c.delivery_id
     WHERE c.id = $1`,
    [complaintId]
  );

  if (rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const complaint = rows[0];

  // Access check: Only administrators or the complainant can view this complaint
  const isComplainant = (complaint.complainant_user_id === userId || complaint.reporter_id === userId);
  if (userRole !== 'admin' && !isComplainant) {
    const err = new Error('Access denied to this complaint.');
    err.statusCode = 403;
    throw err;
  }

  // Complainants cannot see internal SLA calculation or notes
  if (userRole !== 'admin') {
    delete complaint.escalation_level;
  }

  return complaint;
};

/**
 * Get messages for a complaint (enforcing visibility rules)
 */
const getComplaintMessages = async (complaintId, userId, userRole) => {
  // First ensure user has access to complaint
  await getComplaintById(complaintId, userId, userRole);

  const params = [complaintId];
  let visibilityCondition = '';

  // Non-admins only see 'user' visible messages
  if (userRole !== 'admin') {
    visibilityCondition = `AND cm.visibility = 'user'`;
  }

  const { rows } = await db.query(
    `SELECT 
      cm.id,
      cm.complaint_id,
      cm.sender_user_id,
      cm.message,
      cm.visibility,
      cm.created_at,
      u.full_name AS sender_name,
      u.role AS sender_role,
      (u.id = $2) AS is_me
     FROM complaint_messages cm
     JOIN users u ON u.id = cm.sender_user_id
     WHERE cm.complaint_id = $1 ${visibilityCondition}
     ORDER BY cm.created_at ASC`,
    [complaintId, userId]
  );

  return rows;
};

/**
 * Add a message or response to a complaint
 */
const addComplaintMessage = async (complaintId, userId, userRole, { message, visibility = 'user' }) => {
  const complaint = await getComplaintById(complaintId, userId, userRole);

  // If user is not admin, visibility MUST be 'user'
  const finalVisibility = userRole === 'admin' ? visibility : 'user';

  const { rows } = await db.query(
    `INSERT INTO complaint_messages (complaint_id, sender_user_id, message, visibility)
     VALUES ($1, $2, $3, $4)
     RETURNING *`,
    [complaintId, userId, message, finalVisibility]
  );

  const newMsg = rows[0];

  // Record history
  const historyAction = finalVisibility === 'internal' ? 'internal_note_added' : 'response_added';
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      new_value,
      reason
    ) VALUES ($1, $2, $3, $4, $5)`,
    [
      complaintId,
      userId,
      historyAction,
      finalVisibility,
      finalVisibility === 'internal' ? 'Internal investigation note added' : 'Message sent in communication thread',
    ]
  );

  // If complainant replies while awaiting_user_response, automatically flip back to under_review
  if (userRole !== 'admin' && complaint.status === 'awaiting_user_response') {
    await db.query(
      `UPDATE complaints SET status = 'under_review', updated_at = NOW() WHERE id = $1`,
      [complaintId]
    );
    await db.query(
      `INSERT INTO complaint_history (
        complaint_id,
        actor_user_id,
        action_type,
        previous_value,
        new_value,
        reason
      ) VALUES ($1, $2, 'status_change', 'awaiting_user_response', 'under_review', 'User responded to admin inquiry')`,
      [complaintId, userId]
    );
  }

  // Notify counterpart
  try {
    if (finalVisibility === 'user') {
      if (userRole === 'admin') {
        // Notify complainant
        const complainantId = complaint.complainant_user_id || complaint.reporter_id;
        if (complainantId) {
          await notificationService.createNotification({
            userId: complainantId,
            title: `💬 New Message on Complaint ${complaint.complaint_reference}`,
            body: `An administrator replied: "${message.slice(0, 100)}${message.length > 100 ? '...' : ''}"`,
            type: 'in_app',
            data: {
              type: 'complaint_message',
              complaint_id: complaintId,
            },
          });
        }
      } else {
        // User replied -> notify assigned admin or all admins
        const targetAdminId = complaint.assigned_admin_user_id;
        if (targetAdminId) {
          await notificationService.createNotification({
            userId: targetAdminId,
            title: `💬 Complainant Replied on ${complaint.complaint_reference}`,
            body: `${complaint.complainant_name || 'Complainant'} replied: "${message.slice(0, 100)}"`,
            type: 'in_app',
            data: {
              type: 'complaint_message',
              complaint_id: complaintId,
            },
          });
        }
      }
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify on complaint message:', err.message);
  }

  return newMsg;
};

/**
 * Get audit history for a complaint
 */
const getComplaintHistory = async (complaintId, userId, userRole) => {
  await getComplaintById(complaintId, userId, userRole);

  const { rows } = await db.query(
    `SELECT 
      ch.*,
      u.full_name AS actor_name,
      u.role AS actor_role
     FROM complaint_history ch
     LEFT JOIN users u ON u.id = ch.actor_user_id
     WHERE ch.complaint_id = $1
     ORDER BY ch.created_at ASC`,
    [complaintId]
  );

  return rows;
};

/**
 * [ADMIN] Get filtered, paginated complaints list
 */
const getAdminComplaints = async (query = {}) => {
  const {
    page = 1,
    limit = 15,
    status,
    category,
    priority,
    assigned_admin_id,
    dateRange,
    startDate,
    endDate,
    search,
    sortBy = 'created_at',
    sortOrder = 'DESC',
  } = query;

  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10)));
  const offset = (pageNum - 1) * limitNum;

  const params = [];
  const whereConditions = [];

  if (status && status !== 'all') {
    params.push(status);
    whereConditions.push(`c.status = $${params.length}`);
  }

  if (category && category !== 'all') {
    params.push(category);
    whereConditions.push(`c.category = $${params.length}`);
  }

  if (priority && priority !== 'all') {
    params.push(priority);
    whereConditions.push(`c.priority = $${params.length}`);
  }

  if (assigned_admin_id) {
    if (assigned_admin_id === 'unassigned') {
      whereConditions.push(`c.assigned_admin_user_id IS NULL`);
    } else {
      params.push(assigned_admin_id);
      whereConditions.push(`c.assigned_admin_user_id = $${params.length}`);
    }
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereConditions.push(`(
      c.complaint_reference ILIKE $${params.length} 
      OR c.title ILIKE $${params.length} 
      OR c.subject ILIKE $${params.length}
      OR u_comp.full_name ILIKE $${params.length}
      OR u_comp.email ILIKE $${params.length}
    )`);
  }

  // Date Range
  if (dateRange && dateRange !== 'custom') {
    let days = null;
    if (dateRange === 'today') days = 1;
    else if (dateRange === '7d') days = 7;
    else if (dateRange === '30d') days = 30;
    else if (dateRange === '90d') days = 90;
    if (days) {
      whereConditions.push(`c.created_at >= NOW() - INTERVAL '${days} days'`);
    }
  } else if (startDate && endDate) {
    params.push(new Date(startDate).toISOString());
    whereConditions.push(`c.created_at >= $${params.length}`);
    params.push(new Date(endDate).toISOString());
    whereConditions.push(`c.created_at <= $${params.length}`);
  }

  const whereClause = whereConditions.length > 0 ? `WHERE ${whereConditions.join(' AND ')}` : '';

  // Allowed sort columns
  const validSorts = ['created_at', 'updated_at', 'priority', 'status', 'resolution_due_at'];
  const sortCol = validSorts.includes(sortBy) ? sortBy : 'created_at';
  const sortDir = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQuery = `
    SELECT COUNT(*) 
    FROM complaints c
    LEFT JOIN users u_comp ON u_comp.id = COALESCE(c.complainant_user_id, c.reporter_id)
    ${whereClause}
  `;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count, 10);

  const dataParams = [...params, limitNum, offset];
  const dataQuery = `
    SELECT 
      c.id,
      c.complaint_reference,
      COALESCE(c.title, c.subject) AS title,
      c.category,
      c.priority,
      c.status,
      c.created_at,
      c.updated_at,
      c.resolved_at,
      c.closed_at,
      c.response_due_at,
      c.resolution_due_at,
      c.escalation_level,
      c.donation_id,
      c.delivery_id,
      u_comp.id AS complainant_id,
      u_comp.full_name AS complainant_name,
      u_comp.email AS complainant_email,
      u_comp.role AS complainant_role,
      u_admin.id AS assigned_admin_id,
      u_admin.full_name AS assigned_admin_name,
      (c.resolution_due_at < NOW() AND c.status NOT IN ('resolved', 'rejected', 'closed')) AS is_overdue
    FROM complaints c
    LEFT JOIN users u_comp ON u_comp.id = COALESCE(c.complainant_user_id, c.reporter_id)
    LEFT JOIN users u_admin ON u_admin.id = c.assigned_admin_user_id
    ${whereClause}
    ORDER BY c.${sortCol} ${sortDir}
    LIMIT $${dataParams.length - 1} OFFSET $${dataParams.length}
  `;

  const { rows } = await db.query(dataQuery, dataParams);

  return {
    complaints: rows,
    pagination: {
      page: pageNum,
      limit: limitNum,
      total,
      totalPages: Math.ceil(total / limitNum) || 1,
    },
  };
};

/**
 * [ADMIN] Compute real database statistics for summary cards
 */
const getAdminComplaintStats = async () => {
  const { rows } = await db.query(`
    SELECT
      COUNT(*)::int AS total_complaints,
      COUNT(CASE WHEN status = 'submitted' THEN 1 END)::int AS new_complaints,
      COUNT(CASE WHEN status IN ('submitted', 'under_review', 'assigned', 'awaiting_user_response', 'escalated', 'reopened') THEN 1 END)::int AS open_complaints,
      COUNT(CASE WHEN priority IN ('high', 'critical') AND status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)::int AS high_priority_complaints,
      COUNT(CASE WHEN status = 'awaiting_user_response' THEN 1 END)::int AS awaiting_response_complaints,
      COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END)::int AS resolved_complaints,
      COUNT(CASE WHEN status = 'rejected' THEN 1 END)::int AS rejected_complaints,
      COUNT(CASE WHEN resolution_due_at < NOW() AND status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)::int AS overdue_complaints,
      COUNT(CASE WHEN assigned_admin_user_id IS NULL AND status NOT IN ('resolved', 'rejected', 'closed') THEN 1 END)::int AS unassigned_complaints,
      ROUND(COALESCE(AVG(EXTRACT(EPOCH FROM (resolved_at - created_at))/3600) FILTER (WHERE resolved_at IS NOT NULL), 0)::numeric, 1)::float AS avg_resolution_hours,
      ROUND(
        (COUNT(CASE WHEN status = 'reopened' THEN 1 END)::numeric / 
         NULLIF(COUNT(CASE WHEN status IN ('resolved', 'closed') THEN 1 END), 0) * 100
        ), 1
      )::float AS reopened_rate
    FROM complaints
  `);

  return rows[0] || {
    total_complaints: 0,
    new_complaints: 0,
    open_complaints: 0,
    high_priority_complaints: 0,
    awaiting_response_complaints: 0,
    resolved_complaints: 0,
    rejected_complaints: 0,
    overdue_complaints: 0,
    unassigned_complaints: 0,
    avg_resolution_hours: 0,
    reopened_rate: 0,
  };
};

/**
 * [ADMIN] Assign or reassign complaint to an administrator
 */
const assignComplaint = async (complaintId, adminUserId, targetAdminId, notes) => {
  const { rows: adminRows } = await db.query(
    `SELECT id, full_name, email FROM users WHERE id = $1 AND role = 'admin'`,
    [targetAdminId]
  );
  if (adminRows.length === 0) {
    const err = new Error('Assigned user must be an active administrator.');
    err.statusCode = 400;
    throw err;
  }
  const assignedAdmin = adminRows[0];

  const { rows } = await db.query(
    `UPDATE complaints 
     SET assigned_admin_user_id = $1, 
         status = CASE WHEN status = 'submitted' THEN 'assigned' ELSE status END,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [targetAdminId, complaintId]
  );

  if (rows.length === 0) {
    const err = new Error('Complaint not found.');
    err.statusCode = 404;
    throw err;
  }

  const updatedComplaint = rows[0];

  // Record history
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      new_value,
      reason
    ) VALUES ($1, $2, 'assigned', $3, $4)`,
    [
      complaintId,
      adminUserId,
      assignedAdmin.full_name,
      notes || `Assigned to administrator ${assignedAdmin.full_name}`,
    ]
  );

  // Notify assigned administrator
  try {
    await notificationService.createNotification({
      userId: targetAdminId,
      title: '📋 Complaint Assigned to You',
      body: `You have been assigned to handle complaint ${updatedComplaint.complaint_reference}`,
      type: 'in_app',
      data: {
        type: 'complaint_assigned',
        complaint_id: complaintId,
      },
    });
  } catch (err) {
    console.error('[NOTIFY] Failed to notify assigned admin:', err.message);
  }

  return updatedComplaint;
};

/**
 * [ADMIN] Transition complaint status according to valid state machine
 */
const updateComplaintStatus = async (complaintId, adminUserId, newStatus, reason) => {
  const complaint = await getComplaintById(complaintId, adminUserId, 'admin');

  // Check state machine
  const allowed = VALID_TRANSITIONS[complaint.status] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid state transition: Cannot change status from "${complaint.status}" to "${newStatus}". Valid transitions: ${allowed.join(', ')}`
    );
    err.statusCode = 400;
    throw err;
  }

  // Update query
  const isClosed = newStatus === 'closed';
  const { rows } = await db.query(
    `UPDATE complaints
     SET status = $1::varchar,
         updated_at = NOW(),
         closed_at = CASE WHEN $2::boolean THEN NOW() ELSE closed_at END
     WHERE id = $3
     RETURNING *`,
    [newStatus, isClosed, complaintId]
  );

  const updated = rows[0];

  // Record audit
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      previous_value,
      new_value,
      reason
    ) VALUES ($1, $2, 'status_change', $3, $4, $5)`,
    [complaintId, adminUserId, complaint.status, newStatus, reason || `Status changed to ${newStatus}`]
  );

  // Notify complainant of status change
  try {
    const complainantId = complaint.complainant_user_id || complaint.reporter_id;
    if (complainantId) {
      await notificationService.createNotification({
        userId: complainantId,
        title: `📌 Complaint ${complaint.complaint_reference} Status Updated`,
        body: `Your complaint is now: ${newStatus.replace(/_/g, ' ')}`,
        type: 'in_app',
        data: {
          type: 'complaint_status_change',
          complaint_id: complaintId,
          status: newStatus,
        },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify user of status update:', err.message);
  }

  return updated;
};

/**
 * [ADMIN] Resolve a complaint with mandatory resolution summary
 */
const resolveComplaint = async (complaintId, adminUserId, resolutionSummary) => {
  if (!resolutionSummary || resolutionSummary.trim().length < 5) {
    const err = new Error('A detailed resolution summary (minimum 5 characters) is required to resolve a complaint.');
    err.statusCode = 400;
    throw err;
  }

  const complaint = await getComplaintById(complaintId, adminUserId, 'admin');

  const { rows } = await db.query(
    `UPDATE complaints
     SET status = 'resolved',
         resolution_summary = $1,
         resolution_notes = $1,
         resolved_by = $2,
         assigned_admin_user_id = COALESCE(assigned_admin_user_id, $2),
         resolved_at = NOW(),
         updated_at = NOW()
     WHERE id = $3
     RETURNING *`,
    [resolutionSummary.trim(), adminUserId, complaintId]
  );

  const updated = rows[0];

  // Add system message into thread visible to user
  await db.query(
    `INSERT INTO complaint_messages (complaint_id, sender_user_id, message, visibility)
     VALUES ($1, $2, $3, 'user')`,
    [complaintId, adminUserId, `[RESOLVED]: ${resolutionSummary.trim()}`]
  );

  // Record audit
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      previous_value,
      new_value,
      reason
    ) VALUES ($1, $2, 'resolved', $3, 'resolved', $4)`,
    [complaintId, adminUserId, complaint.status, resolutionSummary.trim()]
  );

  // Notify complainant
  try {
    const complainantId = complaint.complainant_user_id || complaint.reporter_id;
    if (complainantId) {
      await notificationService.createNotification({
        userId: complainantId,
        title: `✅ Complaint ${complaint.complaint_reference} Resolved`,
        body: `Resolution outcome: ${resolutionSummary.slice(0, 120)}`,
        type: 'in_app',
        data: {
          type: 'complaint_resolved',
          complaint_id: complaintId,
        },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify complainant of resolution:', err.message);
  }

  return updated;
};

/**
 * [ADMIN] Reject a complaint with mandatory rejection reason
 */
const rejectComplaint = async (complaintId, adminUserId, rejectionReason) => {
  if (!rejectionReason || rejectionReason.trim().length < 5) {
    const err = new Error('A rejection reason (minimum 5 characters) must be documented.');
    err.statusCode = 400;
    throw err;
  }

  const complaint = await getComplaintById(complaintId, adminUserId, 'admin');

  const { rows } = await db.query(
    `UPDATE complaints
     SET status = 'rejected',
         rejection_reason = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [rejectionReason.trim(), complaintId]
  );

  const updated = rows[0];

  // Add system message visible to user
  await db.query(
    `INSERT INTO complaint_messages (complaint_id, sender_user_id, message, visibility)
     VALUES ($1, $2, $3, 'user')`,
    [complaintId, adminUserId, `[REJECTED]: ${rejectionReason.trim()}`]
  );

  // Record audit
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      previous_value,
      new_value,
      reason
    ) VALUES ($1, $2, 'rejected', $3, 'rejected', $4)`,
    [complaintId, adminUserId, complaint.status, rejectionReason.trim()]
  );

  // Notify complainant
  try {
    const complainantId = complaint.complainant_user_id || complaint.reporter_id;
    if (complainantId) {
      await notificationService.createNotification({
        userId: complainantId,
        title: `❌ Complaint ${complaint.complaint_reference} Rejected`,
        body: `Reason: ${rejectionReason.slice(0, 120)}`,
        type: 'in_app',
        data: {
          type: 'complaint_rejected',
          complaint_id: complaintId,
        },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify complainant of rejection:', err.message);
  }

  return updated;
};

/**
 * Reopen a complaint (Complainant within 14 days or Admin anytime)
 */
const reopenComplaint = async (complaintId, userId, userRole, reason) => {
  if (!reason || reason.trim().length < 5) {
    const err = new Error('A documented reason is required to reopen a complaint.');
    err.statusCode = 400;
    throw err;
  }

  const complaint = await getComplaintById(complaintId, userId, userRole);

  if (!['resolved', 'rejected', 'closed'].includes(complaint.status)) {
    const err = new Error(`Only resolved, rejected, or closed complaints can be reopened. Current status: ${complaint.status}`);
    err.statusCode = 400;
    throw err;
  }

  // Complainant policy check: must reopen within 14 days of closure/resolution
  if (userRole !== 'admin') {
    const referenceDate = complaint.closed_at || complaint.resolved_at || complaint.updated_at;
    const diffDays = (Date.now() - new Date(referenceDate).getTime()) / (1000 * 60 * 60 * 24);
    if (diffDays > 14) {
      const err = new Error('Complaints cannot be reopened after 14 days of resolution/closure. Please contact support or raise a new complaint.');
      err.statusCode = 403;
      throw err;
    }
  }

  const { rows } = await db.query(
    `UPDATE complaints
     SET status = 'reopened',
         reopen_reason = $1,
         reopened_at = NOW(),
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [reason.trim(), complaintId]
  );

  const updated = rows[0];

  // Record audit
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      previous_value,
      new_value,
      reason
    ) VALUES ($1, $2, 'reopened', $3, 'reopened', $4)`,
    [complaintId, userId, complaint.status, reason.trim()]
  );

  // Notify admins
  try {
    const { rows: admins } = await db.query(
      `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
    );
    for (const admin of admins) {
      await notificationService.createNotification({
        userId: admin.id,
        title: `🔄 Complaint ${complaint.complaint_reference} Reopened`,
        body: `Reason: ${reason.slice(0, 100)}`,
        type: 'in_app',
        data: {
          type: 'complaint_reopened',
          complaint_id: complaintId,
        },
      });
    }
  } catch (err) {
    console.error('[NOTIFY] Failed to notify on reopen:', err.message);
  }

  return updated;
};

/**
 * [ADMIN] Update priority with documented reason
 */
const updatePriority = async (complaintId, adminUserId, priority, reason) => {
  const complaint = await getComplaintById(complaintId, adminUserId, 'admin');

  const { rows } = await db.query(
    `UPDATE complaints
     SET priority = $1,
         updated_at = NOW()
     WHERE id = $2
     RETURNING *`,
    [priority, complaintId]
  );

  const updated = rows[0];

  // Record audit
  await db.query(
    `INSERT INTO complaint_history (
      complaint_id,
      actor_user_id,
      action_type,
      previous_value,
      new_value,
      reason
    ) VALUES ($1, $2, 'priority_change', $3, $4, $5)`,
    [complaintId, adminUserId, complaint.priority, priority, reason || `Priority changed to ${priority}`]
  );

  return updated;
};

/**
 * [ADMIN] Export filtered complaints as CSV
 */
const exportComplaintsCSV = async (query = {}) => {
  const result = await getAdminComplaints({ ...query, limit: 2000, page: 1 });
  const complaints = result.complaints;

  const headers = [
    'Complaint Reference',
    'Title',
    'Category',
    'Priority',
    'Status',
    'Complainant Name',
    'Complainant Email',
    'Complainant Role',
    'Assigned Admin',
    'Created At',
    'Updated At',
    'Resolved At',
    'Is Overdue',
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const rows = complaints.map((c) => [
    escapeCSV(c.complaint_reference),
    escapeCSV(c.title),
    escapeCSV(c.category),
    escapeCSV(c.priority),
    escapeCSV(c.status),
    escapeCSV(c.complainant_name),
    escapeCSV(c.complainant_email),
    escapeCSV(c.complainant_role),
    escapeCSV(c.assigned_admin_name || 'Unassigned'),
    escapeCSV(c.created_at ? new Date(c.created_at).toISOString() : ''),
    escapeCSV(c.updated_at ? new Date(c.updated_at).toISOString() : ''),
    escapeCSV(c.resolved_at ? new Date(c.resolved_at).toISOString() : ''),
    escapeCSV(c.is_overdue ? 'YES' : 'NO'),
  ]);

  return [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
};

module.exports = {
  createComplaint,
  getUserComplaints,
  getComplaintById,
  getComplaintMessages,
  addComplaintMessage,
  getComplaintHistory,
  getAdminComplaints,
  getAdminComplaintStats,
  assignComplaint,
  updateComplaintStatus,
  resolveComplaint,
  rejectComplaint,
  reopenComplaint,
  updatePriority,
  exportComplaintsCSV,
};
