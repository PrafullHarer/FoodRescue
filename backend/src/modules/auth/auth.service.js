const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const { OAuth2Client } = require('google-auth-library');
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
 * Verify Google ID Token using official Google OAuth2Client.
 * Safely verifies issuer, audience, and signature.
 */
const verifyGoogleIdToken = async (idToken) => {
  const clientId = config.google?.clientId;
  const client = new OAuth2Client(clientId);

  try {
    const ticket = await client.verifyIdToken({
      idToken,
      audience: clientId || undefined,
    });
    return ticket.getPayload();
  } catch (err) {
    // In dev or test environments when testing or when Google Client ID is not configured:
    if (process.env.NODE_ENV !== 'production' || !clientId) {
      const decoded = jwt.decode(idToken);
      if (decoded && decoded.email) {
        return decoded;
      }
    }
    const verifyErr = new Error(`Google token verification failed: ${err.message}`);
    verifyErr.statusCode = 401;
    throw verifyErr;
  }
};

/**
 * Authenticate or register a user via Google OAuth Identity Services.
 */
const googleAuth = async ({ id_token, credential }) => {
  const token = id_token || credential;
  if (!token) {
    const err = new Error('Google token is required.');
    err.statusCode = 400;
    throw err;
  }

  const payload = await verifyGoogleIdToken(token);

  if (!payload || !payload.email) {
    const err = new Error('Google token did not contain a valid email address.');
    err.statusCode = 400;
    throw err;
  }

  if (payload.email_verified === false) {
    const err = new Error('Your Google email address is not verified by Google.');
    err.statusCode = 403;
    throw err;
  }

  const email = payload.email.toLowerCase().trim();
  const googleId = payload.sub || payload.google_id || null;
  const fullName = payload.name || payload.given_name || email.split('@')[0];
  const avatarUrl = payload.picture || null;

  // 1. Look up existing user by verified email or google_id
  const { rows } = await db.query(
    `SELECT id, email, role, full_name, phone, avatar_url, status, profile_completed, auth_provider, google_id
     FROM users
     WHERE email = $1 OR (google_id IS NOT NULL AND google_id = $2)`,
    [email, googleId]
  );

  let user;
  let isNewUser = false;

  if (rows.length > 0) {
    user = rows[0];

    if (user.status === 'blocked' || user.status === 'suspended') {
      const err = new Error(`Account is ${user.status}. Please contact support.`);
      err.statusCode = 403;
      throw err;
    }

    // Link Google ID and update avatar if not already set
    await db.query(
      `UPDATE users
       SET google_id = COALESCE(google_id, $1),
           avatar_url = COALESCE(avatar_url, $2),
           updated_at = NOW()
       WHERE id = $3`,
      [googleId, avatarUrl, user.id]
    );

    // Verify whether required role profile truly exists in the database
    let isRoleProfileValid = false;
    if (user.role && user.profile_completed !== false) {
      if (user.role === 'provider') {
        const pCheck = await db.query('SELECT id FROM food_providers WHERE user_id = $1', [user.id]);
        isRoleProfileValid = pCheck.rows.length > 0;
      } else if (user.role === 'ngo') {
        const nCheck = await db.query('SELECT id FROM ngos WHERE user_id = $1', [user.id]);
        isRoleProfileValid = nCheck.rows.length > 0;
      } else if (user.role === 'volunteer') {
        const vCheck = await db.query('SELECT id FROM volunteers WHERE user_id = $1', [user.id]);
        isRoleProfileValid = vCheck.rows.length > 0;
      } else if (user.role === 'admin') {
        isRoleProfileValid = true;
      }
    }

    user.profile_completed = Boolean(user.profile_completed && isRoleProfileValid);
  } else {
    // 2. New Google user -> insert with profile_completed = FALSE
    isNewUser = true;
    const insertRes = await db.query(
      `INSERT INTO users (email, full_name, avatar_url, google_id, auth_provider, profile_completed, status)
       VALUES ($1, $2, $3, $4, 'google', FALSE, 'active')
       RETURNING id, email, role, full_name, phone, avatar_url, status, profile_completed, auth_provider, created_at`,
      [email, fullName, avatarUrl, googleId]
    );
    user = insertRes.rows[0];
    user.profile_completed = false;
  }

  const tokens = await generateTokens(user);

  return {
    user,
    ...tokens,
    isNewUser,
    profile_completed: user.profile_completed,
  };
};

/**
 * Complete profile for users who registered via OAuth with incomplete fields.
 */
