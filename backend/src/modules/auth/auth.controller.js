const authService = require('./auth.service');

/**
 * POST /api/auth/register
 */
const register = async (req, res, next) => {
  try {
    const result = await authService.register(req.body);

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
    const result = await authService.refreshAccessToken(req.body.refresh_token);

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
    await authService.logout(req.body.refresh_token);

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
      'SELECT id, email, role, full_name, phone, avatar_url, status, profile_completed, auth_provider, created_at FROM users WHERE id = $1',
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

module.exports = {
  register,
  login,
  googleLogin,
  completeProfile,
  getProfileStatus,
  refreshToken,
  logout,
  getMe,
  getGoogleConfig,
};
