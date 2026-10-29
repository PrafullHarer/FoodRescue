const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const jwt = require('jsonwebtoken');

const feedbackController = require('./feedback.controller');
const {
  createFeedbackSchema,
  getFeedbackQuerySchema,
  updateFeedbackStatusSchema,
} = require('./feedback.schema');

const config = require('../../config');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// Rate limiter for public feedback submission: max 20 submissions per 15 minutes per IP
const feedbackLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many feedback submissions from this IP. Please wait a few minutes before submitting again.',
  },
});

/**
 * Optional authentication middleware for public endpoints.
 * If a valid Bearer token is passed, extracts req.user, otherwise continues unauthenticated.
 */
function optionalAuth(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = jwt.verify(token, config.jwt.secret);
      req.user = { id: decoded.id, role: decoded.role };
    }
  } catch {
    // Ignore invalid/expired token for public submission
  }
  next();
}

// ─── PUBLIC ENDPOINTS ─────────────────────────────────────────
// POST /api/feedback: anyone can submit without authentication
router.post(
  '/',
  feedbackLimiter,
  optionalAuth,
  validate({ body: createFeedbackSchema }),
  feedbackController.submitFeedback
);

// ─── ADMIN-ONLY ENDPOINTS ─────────────────────────────────────
// All routes below require valid JWT + admin role
router.use(authenticate, roleGuard('admin'));

// GET /api/feedback: list feedback with query filters & pagination
router.get(
  '/',
  validate({ query: getFeedbackQuerySchema }),
  feedbackController.getFeedbackList
);

// GET /api/feedback/:id: get single feedback details
router.get('/:id', feedbackController.getFeedbackById);

// PATCH /api/feedback/:id/status: update status and admin notes
router.patch(
  '/:id/status',
  validate({ body: updateFeedbackStatusSchema }),
  feedbackController.updateFeedbackStatus
);

module.exports = router;
