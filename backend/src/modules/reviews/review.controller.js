const reviewService = require('./review.service');

/**
 * GET /api/reviews/users/:userId
 * Public reputation summary and verified review history.
 */
const getUserReputation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const { page, limit, sort, rating } = req.query;

    const data = await reviewService.getUserReputation(userId, {
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sort: sort || 'recent',
      rating: rating ? parseInt(rating, 10) : undefined,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/me (also /my)
 * Authenticated user's reputation overview and list of received / submitted reviews.
 */
const getMyReviews = async (req, res, next) => {
  try {
    const { page, limit, sort, type, rating } = req.query;

    const data = await reviewService.getMyReviews(req.user.id, {
      type: type || 'received',
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 10,
      sort: sort || 'recent',
      rating: rating ? parseInt(rating, 10) : undefined,
    });

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/eligibility/:deliveryId
 * Check which reviews the authenticated user is eligible to submit for a delivery.
 */
const getDeliveryEligibility = async (req, res, next) => {
  try {
    const { deliveryId } = req.params;
    const data = await reviewService.getDeliveryEligibility(deliveryId, req.user.id);

    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reviews
 * Submit a review for a completed donation / delivery transaction.
 */
const createReview = async (req, res, next) => {
  try {
    const {
      delivery_id,
      donation_id,
      claim_id,
      reviewee_id,
      rating,
      comment,
      tags,
      review_type,
    } = req.body;

    const review = await reviewService.createReview({
      delivery_id,
      donation_id,
      claim_id,
      reviewee_id,
      rating,
      comment,
      tags,
      review_type,
      currentUserId: req.user.id,
      currentUserRole: req.user.role,
    });

    res.status(201).json({
      success: true,
      message: 'Review submitted successfully.',
      data: review,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reviews/:reviewId
 * Edit an existing review (original reviewer only).
 */
const updateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { rating, comment, tags } = req.body;

    const updated = await reviewService.updateReview(reviewId, req.user.id, {
      rating,
      comment,
      tags,
    });

    res.json({
      success: true,
      message: 'Review updated successfully.',
      data: updated,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/reviews/:reviewId/report
 * Report a review for policy violation or inappropriate content.
 */
const reportReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { reason } = req.body;

    const result = await reviewService.reportReview(reviewId, req.user.id, { reason });

    res.json({
      success: true,
      message: result.message,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/reviews/:reviewId/moderate
 * Administrative review moderation (approve/hide).
 */
const moderateReview = async (req, res, next) => {
  try {
    const { reviewId } = req.params;
    const { status, resolution_notes } = req.body;

    const result = await reviewService.moderateReview(reviewId, req.user.id, {
      status,
      resolution_notes,
    });

    res.json({
      success: true,
      message: `Review moderation status updated to ${status}.`,
      data: result,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/deliveries/:deliveryId
 * Get all verified reviews for a specific delivery.
 */
const getDeliveryReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getDeliveryReviews(req.params.deliveryId);
    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUserReputation,
  getMyReviews,
  getDeliveryEligibility,
  createReview,
  updateReview,
  reportReview,
  moderateReview,
  getDeliveryReviews,
};
