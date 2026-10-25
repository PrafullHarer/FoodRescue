const db = require('../../config/db');
const notificationService = require('../notifications/notification.service');

/**
 * Submit a new review for a claim / donation.
 */
const createReview = async ({
  donationId,
  claimId = null,
  reviewerId,
  rating,
  comment = '',
  tags = [],
  reviewType = 'claim',
}) => {
  // Validate rating
  const numericRating = parseInt(rating, 10);
  if (isNaN(numericRating) || numericRating < 1 || numericRating > 5) {
    const err = new Error('Rating must be an integer between 1 and 5.');
    err.statusCode = 400;
    throw err;
  }

  // Get donation and determine reviewee (e.g. food provider user or volunteer)
  const donRes = await db.query(
    `SELECT fd.*, fp.user_id AS provider_user_id, fp.business_name
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (donRes.rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = donRes.rows[0];
  const revieweeId = donation.provider_user_id;

  // Insert review
  const { rows } = await db.query(
    `INSERT INTO reviews (donation_id, claim_id, reviewer_id, reviewee_id, review_type, rating, comment, tags)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING *`,
    [
      donationId,
      claimId,
      reviewerId,
      revieweeId,
      reviewType,
      numericRating,
      comment,
      tags && tags.length > 0 ? tags : null,
    ]
  );

  const review = rows[0];

  // Get reviewer info for notification
  const revUserRes = await db.query('SELECT full_name FROM users WHERE id = $1', [reviewerId]);
  const reviewerName = revUserRes.rows[0]?.full_name || 'An NGO';

  // Send notification to reviewee
  if (revieweeId && revieweeId !== reviewerId) {
    await notificationService.createNotification({
      userId: revieweeId,
      title: `⭐ New ${numericRating}-Star Review!`,
      body: `${reviewerName} reviewed your donation "${donation.title}": "${comment ? comment.slice(0, 80) + '...' : 'Great experience!'}"`,
      type: 'in_app',
      data: {
        type: 'review',
        donation_id: donationId,
        review_id: review.id,
        rating: numericRating,
      },
    }).catch(() => {});
  }

  return review;
};

/**
 * Get reviews for a specific donation.
 */
const getDonationReviews = async (donationId) => {
  const { rows } = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name, u.role AS reviewer_role, u.avatar_url AS reviewer_avatar
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     WHERE r.donation_id = $1
     ORDER BY r.created_at DESC`,
    [donationId]
  );

  return rows;
};

/**
 * Get reviews submitted by the current user.
 */
const getMyReviews = async (userId) => {
  const { rows } = await db.query(
    `SELECT r.*, fd.title AS donation_title, fp.business_name AS provider_name
     FROM reviews r
     JOIN food_donations fd ON fd.id = r.donation_id
     LEFT JOIN food_providers fp ON fp.id = fd.provider_id
     WHERE r.reviewer_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  return rows;
};

/**
 * Get reviews received by a user (e.g. provider or volunteer).
 */
const getUserReceivedReviews = async (userId) => {
  const { rows } = await db.query(
    `SELECT r.*, u.full_name AS reviewer_name, fd.title AS donation_title
     FROM reviews r
     JOIN users u ON u.id = r.reviewer_id
     JOIN food_donations fd ON fd.id = r.donation_id
     WHERE r.reviewee_id = $1
     ORDER BY r.created_at DESC`,
    [userId]
  );

  // Compute stats
  const totalReviews = rows.length;
  const avgRating = totalReviews > 0
    ? (rows.reduce((sum, r) => sum + r.rating, 0) / totalReviews).toFixed(1)
    : 0;

  return {
    reviews: rows,
    stats: {
      totalReviews,
      averageRating: parseFloat(avgRating),
    },
  };
};

module.exports = {
  createReview,
  getDonationReviews,
  getMyReviews,
  getUserReceivedReviews,
};
