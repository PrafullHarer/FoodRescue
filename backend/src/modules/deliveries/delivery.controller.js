const deliveryService = require('./delivery.service');

/**
 * POST /api/deliveries
 */
const createDelivery = async (req, res, next) => {
  try {
    const delivery = await deliveryService.createDelivery(
      req.body.donation_id,
      req.body.volunteer_id,
      req.body.ngo_id
    );
    res.status(201).json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/deliveries/:id/accept
 */
const acceptDelivery = async (req, res, next) => {
  try {
    const delivery = await deliveryService.acceptDelivery(req.params.id, req.user.id);
    res.json({ success: true, message: 'Delivery accepted.', data: delivery });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/deliveries/:id/status
 */
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const delivery = await deliveryService.updateDeliveryStatus(
      req.params.id,
      req.body.status,
      req.user.id
    );
    res.json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/deliveries/:id
 */
const getDeliveryById = async (req, res, next) => {
  try {
    const delivery = await deliveryService.getDeliveryById(req.params.id);
    res.json({ success: true, data: delivery });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/deliveries
 */
const getDeliveries = async (req, res, next) => {
  try {
    const result = await deliveryService.getDeliveries({
      page: req.query.page ? parseInt(req.query.page, 10) : 1,
      limit: req.query.limit ? parseInt(req.query.limit, 10) : 20,
      status: req.query.status,
      volunteerId: req.query.volunteer_id,
    });
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  createDelivery,
  acceptDelivery,
  updateDeliveryStatus,
  getDeliveryById,
  getDeliveries,
};
