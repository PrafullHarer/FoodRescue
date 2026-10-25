const express = require('express');
const router = express.Router();
const reviewController = require('./review.controller');
const authenticate = require('../../middleware/auth');

router.use(authenticate);

router.post('/', reviewController.createReview);
router.get('/my', reviewController.getMyReviews);
router.get('/donation/:donationId', reviewController.getDonationReviews);
router.get('/user/:userId', reviewController.getUserReceivedReviews);

module.exports = router;
