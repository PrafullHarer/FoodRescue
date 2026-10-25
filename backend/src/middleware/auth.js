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
        'SELECT id, email, role, status FROM users WHERE id = $1',
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

    if (user.status === 'blocked' || user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: `Account is ${user.status}. Please contact support.`,
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
      status: user.status,
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

authenticate.invalidateUserCache = invalidateUserCache;

module.exports = authenticate;
