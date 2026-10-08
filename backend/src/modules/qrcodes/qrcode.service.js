const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../../config/db');

/**
 * Generate pickup and delivery QR codes for a delivery.
 */
const generateQRCodes = async (deliveryId) => {
  const delivery = await db.query(
    'SELECT * FROM deliveries WHERE id = $1',
    [deliveryId]
  );

  if (delivery.rows.length === 0) {
    const err = new Error('Delivery not found.');
    err.statusCode = 404;
    throw err;
  }

  const pickupCode = crypto.randomBytes(16).toString('hex');
  const deliveryCode = crypto.randomBytes(16).toString('hex');
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Insert pickup QR
    await client.query(
      `INSERT INTO qr_codes (delivery_id, code, type, expires_at)
       VALUES ($1, $2, 'pickup', $3)`,
      [deliveryId, pickupCode, expiresAt]
    );

    // Insert delivery QR
    await client.query(
      `INSERT INTO qr_codes (delivery_id, code, type, expires_at)
       VALUES ($1, $2, 'delivery', $3)`,
      [deliveryId, deliveryCode, expiresAt]
    );

    await client.query('COMMIT');

    // Generate QR code data URLs
    const pickupQRDataUrl = await QRCode.toDataURL(pickupCode);
    const deliveryQRDataUrl = await QRCode.toDataURL(deliveryCode);

    return {
      pickup: { code: pickupCode, qr_image: pickupQRDataUrl },
      delivery: { code: deliveryCode, qr_image: deliveryQRDataUrl },
      expires_at: expiresAt,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Scan/validate a QR code and advance delivery status.
 */
const scanQRCode = async (code, scannedByUserId) => {
  const { rows } = await db.query(
    `SELECT qr.*, d.status AS delivery_status, d.donation_id
     FROM qr_codes qr
     JOIN deliveries d ON d.id = qr.delivery_id
     WHERE qr.code = $1`,
    [code]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid QR code.');
    err.statusCode = 400;
    throw err;
  }

  const qrCode = rows[0];

  if (qrCode.is_scanned) {
    const err = new Error('QR code has already been scanned.');
    err.statusCode = 400;
    throw err;
  }

  if (new Date(qrCode.expires_at) < new Date()) {
    const err = new Error('QR code has expired.');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Mark QR as scanned
    await client.query(
      `UPDATE qr_codes SET is_scanned = TRUE, scanned_at = NOW(), scanned_by = $1 WHERE id = $2`,
      [scannedByUserId, qrCode.id]
    );

    // Advance delivery and donation status based on QR type
    if (qrCode.type === 'pickup') {
      await client.query(
        `UPDATE deliveries SET status = 'picked_up', pickup_time = NOW() WHERE id = $1`,
        [qrCode.delivery_id]
      );
      await client.query(
        `UPDATE food_donations SET status = 'collected' WHERE id = $1`,
        [qrCode.donation_id]
      );
    } else if (qrCode.type === 'delivery') {
      await client.query(
        `UPDATE deliveries SET status = 'delivered', delivery_time = NOW() WHERE id = $1`,
        [qrCode.delivery_id]
      );
      await client.query(
        `UPDATE food_donations SET status = 'delivered' WHERE id = $1`,
        [qrCode.donation_id]
      );
    }

    await client.query('COMMIT');

    return {
      type: qrCode.type,
      delivery_id: qrCode.delivery_id,
      scanned_at: new Date(),
      message: qrCode.type === 'pickup'
        ? 'Pickup confirmed. Food collected.'
        : 'Delivery confirmed. Food delivered.',
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Get QR codes for a delivery.
 */
const getQRCodesForDelivery = async (deliveryId) => {
  const { rows } = await db.query(
    'SELECT * FROM qr_codes WHERE delivery_id = $1',
    [deliveryId]
  );

  return rows;
};

module.exports = {
  generateQRCodes,
  scanQRCode,
  getQRCodesForDelivery,
};
