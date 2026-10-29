const db = require('../../config/db');

/**
 * Normalize feedback type string to standard snake_case key
 */
function normalizeFeedbackType(type) {
  if (!type) return 'general';
  const lower = type.toLowerCase().trim();
  if (lower.includes('bug')) return 'bug_report';
  if (lower.includes('suggest')) return 'suggestion';
  if (lower.includes('user') || lower.includes('experience')) return 'user_experience';
  if (lower.includes('general')) return 'general';
  if (lower.includes('other')) return 'other';
  return lower.replace(/\s+/g, '_');
}

/**
 * Submit public feedback (no login required)
 */
async function submitFeedback({
  userId = null,
  name = null,
  email = null,
  feedback_type = 'general',
  rating = null,
  subject,
  message,
  is_anonymous = false,
}) {
  const normalizedType = normalizeFeedbackType(feedback_type);
  const effectiveUserId = is_anonymous ? null : userId;
  const effectiveName = is_anonymous ? null : (name ? name.trim() : null);
  const effectiveEmail = email ? email.trim().toLowerCase() : null;

  const result = await db.query(
    `INSERT INTO feedback (
      user_id,
      name,
      email,
      feedback_type,
      rating,
      subject,
      message,
      is_anonymous,
      status,
      created_at,
      updated_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'NEW', NOW(), NOW())
    RETURNING id, status, feedback_type, subject, is_anonymous, created_at`,
    [
      effectiveUserId,
      effectiveName,
      effectiveEmail,
      normalizedType,
      rating || null,
      subject.trim(),
      message.trim(),
      !!is_anonymous,
    ]
  );

  return result.rows[0];
}

/**
 * List feedback for administrators with filters, search, and pagination
 */
async function getFeedbackList({
  page = 1,
  limit = 20,
  status,
  feedback_type,
  search,
  sort = 'recent',
}) {
  const offset = (page - 1) * limit;
  const whereClauses = [];
  const params = [];

  if (status && status !== 'ALL') {
    params.push(status);
    whereClauses.push(`f.status = $${params.length}`);
  }

  if (feedback_type && feedback_type !== 'ALL') {
    const norm = normalizeFeedbackType(feedback_type);
    params.push(norm);
    whereClauses.push(`f.feedback_type = $${params.length}`);
  }

  if (search && search.trim()) {
    params.push(`%${search.trim()}%`);
    whereClauses.push(`(f.subject ILIKE $${params.length} OR f.message ILIKE $${params.length} OR f.name ILIKE $${params.length})`);
  }

  const whereSql = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

  let orderSql = 'ORDER BY f.created_at DESC';
  if (sort === 'oldest') orderSql = 'ORDER BY f.created_at ASC';
  if (sort === 'rating_high') orderSql = 'ORDER BY f.rating DESC NULLS LAST, f.created_at DESC';
  if (sort === 'rating_low') orderSql = 'ORDER BY f.rating ASC NULLS LAST, f.created_at DESC';

  const countQuery = `SELECT COUNT(*) AS total FROM feedback f ${whereSql}`;
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].total, 10);

  const listParams = [...params, limit, offset];
  const listQuery = `
    SELECT
      f.id,
      f.user_id,
      CASE WHEN f.is_anonymous THEN 'Anonymous' ELSE COALESCE(f.name, u.full_name, 'Guest Visitor') END AS display_name,
      CASE WHEN f.is_anonymous THEN NULL ELSE f.email END AS display_email,
      f.feedback_type,
      f.rating,
      f.subject,
      f.message,
      f.is_anonymous,
      f.status,
      f.admin_notes,
      f.created_at,
      f.updated_at,
      u.role AS user_role
    FROM feedback f
    LEFT JOIN users u ON u.id = f.user_id
    ${whereSql}
    ${orderSql}
    LIMIT $${listParams.length - 1} OFFSET $${listParams.length}
  `;

  const listResult = await db.query(listQuery, listParams);

  // Compute overall stats for admin dashboard summary
  const statsQuery = `
    SELECT
      COUNT(*) AS total_count,
      COUNT(*) FILTER (WHERE status = 'NEW') AS new_count,
      COUNT(*) FILTER (WHERE status = 'IN_REVIEW') AS in_review_count,
      COUNT(*) FILTER (WHERE status = 'RESOLVED') AS resolved_count,
      COUNT(*) FILTER (WHERE status = 'ARCHIVED') AS archived_count,
      ROUND(AVG(rating)::numeric, 1) AS avg_rating,
      COUNT(rating) AS rated_count
    FROM feedback
  `;
  const statsResult = await db.query(statsQuery);
  const s = statsResult.rows[0] || {};

  return {
    items: listResult.rows,
    pagination: {
      page: Number(page),
      limit: Number(limit),
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
    stats: {
      total: parseInt(s.total_count || 0, 10),
      newCount: parseInt(s.new_count || 0, 10),
      inReviewCount: parseInt(s.in_review_count || 0, 10),
      resolvedCount: parseInt(s.resolved_count || 0, 10),
      archivedCount: parseInt(s.archived_count || 0, 10),
      avgRating: parseFloat(s.avg_rating || 0),
      ratedCount: parseInt(s.rated_count || 0, 10),
    },
  };
}

/**
 * Get feedback detail by ID
 */
async function getFeedbackById(id) {
  const result = await db.query(
    `SELECT
      f.id,
      f.user_id,
      CASE WHEN f.is_anonymous THEN 'Anonymous' ELSE COALESCE(f.name, u.full_name, 'Guest Visitor') END AS display_name,
      CASE WHEN f.is_anonymous THEN NULL ELSE f.email END AS display_email,
      f.feedback_type,
      f.rating,
      f.subject,
      f.message,
      f.is_anonymous,
      f.status,
      f.admin_notes,
      f.created_at,
      f.updated_at,
      u.role AS user_role
    FROM feedback f
    LEFT JOIN users u ON u.id = f.user_id
    WHERE f.id = $1`,
    [id]
  );

  if (result.rows.length === 0) {
    const error = new Error('Feedback record not found');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

/**
 * Update feedback status and optional admin notes
 */
async function updateFeedbackStatus(id, { status, admin_notes }) {
  const fields = ['status = $2', 'updated_at = NOW()'];
  const params = [id, status];

  if (admin_notes !== undefined) {
    params.push(admin_notes ? admin_notes.trim() : null);
    fields.push(`admin_notes = $${params.length}`);
  }

  const result = await db.query(
    `UPDATE feedback
     SET ${fields.join(', ')}
     WHERE id = $1
     RETURNING *`,
    params
  );

  if (result.rows.length === 0) {
    const error = new Error('Feedback record not found');
    error.statusCode = 404;
    throw error;
  }

  return result.rows[0];
}

module.exports = {
  normalizeFeedbackType,
  submitFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedbackStatus,
};
