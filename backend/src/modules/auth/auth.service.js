const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const config = require('../../config');
const db = require('../../config/db');

/**
 * Register a new user with role-specific profile.
 */
const register = async (data) => {
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Check if email already exists
    const existing = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [data.email]
    );
    if (existing.rows.length > 0) {
      const err = new Error('Email already registered.');
      err.statusCode = 409;
      throw err;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(data.password, salt);

    // Create user
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, status)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING id, email, role, full_name, status, created_at`,
      [data.email, password_hash, data.role, data.full_name, data.phone || null, 'active']
    );
    const user = userResult.rows[0];

    // Create role-specific profile
    if (data.role === 'provider') {
      await client.query(
        `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, operating_hours)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          user.id,
          data.business_name,
          data.business_type || null,
          data.address,
          data.latitude,
          data.longitude,
          data.operating_hours ? JSON.stringify(data.operating_hours) : null,
        ]
      );
    } else if (data.role === 'ngo') {
      await client.query(
        `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, food_preferences)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
        [
          user.id,
          data.organization_name,
          data.registration_no || null,
          data.address,
          data.latitude,
          data.longitude,
          data.capacity || null,
          data.food_preferences ? JSON.stringify(data.food_preferences) : null,
        ]
      );
    } else if (data.role === 'volunteer') {
      await client.query(
        `INSERT INTO volunteers (user_id, vehicle_type, max_distance_km)
         VALUES ($1, $2, $3)`,
        [
          user.id,
          data.vehicle_type || null,
          data.max_distance_km || 10,
        ]
      );
    }

    await client.query('COMMIT');

    // Generate tokens
    const tokens = await generateTokens(user);

    return { user, ...tokens };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Authenticate a user with email and password.
 */
const login = async ({ email, password }) => {
  
  const { rows } = await db.query(
    'SELECT id, email, password_hash, role, full_name, status FROM users WHERE email = $1',
    [email]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  if (user.status === 'blocked') {
    const err = new Error('Account is blocked. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  if (user.status === 'suspended') {
    const err = new Error('Account is suspended. Please contact support.');
    err.statusCode = 403;
    throw err;
  }

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // Strip password_hash from response
  delete user.password_hash;

  const tokens = await generateTokens(user);

  return { user, ...tokens };
};

/**
 * Refresh access token using a valid refresh token.
 */
const refreshAccessToken = async (refreshToken) => {
  // Hash the incoming token to compare with stored hash
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  const { rows } = await db.query(
    `SELECT rt.id, rt.user_id, rt.expires_at, rt.revoked,
            u.email, u.role, u.full_name, u.status
     FROM refresh_tokens rt
     JOIN users u ON u.id = rt.user_id
     WHERE rt.token_hash = $1`,
    [tokenHash]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid refresh token.');
    err.statusCode = 401;
    throw err;
  }

  const storedToken = rows[0];

  if (storedToken.revoked) {
    const err = new Error('Refresh token has been revoked.');
    err.statusCode = 401;
    throw err;
  }

  if (new Date(storedToken.expires_at) < new Date()) {
    const err = new Error('Refresh token has expired.');
    err.statusCode = 401;
    throw err;
  }

  if (storedToken.status === 'blocked' || storedToken.status === 'suspended') {
    const err = new Error(`Account is ${storedToken.status}.`);
    err.statusCode = 403;
    throw err;
  }

  // Revoke old refresh token (rotation)
  await db.query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE id = $1',
    [storedToken.id]
  );

  // Generate new tokens
  const user = {
    id: storedToken.user_id,
    email: storedToken.email,
    role: storedToken.role,
    full_name: storedToken.full_name,
  };

  const tokens = await generateTokens(user);

  return { user, ...tokens };
};

/**
 * Logout — revoke refresh token.
 */
const logout = async (refreshToken) => {
  const tokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  await db.query(
    'UPDATE refresh_tokens SET revoked = TRUE WHERE token_hash = $1',
    [tokenHash]
  );
};

/**
 * Generate access + refresh token pair.
 */
const generateTokens = async (user) => {
  // Access token (short-lived)
  const accessToken = jwt.sign(
    { id: user.id, email: user.email, role: user.role },
    config.jwt.secret,
    { expiresIn: config.jwt.accessExpiry }
  );

  // Refresh token (long-lived, random)
  const refreshToken = crypto.randomBytes(64).toString('hex');
  const refreshTokenHash = crypto
    .createHash('sha256')
    .update(refreshToken)
    .digest('hex');

  // Calculate expiry
  const refreshExpiryMs = parseExpiry(config.jwt.refreshExpiry);
  const expiresAt = new Date(Date.now() + refreshExpiryMs);

  // Store hashed refresh token
  await db.query(
    `INSERT INTO refresh_tokens (user_id, token_hash, expires_at)
     VALUES ($1, $2, $3)`,
    [user.id, refreshTokenHash, expiresAt]
  );

  return { accessToken, refreshToken };
};

/**
 * Parse expiry string like '7d', '15m', '1h' into milliseconds.
 */
const parseExpiry = (expiry) => {
  const match = expiry.match(/^(\d+)([smhd])$/);
  if (!match) return 7 * 24 * 60 * 60 * 1000; // default 7 days

  const value = parseInt(match[1], 10);
  const unit = match[2];

  switch (unit) {
    case 's': return value * 1000;
    case 'm': return value * 60 * 1000;
    case 'h': return value * 60 * 60 * 1000;
    case 'd': return value * 24 * 60 * 60 * 1000;
    default:  return 7 * 24 * 60 * 60 * 1000;
  }
};

module.exports = {
  register,
  login,
  refreshAccessToken,
  logout,
};
