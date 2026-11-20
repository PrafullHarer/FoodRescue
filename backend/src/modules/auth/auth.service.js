const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const { OAuth2Client } = require('google-auth-library');
const config = require('../../config');
const db = require('../../config/db');

/**
 * Mask an email address for privacy (e.g. p***r@foodrescue.org).
 */
const maskEmail = (email) => {
  if (!email || !email.includes('@')) return email || '';
  const [local, domain] = email.split('@');
  if (local.length <= 2) {
    return `${local[0]}*@${domain}`;
  }
  return `${local[0]}${'*'.repeat(Math.min(local.length - 2, 4))}${local[local.length - 1]}@${domain}`;
};

/**
 * Dispatch recovery verification code email via SMTP or simulated console.
 */
const sendPasswordResetEmail = async (toEmail, fullName, otpCode) => {
  if (!config.smtp?.host || !config.smtp?.user) {
    console.log(`[AUTH] 🔑 (Simulated Email) Password recovery code for ${toEmail}: ${otpCode}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    const mailOptions = {
      from: config.smtp.from || 'FoodRescue Security <no-reply@foodrescue.org>',
      to: toEmail,
      subject: `FoodRescue Password Recovery Code: ${otpCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #111827;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #10b981; font-size: 24px; font-weight: 800; margin: 0;">FoodRescue</h1>
            <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Account Security & Recovery</p>
          </div>
          <p style="font-size: 15px; margin-bottom: 16px;">Hello <strong>${fullName || 'FoodRescue Member'}</strong>,</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; margin-bottom: 20px;">
            We received a request to reset your password. Use the verification code below to verify your identity and set a new password:
          </p>
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; letter-spacing: 6px;">
            <span style="font-size: 32px; font-weight: 800; font-family: monospace; color: #111827;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 16px;">
            This code will expire in <strong>15 minutes</strong>. If you did not request a password reset, you can safely ignore this email; your account remains secure.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
            FoodRescue Platform • Reducing Waste, Feeding Communities
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[AUTH] 📧 Sent password reset email to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn(`[AUTH] ⚠️ Failed to send reset email via SMTP (${err.message}). Code: ${otpCode}`);
    return false;
  }
};

/**
 * Dispatch email verification OTP via SMTP or simulated console.
 */
const sendEmailVerificationEmail = async (toEmail, otpCode) => {
  if (!config.smtp?.host || !config.smtp?.user) {
    console.log(`[AUTH] ✉️ (Simulated Email) Email verification code for ${toEmail}: ${otpCode}`);
    return false;
  }

  try {
    const transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });

    const mailOptions = {
      from: config.smtp.from || 'FoodRescue Verification <no-reply@foodrescue.org>',
      to: toEmail,
      subject: `FoodRescue Email Verification Code: ${otpCode}`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; border: 1px solid #e5e7eb; border-radius: 16px; background-color: #ffffff; color: #111827;">
          <div style="text-align: center; margin-bottom: 24px;">
            <h1 style="color: #10b981; font-size: 24px; font-weight: 800; margin: 0;">FoodRescue</h1>
            <p style="color: #6b7280; font-size: 13px; margin-top: 4px;">Account Email Verification</p>
          </div>
          <p style="font-size: 15px; margin-bottom: 16px;">Hello,</p>
          <p style="font-size: 14px; color: #374151; line-height: 1.5; margin-bottom: 20px;">
            Thank you for registering on FoodRescue! Use the 6-digit verification code below to verify your email address:
          </p>
          <div style="background-color: #f3f4f6; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px; letter-spacing: 6px;">
            <span style="font-size: 32px; font-weight: 800; font-family: monospace; color: #111827;">${otpCode}</span>
          </div>
          <p style="font-size: 12px; color: #6b7280; line-height: 1.5; margin-bottom: 16px;">
            This verification code will expire in <strong>10 minutes</strong>. If you did not create a FoodRescue account, please ignore this email.
          </p>
          <hr style="border: 0; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="font-size: 11px; color: #9ca3af; text-align: center; margin: 0;">
            FoodRescue Platform • Reducing Food Waste, Feeding Communities
          </p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`[AUTH] 📧 Sent verification OTP email to ${toEmail}`);
    return true;
  } catch (err) {
    console.warn(`[AUTH] ⚠️ Failed to send verification email via SMTP (${err.message}). Code: ${otpCode}`);
    return false;
  }
};

