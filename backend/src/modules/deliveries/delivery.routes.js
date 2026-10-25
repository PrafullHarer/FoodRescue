const express = require('express');
const router = express.Router();
const deliveryController = require('./delivery.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

router.get('/', deliveryController.getDeliveries);
router.get('/:id', deliveryController.getDeliveryById);

// Create delivery (admin/system)
router.post('/', roleGuard('admin', 'ngo'), deliveryController.createDelivery);

// Volunteer accepts
router.post('/:id/accept', roleGuard('volunteer'), deliveryController.acceptDelivery);

// Update status (volunteer)
router.patch('/:id/status', roleGuard('volunteer', 'admin'), deliveryController.updateDeliveryStatus);

module.exports = router;
