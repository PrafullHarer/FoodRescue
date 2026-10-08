const express = require('express');
const router = express.Router();
const matchingController = require('./matching.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Trigger matching (system / admin / provider)
router.post(
  '/:donationId/match',
  roleGuard('admin', 'provider'),
  matchingController.matchDonation
);

// Preview scores (admin-only debug endpoint)
router.get(
  '/:donationId/scores',
  roleGuard('admin'),
  matchingController.previewScores
);

module.exports = router;
