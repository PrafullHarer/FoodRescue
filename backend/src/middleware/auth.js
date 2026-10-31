const jwt = require('jsonwebtoken');
const config = require('../config');
const db = require('../config/db');

// In-memory user cache to avoid round-trip DB queries on every authenticated request (60s TTL)
const userCache = new Map();
const CACHE_TTL_MS = 60 * 1000;

function getCachedUser(userId) {
  const cached = userCache.get(userId);
  if (!cached) return null;
  if (Date.now() - cached.cachedAt > CACHE_TTL_MS) {
    userCache.delete(userId);
    return null;
  }
  return cached.user;
}

function setCachedUser(userId, user) {
  // Prevent unbounded memory growth
  if (userCache.size > 1000) {
    userCache.clear();
  }
  userCache.set(userId, { user, cachedAt: Date.now() });
}

/**
 * Invalidate user from cache when status changes.
 */
function invalidateUserCache(userId) {
  if (userId) userCache.delete(userId);
}

/**
 * Authentication middleware.
 * Verifies the JWT access token and attaches req.user with cached database validation.
 */
const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        success: false,
        message: 'Access denied. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    // 1. Check in-memory cache first
    let user = getCachedUser(decoded.id);

    // 2. Query DB only on cache miss
    if (!user) {
      const { rows } = await db.query(
        'SELECT id, email, role, status, verification_status, rejection_reason, profile_completed FROM users WHERE id = $1',
        [decoded.id]
      );

      if (rows.length === 0) {
        return res.status(401).json({
          success: false,
          message: 'User not found. Token is invalid.',
        });
      }

      user = rows[0];
      setCachedUser(decoded.id, user);
    }

    // Role admin is exempt from verification status blocks to administer platform
    if (user.role !== 'admin') {
      // Allow users with incomplete OAuth profiles to access profile-completion routes
      const isProfileRoute =
        (req.baseUrl === '/api/auth' || req.originalUrl?.startsWith('/api/auth')) &&
        (req.path === '/complete-profile' || req.path === '/profile-status' || req.path === '/me');

      if (user.profile_completed === false && isProfileRoute) {
        // Allow through to complete profile
      } else {
        if (user.verification_status === 'PENDING' || user.status === 'pending') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_PENDING_VERIFICATION',
            verification_status: 'PENDING',
            message: 'Your account is awaiting admin verification. You will be notified once approved.',
          });
        }

        if (user.verification_status === 'REJECTED' || user.status === 'blocked') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_REJECTED',
            verification_status: 'REJECTED',
            message: user.rejection_reason
              ? `Your FoodRescue registration could not be approved. Reason: ${user.rejection_reason}`
              : 'Your FoodRescue registration could not be approved. Please review the reason provided by the administrator.',
          });
        }

        if (user.verification_status === 'SUSPENDED' || user.status === 'suspended') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_SUSPENDED',
            verification_status: 'SUSPENDED',
            message: 'Your account has been suspended. Please contact support.',
          });
        }

        if (user.verification_status !== 'APPROVED') {
          return res.status(403).json({
            success: false,
            code: 'ACCOUNT_PENDING_VERIFICATION',
            verification_status: user.verification_status || 'PENDING',
            message: 'Your account is awaiting admin verification. You will be notified once approved.',
          });
        }
      }
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
      verification_status: user.verification_status,
      rejection_reason: user.rejection_reason,
      profile_completed: user.profile_completed !== false,
    };

    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({
        success: false,
        message: 'Token expired. Please refresh your token.',
      });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({
        success: false,
        message: 'Invalid token.',
      });
    }
    next(error);
  }
};

/**
 * Optional authentication middleware.
 * If Bearer token is provided and valid, attaches req.user.
 * If not provided, leaves req.user = null and continues without error.
 */
const optionalAuthenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    req.user = null;
    return next();
  }

  try {
    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, config.jwt.secret);

    let user = getCachedUser(decoded.id);
    if (!user) {
      const { rows } = await db.query(
        'SELECT id, email, role, status, verification_status, rejection_reason, profile_completed FROM users WHERE id = $1',
        [decoded.id]
      );
      if (rows.length > 0) {
        user = rows[0];
        setCachedUser(decoded.id, user);
      }
    }

    if (
      user &&
      (user.role === 'admin' || user.verification_status === 'APPROVED') &&
      user.status !== 'blocked' &&
      user.status !== 'suspended'
    ) {
      req.user = {
        id: user.id,
        email: user.email,
        role: user.role,
        status: user.status,
        verification_status: user.verification_status,
        rejection_reason: user.rejection_reason,
        profile_completed: user.profile_completed !== false,
      };
    } else {
      req.user = null;
    }
    next();
  } catch {
    req.user = null;
    next();
  }
};

authenticate.optional = optionalAuthenticate;
authenticate.invalidateUserCache = invalidateUserCache;

module.exports = authenticate;

