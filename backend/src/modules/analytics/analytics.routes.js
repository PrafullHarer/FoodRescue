const express = require('express');
const router = express.Router();
const analyticsController = require('./analytics.controller');
const adminAnalyticsController = require('./admin-analytics.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// Public Impact Metrics (Accessible without authentication for landing page hero)
router.get('/public-impact', analyticsController.getImpactMetrics);

router.use(authenticate);

// Public / General Authenticated Impact Metrics
router.get('/impact', analyticsController.getImpactMetrics);
router.get('/trends', analyticsController.getDonationTrends);
router.get('/leaderboard', analyticsController.getLeaderboard);

// Admin-Only Advanced Analytics Suite
router.get('/admin/kpis', roleGuard('admin'), adminAnalyticsController.getKPISummary);
router.get('/admin/hotspots', roleGuard('admin'), adminAnalyticsController.getDonationHotspots);
router.get('/admin/wasted-categories', roleGuard('admin'), adminAnalyticsController.getWastedCategories);
router.get('/admin/demand-gaps', roleGuard('admin'), adminAnalyticsController.getNGODemandGaps);
router.get('/admin/delivery-reliability', roleGuard('admin'), adminAnalyticsController.getDeliveryReliability);
router.get('/admin/inactive-providers', roleGuard('admin'), adminAnalyticsController.getInactiveProviders);
router.get('/admin/filter-options', roleGuard('admin'), adminAnalyticsController.getFilterOptions);
router.get('/admin/export', roleGuard('admin'), adminAnalyticsController.exportData);

module.exports = router;
