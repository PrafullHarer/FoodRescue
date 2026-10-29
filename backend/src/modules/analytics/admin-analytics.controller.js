const adminAnalyticsService = require('./admin-analytics.service');

const getKPISummary = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getKPISummary(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getDonationHotspots = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getDonationHotspots(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getWastedCategories = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getWastedCategories(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getNGODemandGaps = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getNGODemandGaps(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getDeliveryReliability = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getDeliveryReliability(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getInactiveProviders = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getInactiveProviders(req.query);
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const getFilterOptions = async (req, res, next) => {
  try {
    const data = await adminAnalyticsService.getFilterOptions();
    res.json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

const exportData = async (req, res, next) => {
  try {
    const csvContent = await adminAnalyticsService.exportFilteredData(req.query);
    const filename = `foodrescue-analytics-${new Date().toISOString().slice(0, 10)}.csv`;

    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csvContent);
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getKPISummary,
  getDonationHotspots,
  getWastedCategories,
  getNGODemandGaps,
  getDeliveryReliability,
  getInactiveProviders,
  getFilterOptions,
  exportData
};
