const volunteerService = require('./volunteer.service');

/**
 * GET /api/volunteers/ranked/:donationId
 */
const getRankedVolunteers = async (req, res, next) => {
  try {
    const volunteers = await volunteerService.rankVolunteers(req.params.donationId);
    res.json({ success: true, data: volunteers });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/volunteers/availability
 */
const updateAvailability = async (req, res, next) => {
  try {
    const volunteer = await volunteerService.updateAvailability(
      req.user.id,
      req.body.availability
    );
    res.json({ success: true, data: volunteer });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/volunteers/location
 */
const updateLocation = async (req, res, next) => {
  try {
    const volunteer = await volunteerService.updateLocation(
      req.user.id,
      req.body.latitude,
      req.body.longitude
    );
    res.json({ success: true, data: volunteer });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/volunteers/my-deliveries
 */
const getMyDeliveries = async (req, res, next) => {
  try {
    const deliveries = await volunteerService.getMyDeliveries(req.user.id);
    res.json({ success: true, data: deliveries });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getRankedVolunteers,
  updateAvailability,
  updateLocation,
  getMyDeliveries,
};
