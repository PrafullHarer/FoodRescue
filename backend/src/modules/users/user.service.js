const db = require('../../config/db');

/**
 * Get all users (with optional filtering).
 */
const getUsers = async ({ page = 1, limit = 20, role, status }) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT id, email, role, full_name, phone, avatar_url, status, created_at FROM users';
  const params = [];
  const conditions = [];

  if (role) {
    params.push(role);
    conditions.push(`role = $${params.length}`);
  }

  if (status) {
    params.push(status);
    conditions.push(`status = $${params.length}`);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Get total count
  const countQuery = query.replace(
    'SELECT id, email, role, full_name, phone, avatar_url, status, created_at',
    'SELECT COUNT(*)'
  );
  const countResult = await db.query(countQuery, params);
  const total = parseInt(countResult.rows[0].count, 10);

  // Paginated results
  params.push(limit);
  query += ` ORDER BY created_at DESC LIMIT $${params.length}`;
  params.push(offset);
  query += ` OFFSET $${params.length}`;

  const { rows } = await db.query(query, params);

  return {
    users: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit),
    },
  };
};

/**
 * Get user by ID with role-specific profile.
 */
const getUserById = async (userId) => {
  const { rows } = await db.query(
    'SELECT id, email, role, full_name, phone, avatar_url, status, created_at FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  // Fetch role-specific profile
  if (user.role === 'provider') {
    const profile = await db.query(
      'SELECT * FROM food_providers WHERE user_id = $1',
      [userId]
    );
    user.profile = profile.rows[0] || null;
  } else if (user.role === 'ngo') {
    const profile = await db.query(
      'SELECT * FROM ngos WHERE user_id = $1',
      [userId]
    );
    user.profile = profile.rows[0] || null;
  } else if (user.role === 'volunteer') {
    const profile = await db.query(
      'SELECT * FROM volunteers WHERE user_id = $1',
      [userId]
    );
    user.profile = profile.rows[0] || null;
  }

  return user;
};

/**
 * Update user profile.
 */
const updateUser = async (userId, data) => {
  const fields = [];
  const params = [];

  if (data.full_name) {
    params.push(data.full_name);
    fields.push(`full_name = $${params.length}`);
  }

  if (data.phone !== undefined) {
    params.push(data.phone);
    fields.push(`phone = $${params.length}`);
  }

  if (data.avatar_url !== undefined) {
    params.push(data.avatar_url);
    fields.push(`avatar_url = $${params.length}`);
  }

  if (fields.length === 0) {
    const err = new Error('No fields to update.');
    err.statusCode = 400;
    throw err;
  }

  params.push(userId);
  const { rows } = await db.query(
    `UPDATE users SET ${fields.join(', ')} WHERE id = $${params.length}
     RETURNING id, email, role, full_name, phone, avatar_url, status`,
    params
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

/**
 * Update user status (admin action).
 */
const updateUserStatus = async (userId, status) => {
  const { rows } = await db.query(
    `UPDATE users SET status = $1 WHERE id = $2
     RETURNING id, email, role, full_name, status`,
    [status, userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
};
