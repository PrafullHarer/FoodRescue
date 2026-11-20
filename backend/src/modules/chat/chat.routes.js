const express = require('express');
const router = express.Router();
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const config = require('../../config');
const db = require('../../config/db');
const chatController = require('./chat.controller');

// Rate limiter for chat endpoints: 30 requests per minute
const chatLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many chat requests. Please wait a moment before asking again.'
  }
});

/**
 * Optional authentication middleware:
 * Extracts and verifies JWT if present; sets req.user.
 * If not present or invalid, sets req.user = null and continues without error (for guests).
 */
const authenticateOptional = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    let token = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.split(' ')[1];
    } else if (req.headers.cookie) {
      const match = req.headers.cookie.match(/(?:^|;\s*)foodrescue_token=([^;]+)/);
      if (match) {
        token = decodeURIComponent(match[1]);
      }
    }

    if (!token) {
      req.user = null;
      return next();
    }

    try {
      const decoded = jwt.verify(token, config.jwt.secret);
      const { rows } = await db.query(
        'SELECT id, email, role, full_name, status FROM users WHERE id = $1',
        [decoded.id]
      );

      if (rows.length > 0) {
        req.user = rows[0];
      } else {
        req.user = null;
      }
    } catch (err) {
      // Invalid/expired token: fallback to guest
      req.user = null;
    }

    return next();
  } catch (err) {
    req.user = null;
    return next();
  }
};

// Endpoints
router.post('/message', chatLimiter, authenticateOptional, chatController.handleMessage);
router.post('/feedback', chatLimiter, authenticateOptional, chatController.handleFeedback);
router.get('/knowledge', chatController.getKnowledge);

module.exports = router;
