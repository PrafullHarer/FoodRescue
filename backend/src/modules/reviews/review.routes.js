const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const {
  createReviewSchema,
  updateReviewSchema,
  reportReviewSchema,
  moderateReviewSchema,
  getReviewsQuerySchema,
} = require('./review.schema');

// ─── Public / Authenticated Reputation Read Routes ───────────
// Get user reputation and reviews (Accessible by authenticated users)
router.get(
  '/users/:userId',
  authenticate,
  validate({ query: getReviewsQuerySchema }),
  reviewController.getUserReputation
);
router.get(
  '/user/:userId',
  authenticate,
  validate({ query: getReviewsQuerySchema }),
  reviewController.getUserReputation
);

// Get current user's reviews (me & my alias) - Only participants (provider, ngo, volunteer) have reputation/reviews
router.get(
  '/me',
  authenticate,
  roleGuard('provider', 'ngo', 'volunteer'),
  validate({ query: getReviewsQuerySchema }),
  reviewController.getMyReviews
);
router.get(
  '/my',
  authenticate,
  roleGuard('provider', 'ngo', 'volunteer'),
  validate({ query: getReviewsQuerySchema }),
  reviewController.getMyReviews
);

// Check review eligibility for a specific delivery
router.get(
  '/eligibility/:deliveryId',
  authenticate,
  reviewController.getDeliveryEligibility
);

// Get all reviews for a specific delivery
router.get(
  '/deliveries/:deliveryId',
  authenticate,
  reviewController.getDeliveryReviews
);

// ─── Review Mutation Routes ──────────────────────────────────
// Submit a new transaction review (Only participants, non-admins)
router.post(
  '/',
  authenticate,
  roleGuard('provider', 'ngo', 'volunteer'),
  validate({ body: createReviewSchema }),
  reviewController.createReview
);

// Edit an existing review (Author only)
router.patch(
  '/:reviewId',
  authenticate,
  validate({ body: updateReviewSchema }),
  reviewController.updateReview
);

// Report a review for moderation
router.post(
  '/:reviewId/report',
  authenticate,
  validate({ body: reportReviewSchema }),
  reviewController.reportReview
);

// Administrative moderation (Admin role only)
router.patch(
  '/:reviewId/moderate',
  authenticate,
  roleGuard('admin'),
  validate({ body: moderateReviewSchema }),
  reviewController.moderateReview
);

module.exports = router;
