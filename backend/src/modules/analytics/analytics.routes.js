const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const authenticate = require('../../middleware/auth');

router.use(authenticate);

router.get('/impact', analyticsController.getImpactMetrics);
router.get('/trends', analyticsController.getDonationTrends);
router.get('/leaderboard', analyticsController.getLeaderboard);

module.exports = router;
