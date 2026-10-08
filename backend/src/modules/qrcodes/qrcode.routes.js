const express = require('express');
const router = express.Router();
const qrcodeController = require('./qrcode.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Generate QR codes for a delivery
router.post('/generate/:deliveryId', roleGuard('admin', 'volunteer', 'provider', 'ngo'), qrcodeController.generateQRCodes);

// Preview / inspect QR code details before finalizing scan
router.get('/preview/:code', qrcodeController.previewQRCode);

// Scan a QR code (volunteers scan pickup QR with checklist, NGOs scan dropoff QR to confirm delivery)
router.post('/:code/scan', roleGuard('volunteer', 'ngo', 'admin', 'provider'), qrcodeController.scanQRCode);

// Get QR codes for a delivery
router.get('/delivery/:deliveryId', qrcodeController.getQRCodesForDelivery);

// Get QR codes by donation ID
router.get('/donation/:donationId', qrcodeController.getQRCodesByDonationId);

module.exports = router;