/**
 * Unique user_code prefixes based on role:
 * - provider  -> PRO (e.g. PRO-849201)
 * - ngo       -> NGO (e.g. NGO-381940)
 * - volunteer -> VOL (e.g. VOL-518293)
 * - admin     -> ADM (e.g. ADM-102948)
 * - fallback  -> USR (e.g. USR-629184)
 */
const ROLE_PREFIX_MAP = {
  provider: 'PRO',
  ngo: 'NGO',
  volunteer: 'VOL',
  admin: 'ADM',
};

const getRolePrefix = (role) => {
  if (!role) return 'USR';
  return ROLE_PREFIX_MAP[role.toLowerCase()] || 'USR';
};

const generateUserCode = async (role, dbClient = db) => {
  const prefix = getRolePrefix(role);
  let isUnique = false;
  let code = '';
  let attempts = 0;

  while (!isUnique && attempts < 30) {
    attempts++;
    const randomNum = Math.floor(100000 + Math.random() * 900000);
    code = `${prefix}-${randomNum}`;

    const check = await dbClient.query('SELECT id FROM users WHERE user_code = $1', [code]);
    if (check.rows.length === 0) {
      isUnique = true;
    }
  }

  if (!isUnique) {
    code = `${prefix}-${Date.now().toString().slice(-6)}`;
  }

  return code;
};

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

    // Prevent admin self-registration
    if (data.role === 'admin') {
      const err = new Error('Administrator role cannot be self-registered.');
      err.statusCode = 403;
      throw err;
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    const password_hash = await bcrypt.hash(data.password, salt);

    // Generate unique user code with role prefix (e.g. PRO-849201, NGO-381940, VOL-518293)
    const user_code = await generateUserCode(data.role, client);

    // Check if email has been verified via OTP
    const verifiedCheck = await client.query(
      `SELECT id FROM email_verifications
       WHERE LOWER(email) = LOWER($1)
         AND verified_at IS NOT NULL
       LIMIT 1`,
      [data.email]
    );
    const email_verified = verifiedCheck.rows.length > 0;

    // Create user in PENDING verification status by default
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash, role, full_name, phone, status, verification_status, user_code, email_verified)
       VALUES ($1, $2, $3, $4, $5, 'pending', 'PENDING', $6, $7)
       RETURNING id, email, role, full_name, phone, status, verification_status, user_code, email_verified, created_at`,
      [data.email, password_hash, data.role, data.full_name, data.phone || null, user_code, email_verified]
    );
    const user = userResult.rows[0];

    // Create role-specific profile (is_verified = FALSE by default)
    if (data.role === 'provider') {
      await client.query(
        `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, operating_hours, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
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
        `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, food_preferences, is_verified)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
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

    // In-app notification for the newly registered user (after commit so foreign key constraint is satisfied)
    const notificationService = require('../notifications/notification.service');
    try {
      await notificationService.createNotification({
        userId: user.id,
        title: 'Registration Submitted',
        body: 'Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.',
        data: { type: 'registration_pending', role: user.role }
      });

      // Notify platform admins of new verification request
      const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'New Verification Request',
          body: `${user.full_name} (${data.role}) has registered and is pending approval.`,
          data: { userId: user.id, role: data.role, type: 'admin_verification_pending' }
        });
      }
    } catch (notifErr) {
      console.warn('Notification warning on registration:', notifErr.message);
    }

    // Return pending verification state without active dashboard login tokens
    return {
      user,
      requires_verification: true,
      verification_status: 'PENDING',
      message: 'Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.'
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Authenticate a user with email or unique user_code, and password.
 */
const login = async ({ email, identifier, password }) => {
  const loginIdentifier = (email || identifier || '').trim();

  const { rows } = await db.query(
    `SELECT id, email, password_hash, role, full_name, address, latitude, longitude, status, verification_status, rejection_reason, user_code
     FROM users
     WHERE LOWER(email) = LOWER($1)
        OR UPPER(user_code) = UPPER($1)
        OR REPLACE(UPPER(user_code), '-', '') = REPLACE(UPPER($1), '-', '')`,
    [loginIdentifier]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid email, user ID, or password.');
    err.statusCode = 401;
    throw err;
  }

  const user = rows[0];

  const isMatch = await bcrypt.compare(password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Invalid email or password.');
    err.statusCode = 401;
    throw err;
  }

  // Admins can log in directly
  if (user.role !== 'admin') {
    if (user.verification_status === 'PENDING' || user.status === 'pending') {
      const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_PENDING_VERIFICATION';
      err.details = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        verification_status: 'PENDING',
      };
      throw err;
    }

    if (user.verification_status === 'REJECTED' || user.status === 'blocked') {
      const err = new Error(
        user.rejection_reason
          ? `Your FoodRescue registration could not be approved. Reason: ${user.rejection_reason}`
          : 'Your FoodRescue registration could not be approved. Please review the reason provided by the administrator.'
      );
      err.statusCode = 403;
      err.code = 'ACCOUNT_REJECTED';
      err.details = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        verification_status: 'REJECTED',
        rejection_reason: user.rejection_reason,
      };
      throw err;
    }

    if (user.verification_status === 'SUSPENDED' || user.status === 'suspended') {
      const err = new Error('Your account has been suspended. Please contact support.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_SUSPENDED';
      err.details = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        verification_status: 'SUSPENDED',
      };
      throw err;
    }

    if (user.verification_status !== 'APPROVED') {
      const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_PENDING_VERIFICATION';
      err.details = {
        email: user.email,
        full_name: user.full_name,
        role: user.role,
        verification_status: user.verification_status || 'PENDING',
      };
      throw err;
    }
  }

  // Strip password_hash from response
  delete user.password_hash;

  if (user.role === 'ngo') {
    const p = await db.query('SELECT * FROM ngos WHERE user_id = $1', [user.id]);
    user.profile = p.rows[0] || null;
    if (user.profile?.address && !user.address) user.address = user.profile.address;
    if (user.profile?.latitude && user.latitude == null) user.latitude = user.profile.latitude;
    if (user.profile?.longitude && user.longitude == null) user.longitude = user.profile.longitude;
  } else if (user.role === 'provider') {
    const p = await db.query('SELECT * FROM food_providers WHERE user_id = $1', [user.id]);
    user.profile = p.rows[0] || null;
    if (user.profile?.address && !user.address) user.address = user.profile.address;
    if (user.profile?.latitude && user.latitude == null) user.latitude = user.profile.latitude;
    if (user.profile?.longitude && user.longitude == null) user.longitude = user.profile.longitude;
  } else if (user.role === 'volunteer') {
    const p = await db.query('SELECT * FROM volunteers WHERE user_id = $1', [user.id]);
    user.profile = p.rows[0] || null;
    if (user.profile?.address && !user.address) user.address = user.profile.address;
    if (user.profile?.latitude && user.latitude == null) user.latitude = user.profile.latitude;
    if (user.profile?.longitude && user.longitude == null) user.longitude = user.profile.longitude;
  }

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
            u.email, u.role, u.full_name, u.status, u.verification_status, u.rejection_reason, u.user_code
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

  if (storedToken.role !== 'admin') {
    if (storedToken.verification_status === 'PENDING' || storedToken.status === 'pending') {
      const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_PENDING_VERIFICATION';
      throw err;
    }

    if (storedToken.verification_status === 'REJECTED' || storedToken.status === 'blocked') {
      const err = new Error(
        storedToken.rejection_reason
          ? `Your FoodRescue registration could not be approved. Reason: ${storedToken.rejection_reason}`
          : 'Your FoodRescue registration could not be approved. Please review the reason provided by the administrator.'
      );
      err.statusCode = 403;
      err.code = 'ACCOUNT_REJECTED';
      throw err;
    }

    if (storedToken.verification_status === 'SUSPENDED' || storedToken.status === 'suspended') {
      const err = new Error('Your account has been suspended. Please contact support.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_SUSPENDED';
      throw err;
    }

    if (storedToken.verification_status !== 'APPROVED') {
      const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
      err.statusCode = 403;
      err.code = 'ACCOUNT_PENDING_VERIFICATION';
      throw err;
    }
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
    `SELECT id, email, role, full_name, phone, avatar_url, status, verification_status, rejection_reason, profile_completed, auth_provider, google_id, user_code
     FROM users
     WHERE email = $1 OR (google_id IS NOT NULL AND google_id = $2)`,
    [email, googleId]
  );

  let user;
  let isNewUser = false;

  if (rows.length > 0) {
    user = rows[0];

    // Check account status if profile is already completed
    if (user.profile_completed !== false && user.role !== 'admin') {
      if (user.verification_status === 'PENDING' || user.status === 'pending') {
        const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
        err.statusCode = 403;
        err.code = 'ACCOUNT_PENDING_VERIFICATION';
        err.details = {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          verification_status: 'PENDING',
        };
        throw err;
      }

      if (user.verification_status === 'REJECTED' || user.status === 'blocked') {
        const err = new Error(
          user.rejection_reason
            ? `Your FoodRescue registration could not be approved. Reason: ${user.rejection_reason}`
            : 'Your FoodRescue registration could not be approved. Please review the reason provided by the administrator.'
        );
        err.statusCode = 403;
        err.code = 'ACCOUNT_REJECTED';
        err.details = {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          verification_status: 'REJECTED',
          rejection_reason: user.rejection_reason,
        };
        throw err;
      }

      if (user.verification_status === 'SUSPENDED' || user.status === 'suspended') {
        const err = new Error('Your account has been suspended. Please contact support.');
        err.statusCode = 403;
        err.code = 'ACCOUNT_SUSPENDED';
        err.details = {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          verification_status: 'SUSPENDED',
        };
        throw err;
      }

      if (user.verification_status !== 'APPROVED') {
        const err = new Error('Your account is awaiting admin verification. You will be notified once approved.');
        err.statusCode = 403;
        err.code = 'ACCOUNT_PENDING_VERIFICATION';
        err.details = {
          email: user.email,
          full_name: user.full_name,
          role: user.role,
          verification_status: user.verification_status || 'PENDING',
        };
        throw err;
      }
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
    // 2. New Google user -> insert with profile_completed = FALSE and PENDING status
    isNewUser = true;
    const user_code = await generateUserCode(null, db);
    const insertRes = await db.query(
      `INSERT INTO users (email, full_name, avatar_url, google_id, auth_provider, profile_completed, status, verification_status, user_code)
       VALUES ($1, $2, $3, $4, 'google', FALSE, 'pending', 'PENDING', $5)
       RETURNING id, email, role, full_name, phone, avatar_url, status, verification_status, profile_completed, auth_provider, user_code, created_at`,
      [email, fullName, avatarUrl, googleId, user_code]
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

    // 2. Generate role-specific user_code (e.g. PRO-849201, NGO-381940, VOL-518293)
    const user_code = await generateUserCode(data.role, client);

    // Update users table with profile fields, keep PENDING until admin approves
    const updatedUserRes = await client.query(
      `UPDATE users
       SET full_name = $1,
           phone = $2,
           role = $3,
           profile_completed = TRUE,
           status = 'pending',
           verification_status = 'PENDING',
           user_code = $4,
           updated_at = NOW()
       WHERE id = $5
       RETURNING id, email, role, full_name, phone, avatar_url, status, verification_status, profile_completed, auth_provider, user_code, created_at`,
      [data.full_name.trim(), data.phone ? data.phone.trim() : null, data.role, user_code, userId]
    );

    const user = updatedUserRes.rows[0];

    // 3. Create or update role-specific profile (is_verified = FALSE)
    if (data.role === 'provider') {
      const pCheck = await client.query('SELECT id FROM food_providers WHERE user_id = $1', [userId]);
      if (pCheck.rows.length > 0) {
        await client.query(
          `UPDATE food_providers
           SET business_name = $1, business_type = $2, address = $3, latitude = $4, longitude = $5, operating_hours = $6, is_verified = FALSE, updated_at = NOW()
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
          `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, operating_hours, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, FALSE)`,
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
           SET organization_name = $1, registration_no = $2, address = $3, latitude = $4, longitude = $5, capacity = $6, food_preferences = $7, is_verified = FALSE, updated_at = NOW()
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
          `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, food_preferences, is_verified)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, FALSE)`,
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

    // Invalidate any refresh tokens for this user so they cannot use existing session
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

    await client.query('COMMIT');

    // In-app notifications (after commit so foreign key constraint is satisfied)
    const notificationService = require('../notifications/notification.service');
    try {
      await notificationService.createNotification({
        userId: user.id,
        title: 'Registration Submitted',
        body: 'Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.',
        data: { type: 'registration_pending', role: user.role }
      });

      const admins = await db.query("SELECT id FROM users WHERE role = 'admin'");
      for (const admin of admins.rows) {
        await notificationService.createNotification({
          userId: admin.id,
          title: 'New Verification Request',
          body: `${user.full_name} (${data.role}) has submitted their profile and is pending approval.`,
          data: { userId: user.id, role: data.role, type: 'admin_verification_pending' }
        });
      }
    } catch (notifErr) {
      console.warn('Notification error on completeProfile:', notifErr.message);
    }

    // Invalidate user cache
    const authenticate = require('../../middleware/auth');
    if (authenticate.invalidateUserCache) {
      authenticate.invalidateUserCache(userId);
    }

    // Return pending verification state without active dashboard login tokens
    return {
      user,
      requires_verification: true,
      verification_status: 'PENDING',
      message: 'Your FoodRescue account has been created successfully. Your account is currently awaiting admin verification. You will receive a notification once your application is reviewed.',
      profile_completed: true,
    };
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
    'SELECT id, email, role, full_name, phone, avatar_url, status, verification_status, rejection_reason, info_requested_notes, profile_completed, auth_provider, user_code FROM users WHERE id = $1',
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
      user_code: user.user_code,
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

