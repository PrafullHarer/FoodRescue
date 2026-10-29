const donationService = require('./donation.service');
const deliveryService = require('../deliveries/delivery.service');
const notificationService = require('../notifications/notification.service');
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

    // Fire-and-forget: notify all NGOs about the new donation
    notificationService.notifyNgosOfNewDonation(donation).catch(() => {});

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
 * Role-aware donation retrieval:
 * - Providers: strictly scoped to own donations.
 * - NGOs: available uncompleted surplus (or own claims if my_claims=true).
 * - Volunteers: active delivery missions and assigned donations.
 * - Public: strictly posted and unexpired donations with redacted contact info.
 */
const getDonations = async (req, res, next) => {
  try {
    const result = await donationService.getDonations({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
      category: req.query.category,
      providerId: req.query.provider_id,
      myClaimsOnly: req.query.my_claims === 'true',
      user: req.user,
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
 * GET /api/donations/my
 * Dedicated endpoint for food providers to view only their own donations.
 */
const getMyDonations = async (req, res, next) => {
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

    const result = await donationService.getDonations({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
      category: req.query.category,
      providerId: rows[0].id,
      user: req.user,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations/my-claims
 * Dedicated endpoint for NGOs to view only their accepted claims.
 */
const getMyClaims = async (req, res, next) => {
  try {
    const result = await donationService.getMyClaims(req.user.id, {
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 50,
      status: req.query.status,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/donations/:id
 * Strictly verifies ownership so providers only view their own listings, NGOs only view available or claimed listings.
 */
const getDonationById = async (req, res, next) => {
  try {
    const donation = await donationService.getDonationById(req.params.id, req.user);
    res.json({ success: true, data: donation });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/donations/:id
 * Food Provider deletes an uncollected donation.
 */
const deleteDonation = async (req, res, next) => {
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

    const result = await donationService.deleteDonation(req.params.id, rows[0].id);
    res.json(result);
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

    const pickupType = req.body.pickupType || req.body.pickup_type || 'volunteer';
    const claim = await donationService.claimDonation(req.params.id, rows[0].id, { pickupType });

    // Notify provider that donation was claimed
    notificationService.notifyStatusChange(req.params.id, 'claimed').catch(() => {});

    // Auto-mark notifications as read for all NGOs since this donation is now claimed
    notificationService.markDonationNotificationsReadOnClaim(req.params.id).catch(() => {});

    res.status(201).json({
      success: true,
      message: pickupType === 'self_pickup'
        ? 'Donation claimed for direct self-pickup by NGO!'
        : 'Donation claimed! Pickup mission published to community volunteers.',
      data: claim,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/donations/:id/pickup-type
 */
const updatePickupType = async (req, res, next) => {
  try {
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

    const pickupType = req.body.pickupType || req.body.pickup_type || 'volunteer';
    const result = await donationService.updatePickupType(req.params.id, rows[0].id, pickupType);

    res.json({
      success: true,
      message: pickupType === 'self_pickup'
        ? 'Switched to direct NGO self-pickup.'
        : 'Published pickup mission to community volunteers.',
      data: result,
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

    // Notify provider/NGO of cancellation
    notificationService.notifyStatusChange(req.params.id, 'cancelled').catch(() => {});

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
  getMyDonations,
  getMyClaims,
  getDonationById,
  updateDonation,
  deleteDonation,
  claimDonation,
  updatePickupType,
  cancelDonation,
};