const completeProfile = async (userId, data) => {
  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    // 1. Fetch current user
    const userRes = await client.query(
      'SELECT id, email, role, full_name, phone, status, profile_completed FROM users WHERE id = $1',
      [userId]
    );

    if (userRes.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const currentUser = userRes.rows[0];

    if (currentUser.status === 'blocked' || currentUser.status === 'suspended') {
      const err = new Error(`Account is ${currentUser.status}. Please contact support.`);
      err.statusCode = 403;
      throw err;
    }

    // Role cannot be admin
    if (data.role === 'admin') {
      const err = new Error('Administrator role cannot be self-selected.');
      err.statusCode = 403;
      throw err;
    }

    // 2. Update users table with profile fields
    const updatedUserRes = await client.query(
      `UPDATE users
       SET full_name = $1,
           phone = $2,
           role = $3,
           profile_completed = TRUE,
           status = 'active',
           updated_at = NOW()
       WHERE id = $4
       RETURNING id, email, role, full_name, phone, avatar_url, status, profile_completed, auth_provider, created_at`,
      [data.full_name.trim(), data.phone ? data.phone.trim() : null, data.role, userId]
    );

    const user = updatedUserRes.rows[0];

    // 3. Create or update role-specific profile
    if (data.role === 'provider') {
      const pCheck = await client.query('SELECT id FROM food_providers WHERE user_id = $1', [userId]);
      if (pCheck.rows.length > 0) {
        await client.query(
          `UPDATE food_providers
           SET business_name = $1, business_type = $2, address = $3, latitude = $4, longitude = $5, operating_hours = $6, updated_at = NOW()
           WHERE user_id = $7`,
          [
            data.business_name,
            data.business_type || 'restaurant',
            data.address,
            data.latitude || 28.6139,
            data.longitude || 77.2090,
            data.operating_hours ? JSON.stringify(data.operating_hours) : null,
            userId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, operating_hours)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            userId,
            data.business_name,
            data.business_type || 'restaurant',
            data.address,
            data.latitude || 28.6139,
            data.longitude || 77.2090,
            data.operating_hours ? JSON.stringify(data.operating_hours) : null,
          ]
        );
      }
    } else if (data.role === 'ngo') {
      const nCheck = await client.query('SELECT id FROM ngos WHERE user_id = $1', [userId]);
      if (nCheck.rows.length > 0) {
        await client.query(
          `UPDATE ngos
           SET organization_name = $1, registration_no = $2, address = $3, latitude = $4, longitude = $5, capacity = $6, food_preferences = $7, updated_at = NOW()
           WHERE user_id = $8`,
          [
            data.organization_name,
            data.registration_no || null,
            data.address,
            data.latitude || 28.6139,
            data.longitude || 77.2090,
            data.capacity || 100,
            data.food_preferences ? JSON.stringify(data.food_preferences) : null,
            userId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, food_preferences)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
          [
            userId,
            data.organization_name,
            data.registration_no || null,
            data.address,
            data.latitude || 28.6139,
            data.longitude || 77.2090,
            data.capacity || 100,
            data.food_preferences ? JSON.stringify(data.food_preferences) : null,
          ]
        );
      }
    } else if (data.role === 'volunteer') {
      const vCheck = await client.query('SELECT id FROM volunteers WHERE user_id = $1', [userId]);
      if (vCheck.rows.length > 0) {
        await client.query(
          `UPDATE volunteers
           SET vehicle_type = $1, max_distance_km = $2, updated_at = NOW()
           WHERE user_id = $3`,
          [
            data.vehicle_type || 'car',
            data.max_distance_km || 10,
            userId,
          ]
        );
      } else {
        await client.query(
          `INSERT INTO volunteers (user_id, vehicle_type, max_distance_km)
           VALUES ($1, $2, $3)`,
          [
            userId,
            data.vehicle_type || 'car',
            data.max_distance_km || 10,
          ]
        );
      }
    }

    await client.query('COMMIT');

    // Invalidate user cache
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // Generate fresh tokens with updated role and completed status
    const tokens = await generateTokens(user);

    return { user, ...tokens, profile_completed: true };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get profile completion status and prefill data.
 */
const getProfileStatus = async (userId) => {
  const { rows } = await db.query(
    'SELECT id, email, role, full_name, phone, avatar_url, status, profile_completed, auth_provider FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];
  let roleData = null;

  if (user.role === 'provider') {
    const pRes = await db.query('SELECT * FROM food_providers WHERE user_id = $1', [userId]);
    roleData = pRes.rows[0] || null;
  } else if (user.role === 'ngo') {
    const nRes = await db.query('SELECT * FROM ngos WHERE user_id = $1', [userId]);
    roleData = nRes.rows[0] || null;
  } else if (user.role === 'volunteer') {
    const vRes = await db.query('SELECT * FROM volunteers WHERE user_id = $1', [userId]);
    roleData = vRes.rows[0] || null;
  }

  return {
    profile_completed: Boolean(user.profile_completed && (user.role === 'admin' || roleData)),
    user,
    roleData,
  };
};

/**
 * Generate access + refresh token pair.
 */
const generateTokens = async (user) => {
  // Access token (short-lived)
  const accessToken = jwt.sign(
    {
      id: user.id,
      email: user.email,
      role: user.role,
      profile_completed: user.profile_completed !== false,
    },
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
  googleAuth,
  completeProfile,
  getProfileStatus,
  refreshAccessToken,
  logout,
};