/**
 * Public/Safe endpoint to fetch latest account verification status.
 * Used by /verification-pending waiting page to check current approval status without logging in.
 */
const getVerificationStatus = async (identifier) => {
  if (!identifier || typeof identifier !== 'string') {
    const err = new Error('Email address or User ID is required to check approval status.');
    err.statusCode = 400;
    throw err;
  }

  const cleanId = identifier.trim();
  const { rows } = await db.query(
    `SELECT id, email, full_name, role, status, verification_status, rejection_reason, info_requested_notes, user_code, created_at, approved_at
     FROM users
     WHERE LOWER(email) = LOWER($1)
        OR UPPER(user_code) = UPPER($1)
        OR REPLACE(UPPER(user_code), '-', '') = REPLACE(UPPER($1), '-', '')`,
    [cleanId]
  );

  if (rows.length === 0) {
    const err = new Error('No FoodRescue account found with this email or User ID.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  let organizationName = null;
  if (user.role === 'provider') {
    const p = await db.query('SELECT business_name FROM food_providers WHERE user_id = $1', [user.id]);
    organizationName = p.rows[0]?.business_name || null;
  } else if (user.role === 'ngo') {
    const n = await db.query('SELECT organization_name FROM ngos WHERE user_id = $1', [user.id]);
    organizationName = n.rows[0]?.organization_name || null;
  }

  return {
    email: user.email,
    full_name: user.full_name,
    role: user.role,
    user_code: user.user_code,
    organization_name: organizationName,
    verification_status: user.verification_status || 'PENDING',
    status: user.status,
    rejection_reason: user.verification_status === 'REJECTED' ? user.rejection_reason : null,
    info_requested_notes: user.info_requested_notes || null,
    created_at: user.created_at,
    approved_at: user.approved_at,
  };
};

/**
 * Request password reset OTP via email or user_code.
 */
const forgotPassword = async ({ email, identifier }) => {
  const loginIdentifier = (email || identifier || '').trim();

  const { rows } = await db.query(
    `SELECT id, email, full_name, user_code, role
     FROM users
     WHERE LOWER(email) = LOWER($1)
        OR UPPER(user_code) = UPPER($1)
        OR REPLACE(UPPER(user_code), '-', '') = REPLACE(UPPER($1), '-', '')`,
    [loginIdentifier]
  );

  // If user not found, respond with generic message for privacy/security
  if (rows.length === 0) {
    return {
      success: true,
      message: 'If an account exists with this email or User ID, a 6-digit recovery code has been sent.',
    };
  }

  const user = rows[0];

  // Super Administrator accounts cannot use self-service password recovery
  if (user.role === 'admin') {
    const err = new Error('Self-service password recovery is disabled for Super Administrator accounts. Administrative credentials must be managed via direct system infrastructure.');
    err.statusCode = 403;
    throw err;
  }
  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);

  // Invalidate any existing unused tokens for this user
  await db.query(
    'UPDATE password_resets SET used = TRUE WHERE user_id = $1 AND used = FALSE',
    [user.id]
  );

  // Insert 15-minute OTP record
  await db.query(
    `INSERT INTO password_resets (user_id, otp_hash, expires_at)
     VALUES ($1, $2, NOW() + INTERVAL '15 minutes')`,
    [user.id, otpHash]
  );

  await sendPasswordResetEmail(user.email, user.full_name, otp);

  const masked = maskEmail(user.email);
  return {
    success: true,
    message: `A 6-digit recovery code has been sent to ${masked}.`,
    email: user.email,
    email_masked: masked,
    user_code: user.user_code,
  };
};

/**
 * Reset password using OTP code.
 */
const resetPassword = async ({ email, identifier, otp, new_password }) => {
  const loginIdentifier = (email || identifier || '').trim();

  const { rows: userRows } = await db.query(
    `SELECT id, email, full_name, user_code, role
     FROM users
     WHERE LOWER(email) = LOWER($1)
        OR UPPER(user_code) = UPPER($1)
        OR REPLACE(UPPER(user_code), '-', '') = REPLACE(UPPER($1), '-', '')`,
    [loginIdentifier]
  );

  if (userRows.length === 0) {
    const err = new Error('No user account found matching this identifier.');
    err.statusCode = 404;
    throw err;
  }

  const user = userRows[0];

  // Super Administrator accounts cannot use self-service password recovery
  if (user.role === 'admin') {
    const err = new Error('Password reset is disabled for Super Administrator accounts.');
    err.statusCode = 403;
    throw err;
  }

  // Retrieve active, unexpired reset record
  const { rows: resetRows } = await db.query(
    `SELECT id, otp_hash, expires_at
     FROM password_resets
     WHERE user_id = $1 AND used = FALSE AND expires_at > NOW()
     ORDER BY created_at DESC
     LIMIT 1`,
    [user.id]
  );

  if (resetRows.length === 0) {
    const err = new Error('Password reset code has expired or was already used. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  const resetRecord = resetRows[0];
  const isMatch = await bcrypt.compare(otp.trim(), resetRecord.otp_hash);
  if (!isMatch) {
    const err = new Error('Invalid verification code. Please check the 6-digit code sent to your email.');
    err.statusCode = 400;
    throw err;
  }

  // Hash new password
  const salt = await bcrypt.genSalt(12);
  const passwordHash = await bcrypt.hash(new_password, salt);

  // Update password in users table
  await db.query(
    'UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2',
    [passwordHash, user.id]
  );

  // Mark token as used
  await db.query('UPDATE password_resets SET used = TRUE WHERE id = $1', [resetRecord.id]);

  // Invalidate previous refresh tokens
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [user.id]);

  // Invalidate cache
  const authenticate = require('../../middleware/auth');
  if (authenticate?.invalidateUserCache) {
    authenticate.invalidateUserCache(user.id);
  }

  return {
    success: true,
    message: 'Your password has been reset successfully. You can now log in with your new password.',
  };
};

/**
 * Change / set user password with current password verification
 */
const changePassword = async ({ userId, current_password, new_password }) => {
  const { rows } = await db.query(
    'SELECT id, password_hash FROM users WHERE id = $1',
    [userId]
  );

  if (rows.length === 0) {
    const err = new Error('User not found.');
    err.statusCode = 404;
    throw err;
  }

  const user = rows[0];

  if (!user.password_hash) {
    const err = new Error('This account was created via social login without a password. Please use Forgot Password to set a password.');
    err.statusCode = 400;
    throw err;
  }

  const isMatch = await bcrypt.compare(current_password, user.password_hash);
  if (!isMatch) {
    const err = new Error('Current password is incorrect.');
    err.statusCode = 400;
    throw err;
  }

  const salt = await bcrypt.genSalt(12);
  const newHash = await bcrypt.hash(new_password, salt);

  await db.query('UPDATE users SET password_hash = $1, updated_at = NOW() WHERE id = $2', [newHash, userId]);

  // Invalidate other refresh tokens
  await db.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);

  const authenticate = require('../../middleware/auth');
  if (authenticate?.invalidateUserCache) {
    authenticate.invalidateUserCache(userId);
  }

  return { success: true, message: 'Password updated successfully.' };
};

/**
 * Send email verification OTP code
 */
const sendEmailOtp = async ({ email }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail) {
    const err = new Error('Email address is required.');
    err.statusCode = 400;
    throw err;
  }

  // Check if email is already in use by an existing user
  const existing = await db.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );
  if (existing.rows.length > 0) {
    const err = new Error('This email is already registered. Please sign in or use another email.');
    err.statusCode = 409;
    err.code = 'EMAIL_ALREADY_REGISTERED';
    throw err;
  }

  // Generate 6-digit numeric OTP
  const otp = String(crypto.randomInt(100000, 999999));
  const otpHash = await bcrypt.hash(otp, 10);
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

  // Invalidate any previous unverified OTPs for this email
  await db.query(
    `UPDATE email_verifications SET expires_at = NOW() WHERE LOWER(email) = LOWER($1) AND verified_at IS NULL`,
    [normalizedEmail]
  );

  // Insert new verification record
  await db.query(
    `INSERT INTO email_verifications (email, otp_hash, expires_at) VALUES ($1, $2, $3)`,
    [normalizedEmail, otpHash, expiresAt]
  );

  // Send branded verification email via SMTP or simulated console
  await sendEmailVerificationEmail(normalizedEmail, otp);

  return {
    success: true,
    message: `Verification code sent to ${maskEmail(normalizedEmail)}!`,
    email: normalizedEmail,
    expires_in: 600,
  };
};

