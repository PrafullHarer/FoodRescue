const matchingService = require('./matching.service');

/**
 * POST /api/matching/:donationId/match
 * Trigger matching for a donation.
 */
const matchDonation = async (req, res, next) => {
  try {
    const result = await matchingService.matchAndNotify(req.params.donationId);

    res.json({
      success: true,
      message: result.message,
      data: result.matches,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/matching/:donationId/scores
 * Preview match scores without persisting.
 */
const previewScores = async (req, res, next) => {
  try {
    const scores = await matchingService.matchDonation(req.params.donationId);

    res.json({
      success: true,
      data: scores,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  matchDonation,
  previewScores,
};
