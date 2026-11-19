const db = require('../../config/db');

/**
 * Get all users (with optional filtering).
 */
const getUsers = async ({ page = 1, limit = 20, role, status }) => {
  const offset = (page - 1) * limit;
  let query = 'SELECT id, email, role, full_name, phone, avatar_url, status, user_code, created_at FROM users';
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
    'SELECT id, email, role, full_name, phone, avatar_url, status, user_code, created_at',
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
    'SELECT id, email, role, full_name, phone, avatar_url, status, user_code, created_at FROM users WHERE id = $1',
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
     RETURNING id, email, role, full_name, phone, avatar_url, status, user_code`,
    params
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

const bcrypt = require('bcryptjs');
const authenticate = require('../../middleware/auth');

/**
 * Update user status (admin action).
 */
const updateUserStatus = async (userId, status) => {
  const { rows } = await db.query(
    `UPDATE users SET status = $1 WHERE id = $2
     RETURNING id, email, role, full_name, status, user_code`,
    [status, userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  // Invalidate cache immediately so blocked/suspended status takes effect
  if (authenticate?.invalidateUserCache) {
    authenticate.invalidateUserCache(userId);
  }

  return rows[0];
};

/**
 * Permanently delete a user account.
 * Accessible by the user themselves or an administrator.
 */
const deleteUser = async (userId, requestedByUser, { password, confirmation } = {}) => {
  // 1. Authorization check
  if (requestedByUser.role !== 'admin' && requestedByUser.id !== userId) {
    const err = new Error('Access denied. You can only delete your own account.');
    err.statusCode = 403;
    throw err;
  }

  // 2. Fetch target user
  const { rows } = await db.query(
    'SELECT id, email, role, full_name, password_hash, auth_provider FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const targetUser = rows[0];

  // 3. Super Administrator accounts cannot be deleted under any circumstance
  if (targetUser.role === 'admin') {
    const err = new Error('Super Administrator accounts are protected and cannot be deleted.');
    err.statusCode = 403;
    throw err;
  }

  // 4. Credential verification for self-deletion
  if (requestedByUser.role !== 'admin') {
    if (targetUser.password_hash) {
      if (!password) {
        const err = new Error('Please enter your current password to confirm account deletion.');
        err.statusCode = 400;
        throw err;
      }
      const isMatch = await bcrypt.compare(password, targetUser.password_hash);
      if (!isMatch) {
        const err = new Error('Incorrect password. Account deletion aborted.');
        err.statusCode = 401;
        throw err;
      }
    } else {
      // Social login user (Google without password)
      if (confirmation !== 'DELETE' && confirmation?.toLowerCase() !== targetUser.email.toLowerCase()) {
        const err = new Error('Please type DELETE to confirm deleting your account.');
        err.statusCode = 400;
        throw err;
      }
    }
  }

  // 4. Validate no active food rescues or deliveries are currently in-flight
  if (targetUser.role === 'provider') {
    const activeRes = await db.query(
      `SELECT COUNT(*) FROM food_donations fd
       JOIN food_providers fp ON fp.id = fd.provider_id
       WHERE fp.user_id = $1 AND fd.status IN ('matched', 'claimed', 'volunteer_assigned', 'collected', 'in_transit')`,
      [userId]
    );
    if (parseInt(activeRes.rows[0].count, 10) > 0) {
      const err = new Error('Cannot delete account while you have active food donations in progress. Please complete or cancel active listings first.');
      err.statusCode = 400;
      throw err;
    }
  } else if (targetUser.role === 'ngo') {
    const activeRes = await db.query(
      `SELECT COUNT(*) FROM donation_claims c
       JOIN ngos n ON n.id = c.ngo_id
       JOIN food_donations fd ON fd.id = c.donation_id
       WHERE n.user_id = $1 AND c.status = 'accepted' AND fd.status IN ('claimed', 'volunteer_assigned', 'collected', 'in_transit')`,
      [userId]
    );
    if (parseInt(activeRes.rows[0].count, 10) > 0) {
      const err = new Error('Cannot delete account while you have active food claims in progress.');
      err.statusCode = 400;
      throw err;
    }
  } else if (targetUser.role === 'volunteer') {
    const activeRes = await db.query(
      `SELECT COUNT(*) FROM deliveries d
       JOIN volunteers v ON v.id = d.volunteer_id
       WHERE v.user_id = $1 AND d.status IN ('volunteer_assigned', 'collected', 'in_transit')`,
      [userId]
    );
    if (parseInt(activeRes.rows[0].count, 10) > 0) {
      const err = new Error('Cannot delete account while you have an active delivery mission in progress.');
      err.statusCode = 400;
      throw err;
    }
  }

  // 5. Clean up non-cascading references and delete within transaction
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // Detach volunteer from past completed deliveries (foreign key doesn't cascade)
    await client.query(
      `UPDATE deliveries SET volunteer_id = NULL
       WHERE volunteer_id IN (SELECT id FROM volunteers WHERE user_id = $1)`,
      [userId]
    );

    // Detach scanned_by in qr_codes
    await client.query(
      'UPDATE qr_codes SET scanned_by = NULL WHERE scanned_by = $1',
      [userId]
    );

    // Clean up authentication tokens & notifications
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM password_resets WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM notifications WHERE user_id = $1', [userId]);

    // Delete user row (Postgres schema cascades to food_providers, ngos, volunteers, donations, claims, reviews)
    const delResult = await client.query(
      'DELETE FROM users WHERE id = $1 RETURNING id, email, full_name, role',
      [userId]
    );

    await client.query('COMMIT');

    // Invalidate auth memory cache
    if (authenticate?.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    return delResult.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
  deleteUser,
};
