const authService = require('./auth.service');
const config = require('../../config');

const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Set 7-day login cookies for web and mobile WebView persistence
 */
const setAuthCookies = (res, result) => {
  if (!result) return;
  const isProd = config.isProduction;

  const cookieOptions = {
    maxAge: SEVEN_DAYS_MS,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/',
  };

  if (result.accessToken) {
    // 7-day login cookie readable by browser/webview client
    res.cookie('foodrescue_token', result.accessToken, {
      ...cookieOptions,
      httpOnly: false,
    });
    res.cookie('foodrescue_session', 'active', {
      ...cookieOptions,
      httpOnly: false,
    });
    res.cookie('foodrescue_expires_at', String(Date.now() + SEVEN_DAYS_MS), {
      ...cookieOptions,
      httpOnly: false,
    });
  }

  if (result.refreshToken) {
    // 7-day refresh token cookie (HttpOnly for security)
    res.cookie('foodrescue_refresh', result.refreshToken, {
      ...cookieOptions,
      httpOnly: true,
    });
  }
};

/**
 * Clear 7-day login cookies on logout
 */
const clearAuthCookies = (res) => {
  const isProd = config.isProduction;
  const clearOpts = {
    path: '/',
    sameSite: isProd ? 'none' : 'lax',
    secure: isProd,
  };
  res.clearCookie('foodrescue_token', clearOpts);
  res.clearCookie('foodrescue_refresh', clearOpts);
  res.clearCookie('foodrescue_session', clearOpts);
  res.clearCookie('foodrescue_expires_at', clearOpts);
};

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);
    if (result?.accessToken) {
      setAuthCookies(res, result);
    }

    res.status(201).json({
      success: true,
      message: 'Registration successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/login
 */
const login = async (req, res, next) => {
  try {
    const result = await authService.login(req.body);
    setAuthCookies(res, result);

    res.status(200).json({
      success: true,
      message: 'Login successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/refresh
 */
const refreshToken = async (req, res, next) => {
  try {
    let rToken = req.body?.refresh_token;
    if (!rToken && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)foodrescue_refresh=([^;]+)/);
      if (match) rToken = decodeURIComponent(match[1]);
    }

    const result = await authService.refreshAccessToken(rToken);
    setAuthCookies(res, result);

    res.status(200).json({
      success: true,
      message: 'Token refreshed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/logout
 */
const logout = async (req, res, next) => {
  try {
    let rToken = req.body?.refresh_token;
    if (!rToken && req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)foodrescue_refresh=([^;]+)/);
      if (match) rToken = decodeURIComponent(match[1]);
    }

    if (rToken) {
      await authService.logout(rToken);
    }
    clearAuthCookies(res);

    res.status(200).json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/google
 */
const googleLogin = async (req, res, next) => {
  try {
    const result = await authService.googleAuth(req.body);
    if (result?.accessToken) {
      setAuthCookies(res, result);
    }

    res.status(200).json({
      success: true,
      message: 'Google authentication successful.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/complete-profile
 */
const completeProfile = async (req, res, next) => {
  try {
    const result = await authService.completeProfile(req.user.id, req.body);
    if (result?.accessToken) {
      setAuthCookies(res, result);
    }

    res.status(200).json({
      success: true,
      message: 'Profile completed successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/profile-status
 */
const getProfileStatus = async (req, res, next) => {
  try {
    const result = await authService.getProfileStatus(req.user.id);

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 */
const getMe = async (req, res, next) => {
  try {
    const db = require('../../config/db');

    const { rows } = await db.query(
      'SELECT id, email, role, full_name, phone, avatar_url, address, latitude, longitude, status, verification_status, rejection_reason, info_requested_notes, approved_at, rejected_at, profile_completed, auth_provider, user_code, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    const userData = rows[0];
    if (userData.role === 'provider') {
      const p = await db.query('SELECT * FROM food_providers WHERE user_id = $1', [userData.id]);
      userData.profile = p.rows[0] || null;
      if (userData.profile?.address) userData.address = userData.profile.address;
      if (userData.profile?.latitude) userData.latitude = userData.profile.latitude;
      if (userData.profile?.longitude) userData.longitude = userData.profile.longitude;
    } else if (userData.role === 'ngo') {
      const p = await db.query('SELECT * FROM ngos WHERE user_id = $1', [userData.id]);
      userData.profile = p.rows[0] || null;
      if (userData.profile?.address) userData.address = userData.profile.address;
      if (userData.profile?.latitude) userData.latitude = userData.profile.latitude;
      if (userData.profile?.longitude) userData.longitude = userData.profile.longitude;
    } else if (userData.role === 'volunteer') {
      const p = await db.query('SELECT * FROM volunteers WHERE user_id = $1', [userData.id]);
      userData.profile = p.rows[0] || null;
      if (userData.profile?.address) userData.address = userData.profile.address;
      if (userData.profile?.latitude) userData.latitude = userData.profile.latitude;
      if (userData.profile?.longitude) userData.longitude = userData.profile.longitude;
    }

    res.status(200).json({
      success: true,
      data: userData,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/auth/google-config
 * Returns public Google OAuth client configuration.
 */
const getGoogleConfig = async (req, res) => {
  const config = require('../../config');
  res.status(200).json({
    success: true,
    data: {
      clientId: config.google?.clientId || process.env.GOOGLE_CLIENT_ID || '',
    },
  });
};

/**
 * GET or POST /api/auth/verification-status
 * Check account approval status dynamically.
 */
const getVerificationStatus = async (req, res, next) => {
  try {
    const identifier = req.query.email || req.query.identifier || req.query.user_code || req.body?.email || req.body?.identifier || req.body?.user_code;
    const result = await authService.getVerificationStatus(identifier);

    res.status(200).json({
      success: true,
      message: 'Account verification status retrieved.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/forgot-password
 * Request OTP verification code for password reset
 */
const forgotPassword = async (req, res, next) => {
  try {
    const result = await authService.forgotPassword(req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/reset-password
 * Reset password using OTP verification code
 */
const resetPassword = async (req, res, next) => {
  try {
    const result = await authService.resetPassword(req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/change-password
 * Change password for authenticated user
 */
const changePassword = async (req, res, next) => {
  try {
    const result = await authService.changePassword({
      userId: req.user.id,
      current_password: req.body.current_password,
      new_password: req.body.new_password,
    });

    res.status(200).json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/send-email-otp
 * Send email verification code
 */
const sendEmailOtp = async (req, res, next) => {
  try {
    const result = await authService.sendEmailOtp(req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/verify-email-otp
 * Verify 6-digit OTP code for email
 */
const verifyEmailOtp = async (req, res, next) => {
  try {
    const result = await authService.verifyEmailOtp(req.body);
    res.status(200).json({
      success: true,
      message: result.message,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/auth/check-email
 * Check email availability
 */
const checkEmail = async (req, res, next) => {
  try {
    const email = req.body?.email || req.query?.email;
    const result = await authService.checkEmailAvailability(email);
    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  register,
  login,
  googleLogin,
  completeProfile,
  getProfileStatus,
  getVerificationStatus,
  refreshToken,
  logout,
  getMe,
  getGoogleConfig,
  changePassword,
  forgotPassword,
  resetPassword,
  sendEmailOtp,
  verifyEmailOtp,
  checkEmail,
};
