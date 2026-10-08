const analyticsService = require('./analytics.service');

/**
 * GET /api/analytics/impact
 */
const getImpactMetrics = async (req, res, next) => {
  try {
    const metrics = await analyticsService.getImpactMetrics();
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
    const trends = await analyticsService.getDonationTrends({
      period: req.query.period || 'daily',
      days: req.query.days ? parseInt(req.query.days, 10) : 30,
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
      period: req.query.period || 'all_time',
      role: req.query.role || 'provider',
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
