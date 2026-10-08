const express = require('express');
const router = express.Router();
const qrcodeController = require('./qrcode.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Generate QR codes for a delivery
router.post('/generate/:deliveryId', roleGuard('admin', 'volunteer'), qrcodeController.generateQRCodes);

// Scan a QR code
router.post('/:code/scan', roleGuard('volunteer'), qrcodeController.scanQRCode);

// Get QR codes for a delivery
router.get('/delivery/:deliveryId', qrcodeController.getQRCodesForDelivery);

module.exports = router;