/**
 * Verify 6-digit OTP code for email
 */
const verifyEmailOtp = async ({ email, otp }) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  const cleanOtp = (otp || '').trim();

  if (!normalizedEmail || !cleanOtp) {
    const err = new Error('Email address and verification code are required.');
    err.statusCode = 400;
    throw err;
  }

  // Find active, unexpired verification record
  const { rows } = await db.query(
    `SELECT id, otp_hash, expires_at, verified_at
     FROM email_verifications
     WHERE LOWER(email) = LOWER($1)
       AND expires_at > NOW()
       AND verified_at IS NULL
     ORDER BY created_at DESC
     LIMIT 1`,
    [normalizedEmail]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid or expired verification code. Please request a new code.');
    err.statusCode = 400;
    throw err;
  }

  const record = rows[0];
  const isMatch = await bcrypt.compare(cleanOtp, record.otp_hash);
  if (!isMatch) {
    const err = new Error('Incorrect verification code. Please check the 6 digits and try again.');
    err.statusCode = 400;
    throw err;
  }

  // Mark record as verified
  await db.query(
    `UPDATE email_verifications SET verified_at = NOW() WHERE id = $1`,
    [record.id]
  );

  // Sign verification token (valid for 30 minutes)
  const verificationToken = jwt.sign(
    { email: normalizedEmail, purpose: 'email_verification' },
    config.jwt.secret,
    { expiresIn: '30m' }
  );

  return {
    success: true,
    message: 'Email address verified successfully!',
    email: normalizedEmail,
    verification_token: verificationToken,
  };
};

/**
 * Check if an email is available for registration
 */
const checkEmailAvailability = async (email) => {
  const normalizedEmail = (email || '').trim().toLowerCase();
  if (!normalizedEmail || !normalizedEmail.includes('@')) {
    return { available: false, message: 'Valid email address is required.' };
  }

  const { rows } = await db.query(
    'SELECT id FROM users WHERE LOWER(email) = LOWER($1)',
    [normalizedEmail]
  );

  if (rows.length > 0) {
    return {
      available: false,
      isRegistered: true,
      message: 'This email is already registered. Please sign in or use another email.',
    };
  }

  return {
    available: true,
    isRegistered: false,
    message: 'Email is available.',
  };
};

module.exports = {
  register,
  login,
  googleAuth,
  completeProfile,
  getProfileStatus,
  getVerificationStatus,
  refreshAccessToken,
  logout,
  changePassword,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  checkEmailAvailability,
};
