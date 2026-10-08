const qrcodeService = require('./qrcode.service');

/**
 * POST /api/qr-codes/generate/:deliveryId
 */
const generateQRCodes = async (req, res, next) => {
  try {
    const result = await qrcodeService.generateQRCodes(req.params.deliveryId);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/qr-codes/:code/scan
 */
const scanQRCode = async (req, res, next) => {
  try {
    const result = await qrcodeService.scanQRCode(req.params.code, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/qr-codes/delivery/:deliveryId
 */
const getQRCodesForDelivery = async (req, res, next) => {
  try {
    const codes = await qrcodeService.getQRCodesForDelivery(req.params.deliveryId);
    res.json({ success: true, data: codes });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  generateQRCodes,
  scanQRCode,
  getQRCodesForDelivery,
};
