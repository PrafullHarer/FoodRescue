const express = require('express');
const router = express.Router();
const matchingController = require('./matching.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Inspect ML Model metrics and constraints
router.get(
  '/models/metrics',
  matchingController.getModelMetrics
);

// Trigger smart matching and notify NGOs within 20km (admin / provider)
router.post(
  '/:donationId/match',
  roleGuard('admin', 'provider'),
  matchingController.matchDonation
);

// Preview NGO scores within 20km (admin / provider)
router.get(
  '/:donationId/scores',
  roleGuard('admin', 'provider'),
  matchingController.previewScores
);

// Preview/rank volunteers within 30km of BOTH provider and NGO (admin / provider / ngo)
router.get(
  '/:donationId/volunteers/:ngoId',
  roleGuard('admin', 'provider', 'ngo'),
  matchingController.getMatchedVolunteers
);

module.exports = router;
