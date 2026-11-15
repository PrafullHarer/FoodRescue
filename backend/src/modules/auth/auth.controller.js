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
      'SELECT id, email, role, full_name, phone, avatar_url, status, verification_status, rejection_reason, info_requested_notes, approved_at, rejected_at, profile_completed, auth_provider, created_at FROM users WHERE id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found.',
      });
    }

    res.status(200).json({
      success: true,
      data: rows[0],
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
    const email = req.query.email || req.body?.email;
    const result = await authService.getVerificationStatus(email);

    res.status(200).json({
      success: true,
      message: 'Account verification status retrieved.',
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
};
