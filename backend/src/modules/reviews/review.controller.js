const reviewService = require('./review.service');

/**
 * POST /api/reviews
 */
const createReview = async (req, res, next) => {
  try {
    const { donation_id, claim_id, rating, comment, tags, review_type } = req.body;

    if (!donation_id) {
      return res.status(400).json({
        success: false,
        message: 'donation_id is required.',
      });
    }

    if (!rating) {
      return res.status(400).json({
        success: false,
        message: 'rating is required (1-5).',
      });
    }

    const review = await reviewService.createReview({
      donationId: donation_id,
      claimId: claim_id,
      reviewerId: req.user.id,
      rating,
      comment,
      tags,
      reviewType: review_type,
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
 * GET /api/reviews/donation/:donationId
 */
const getDonationReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getDonationReviews(req.params.donationId);
    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/my
 */
const getMyReviews = async (req, res, next) => {
  try {
    const reviews = await reviewService.getMyReviews(req.user.id);
    res.json({
      success: true,
      data: reviews,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/reviews/user/:userId
 */
const getUserReceivedReviews = async (req, res, next) => {
  try {
    const data = await reviewService.getUserReceivedReviews(req.params.userId);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createReview,
  getDonationReviews,
  getMyReviews,
  getUserReceivedReviews,
};
