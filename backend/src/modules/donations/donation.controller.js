const donationService = require('./donation.service');
const db = require('../../config/db');

/**
 * POST /api/donations
 * Provider creates a new donation.
 */
const createDonation = async (req, res, next) => {
  try {
    // Get provider profile ID from user
    const { rows } = await db.query(
      'SELECT id FROM food_providers WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found. Complete your profile first.',
      });
    }

    const donation = await donationService.createDonation(rows[0].id, req.body);

    res.status(201).json({
      success: true,
      message: 'Donation posted successfully.',
      data: donation,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations
 */
const getDonations = async (req, res, next) => {
  try {
    const result = await donationService.getDonations({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
      category: req.query.category,
      providerId: req.query.provider_id,
      lat: req.query.lat,
      lng: req.query.lng,
      radiusKm: req.query.radius_km,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations/:id
 */
const getDonationById = async (req, res, next) => {
  try {
    const donation = await donationService.getDonationById(req.params.id);
    res.json({ success: true, data: donation });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/donations/:id
 */
const updateDonation = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM food_providers WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const donation = await donationService.updateDonation(req.params.id, rows[0].id, req.body);
    res.json({ success: true, data: donation });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/donations/:id/claim
 */
const claimDonation = async (req, res, next) => {
  try {
    // Get NGO profile ID from user
    const { rows } = await db.query(
      'SELECT id FROM ngos WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'NGO profile not found.',
      });
    }

    const claim = await donationService.claimDonation(req.params.id, rows[0].id);

    res.status(201).json({
      success: true,
      message: 'Donation claimed successfully.',
      data: claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/donations/:id/cancel
 */
const cancelDonation = async (req, res, next) => {
  try {
    const { rows } = await db.query(
      'SELECT id FROM food_providers WHERE user_id = $1',
      [req.user.id]
    );

    if (rows.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Provider profile not found.',
      });
    }

    const donation = await donationService.cancelDonation(req.params.id, rows[0].id);

    res.json({
      success: true,
      message: 'Donation cancelled.',
      data: donation,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDonation,
  getDonations,
  getDonationById,
  updateDonation,
  claimDonation,
  cancelDonation,
};
