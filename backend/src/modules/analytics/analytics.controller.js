const analyticsService = require('./analytics.service');

/**
 * GET /api/analytics/impact
 */
const getImpactMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getImpactMetrics({
      timeRange: req.query.range || req.query.timeRange || 'all',
    });
    res.json({ success: true, data: metrics });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/trends
 */
const getDonationTrends = async (req, res, next) => {
  try {
    const range = req.query.range || req.query.timeRange || 'all';
    const trends = await analyticsService.getDonationTrends({
      range,
    });
    res.json({ success: true, data: trends });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/analytics/leaderboard
 */
const getLeaderboard = async (req, res, next) => {
  try {
    const leaderboard = await analyticsService.getLeaderboard({
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 10,
    });
    res.json({ success: true, data: leaderboard });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getImpactMetrics,
  getDonationTrends,
  getLeaderboard,
};
