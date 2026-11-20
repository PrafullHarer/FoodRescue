const matchingService = require('./matching.service');
const { getNgoModelMeta, getVolunteerModelMeta } = require('../../ml/model_inference');

/**
 * POST /api/matching/:donationId/match
 * Trigger smart matching and notify NGOs within 20km.
 */
const matchDonation = async (req, res, next) => {
  try {
    const result = await matchingService.matchAndNotify(req.params.donationId);

    res.json({
      success: true,
      message: result.message,
      data: result.matches,
      meta: {
        max_radius_km: matchingService.NGO_MAX_RADIUS_KM,
        matched_count: result.matches ? result.matches.length : 0,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/matching/:donationId/scores
 * Preview NGO match scores within 20km radius without persisting.
 */
const previewScores = async (req, res, next) => {
  try {
    const scores = await matchingService.matchDonation(req.params.donationId);

    res.json({
      success: true,
      data: scores,
      meta: {
        radius_km: matchingService.NGO_MAX_RADIUS_KM,
        count: scores.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/matching/:donationId/volunteers/:ngoId
 * Preview volunteer matches within 30km of BOTH food provider and NGO shelter.
 */
const getMatchedVolunteers = async (req, res, next) => {
  try {
    const { donationId, ngoId } = req.params;
    const volunteers = await matchingService.matchVolunteersForPickup(donationId, ngoId);

    res.json({
      success: true,
      data: volunteers,
      meta: {
        max_provider_radius_km: matchingService.VOLUNTEER_MAX_RADIUS_KM,
        max_ngo_radius_km: matchingService.VOLUNTEER_MAX_RADIUS_KM,
        matched_count: volunteers.length,
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/matching/models/metrics
 * Inspect the trained smart matching ML models' metadata and accuracy metrics.
 */
const getModelMetrics = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        ngo_matching_model: getNgoModelMeta(),
        volunteer_matching_model: getVolunteerModelMeta(),
        constraints: {
          ngo_max_radius_km: matchingService.NGO_MAX_RADIUS_KM,
          volunteer_max_provider_radius_km: matchingService.VOLUNTEER_MAX_RADIUS_KM,
          volunteer_max_ngo_radius_km: matchingService.VOLUNTEER_MAX_RADIUS_KM,
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  matchDonation,
  previewScores,
  getMatchedVolunteers,
  getModelMetrics,
};
