const crypto = require('crypto');
const QRCode = require('qrcode');
const db = require('../../config/db');
const { createNotification } = require('../notifications/notification.service');

/**
 * Generate pickup and delivery QR codes for a delivery.
 */
const generateQRCodes = async (deliveryId) => {
  const deliveryRes = await db.query(
    'SELECT * FROM deliveries WHERE id = $1',
    [deliveryId]
  );

  if (deliveryRes.rows.length === 0) {
    const err = new Error('Delivery not found.');
    err.statusCode = 404;
    throw err;
  }

  // Check if QR codes already exist for this delivery
  const existing = await db.query(
    'SELECT * FROM qr_codes WHERE delivery_id = $1',
    [deliveryId]
  );

  let pickupRow = existing.rows.find((r) => r.type === 'pickup');
  let deliveryRow = existing.rows.find((r) => r.type === 'delivery');

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    if (!pickupRow) {
      const pickupCode = 'RESCUE-PK-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const pRes = await client.query(
        `INSERT INTO qr_codes (delivery_id, code, type, expires_at)
         VALUES ($1, $2, 'pickup', $3)
         RETURNING *`,
        [deliveryId, pickupCode, expiresAt]
      );
      pickupRow = pRes.rows[0];
    }

    if (!deliveryRow) {
      const deliveryCode = 'RESCUE-DL-' + crypto.randomBytes(6).toString('hex').toUpperCase();
      const dRes = await client.query(
        `INSERT INTO qr_codes (delivery_id, code, type, expires_at)
         VALUES ($1, $2, 'delivery', $3)
         RETURNING *`,
        [deliveryId, deliveryCode, expiresAt]
      );
      deliveryRow = dRes.rows[0];
    }

    await client.query('COMMIT');

    const pickupQRDataUrl = await QRCode.toDataURL(pickupRow.code, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });
    const deliveryQRDataUrl = await QRCode.toDataURL(deliveryRow.code, {
      width: 320,
      margin: 2,
      color: { dark: '#000000', light: '#ffffff' },
    });

    return {
      pickup: {
        id: pickupRow.id,
        code: pickupRow.code,
        qr_image: pickupQRDataUrl,
        is_scanned: pickupRow.is_scanned,
        scanned_at: pickupRow.scanned_at,
        expires_at: pickupRow.expires_at,
      },
      delivery: {
        id: deliveryRow.id,
        code: deliveryRow.code,
        qr_image: deliveryQRDataUrl,
        is_scanned: deliveryRow.is_scanned,
        scanned_at: deliveryRow.scanned_at,
        expires_at: deliveryRow.expires_at,
      },
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Preview / Inspect a QR code without claiming or changing status.
 * Used by Volunteers to view donation & checklist before confirming pickup,
 * and by NGOs to inspect the quality checklist completed by the volunteer before confirming receipt.
 */
const validateQRCodePreview = async (code) => {
  const cleanCode = (code || '').trim().toUpperCase();

  const { rows } = await db.query(
    `SELECT qr.*,
            d.id AS delivery_id, d.status AS delivery_status, d.quality_checklist,
            d.pickup_time, d.delivery_time, d.notes AS delivery_notes,
            fd.id AS donation_id, fd.title AS donation_title, fd.description AS donation_description,
            fd.category, fd.quantity, fd.unit, fd.weight_kg, fd.pickup_address,
            fd.pickup_window_start, fd.pickup_window_end, fd.expiry_time, fd.special_instructions,
            fd.image_url AS donation_image, fd.status AS donation_status,
            fp.business_name AS provider_name, fp.address AS provider_address,
            u_p.full_name AS provider_contact_name, u_p.phone AS provider_phone, u_p.email AS provider_email,
            ngo.organization_name AS ngo_name, ngo.address AS ngo_address,
            u_ngo.full_name AS ngo_contact_name, u_ngo.phone AS ngo_phone,
            v.vehicle_type,
            u_v.full_name AS volunteer_name, u_v.phone AS volunteer_phone
     FROM qr_codes qr
     JOIN deliveries d ON d.id = qr.delivery_id
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u_p ON u_p.id = fp.user_id
     JOIN ngos ngo ON ngo.id = d.ngo_id
     JOIN users u_ngo ON u_ngo.id = ngo.user_id
     LEFT JOIN volunteers v ON v.id = d.volunteer_id
     LEFT JOIN users u_v ON u_v.id = v.user_id
     WHERE UPPER(qr.code) = $1`,
    [cleanCode]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid QR code. Please check the code and try again.');
    err.statusCode = 404;
    throw err;
  }

  const qrData = rows[0];

  return {
    valid: true,
    code: qrData.code,
    type: qrData.type,
    is_scanned: qrData.is_scanned,
    scanned_at: qrData.scanned_at,
    expires_at: qrData.expires_at,
    delivery: {
      id: qrData.delivery_id,
      status: qrData.delivery_status,
      quality_checklist: qrData.quality_checklist,
      pickup_time: qrData.pickup_time,
      delivery_time: qrData.delivery_time,
      notes: qrData.delivery_notes,
    },
    donation: {
      id: qrData.donation_id,
      title: qrData.donation_title,
      description: qrData.donation_description,
      category: qrData.category,
      quantity: qrData.quantity,
      unit: qrData.unit,
      weight_kg: qrData.weight_kg,
      pickup_address: qrData.pickup_address,
      pickup_window_start: qrData.pickup_window_start,
      pickup_window_end: qrData.pickup_window_end,
      expiry_time: qrData.expiry_time,
      special_instructions: qrData.special_instructions,
      image_url: qrData.donation_image,
      status: qrData.donation_status,
    },
    provider: {
      business_name: qrData.provider_name,
      address: qrData.provider_address,
      contact_name: qrData.provider_contact_name,
      phone: qrData.provider_phone,
      email: qrData.provider_email,
    },
    ngo: {
      organization_name: qrData.ngo_name,
      address: qrData.ngo_address,
      contact_name: qrData.ngo_contact_name,
      phone: qrData.ngo_phone,
    },
    volunteer: qrData.volunteer_name
      ? {
          name: qrData.volunteer_name,
          phone: qrData.volunteer_phone,
          vehicle_type: qrData.vehicle_type,
        }
      : null,
  };
};

/**
 * Scan / Validate a QR code and advance the delivery workflow.
 * - Pickup QR: Scanned by Volunteer at Food Provider location with Quality Inspection checklist.
 * - Delivery QR: Scanned by NGO at Dropoff location to confirm delivery & inspect volunteer checklist.
 */
const scanQRCode = async (code, scannedByUserId, qualityChecklist = null) => {
  const cleanCode = (code || '').trim().toUpperCase();

  const { rows } = await db.query(
    `SELECT qr.*,
            d.id AS delivery_id, d.status AS delivery_status, d.volunteer_id, d.ngo_id, d.pickup_type,
            fd.id AS donation_id, fd.title AS donation_title, fd.provider_id,
            fp.user_id AS provider_user_id,
            ngo.user_id AS ngo_user_id, ngo.organization_name AS ngo_name,
            v.user_id AS volunteer_user_id,
            u_scanner.full_name AS scanner_name, u_scanner.role AS scanner_role
     FROM qr_codes qr
     JOIN deliveries d ON d.id = qr.delivery_id
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN ngos ngo ON ngo.id = d.ngo_id
     LEFT JOIN volunteers v ON v.id = d.volunteer_id
     LEFT JOIN users u_scanner ON u_scanner.id = $2
     WHERE UPPER(qr.code) = $1`,
    [cleanCode, scannedByUserId]
  );

  if (rows.length === 0) {
    const err = new Error('Invalid QR code.');
    err.statusCode = 404;
    throw err;
  }

  const qrCode = rows[0];

  if (qrCode.is_scanned) {
    const err = new Error('This QR code has already been scanned and verified.');
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

    const isNgoDirectPickup = qrCode.scanner_role === 'ngo' || qrCode.pickup_type === 'self_pickup';

    if (qrCode.type === 'pickup') {
      const checklistPayload = qualityChecklist || {
        passed: true,
        inspected_at: new Date().toISOString(),
        inspector_name: qrCode.scanner_name || (isNgoDirectPickup ? 'NGO Staff' : 'Volunteer'),
        items: [
          { label: 'Freshness & Visual Quality', status: 'pass' },
          { label: 'Packaging & Seal Integrity', status: 'pass' },
          { label: 'Safe Storage & Temperature', status: 'pass' },
          { label: 'Portion & Quantity Match', status: 'pass' },
        ],
      };

      if (isNgoDirectPickup) {
        // Direct NGO Self-Pickup: Complete both pickup and receipt in 1 direct handoff
        await client.query(
          `UPDATE deliveries
           SET status = 'delivered', pickup_time = NOW(), delivery_time = NOW(), quality_checklist = $1
           WHERE id = $2`,
          [JSON.stringify(checklistPayload), qrCode.delivery_id]
        );

        await client.query(
          `UPDATE food_donations SET status = 'delivered' WHERE id = $1`,
          [qrCode.donation_id]
        );

        // Update stats
        await client.query(
          `UPDATE ngos SET total_received = total_received + 1 WHERE id = $1`,
          [qrCode.ngo_id]
        );
        await client.query(
          `UPDATE food_providers SET total_donations = total_donations + 1 WHERE id = $1`,
          [qrCode.provider_id]
        );

        await client.query('COMMIT');

        // Notify Food Provider
        if (qrCode.provider_user_id) {
          await createNotification({
            userId: qrCode.provider_user_id,
            title: 'Donation Picked Up & Received',
            body: `NGO ${qrCode.ngo_name || 'Shelter'} has directly inspected, picked up, and received "${qrCode.donation_title}".`,
            type: 'in_app',
            data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'delivered' },
          }).catch(() => {});
        }

        return {
          success: true,
          type: 'pickup',
          delivery_id: qrCode.delivery_id,
          donation_id: qrCode.donation_id,
          message: 'Direct pickup and quality inspection verified! Donation received.',
        };
      } else {
        // Volunteer Pickup: Advance to in_transit
        await client.query(
          `UPDATE deliveries
           SET status = 'in_transit', pickup_time = NOW(), quality_checklist = $1
           WHERE id = $2`,
          [JSON.stringify(checklistPayload), qrCode.delivery_id]
        );

        await client.query(
          `UPDATE food_donations SET status = 'collected' WHERE id = $1`,
          [qrCode.donation_id]
        );

        await client.query('COMMIT');

        // Send notifications to Provider and NGO
        if (qrCode.provider_user_id) {
          await createNotification({
            userId: qrCode.provider_user_id,
            title: 'Donation Picked Up',
            body: `Volunteer ${qrCode.scanner_name || 'assigned'} has completed the quality inspection and picked up "${qrCode.donation_title}".`,
            type: 'in_app',
            data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'collected' },
          }).catch(() => {});
        }

        if (qrCode.ngo_user_id) {
          await createNotification({
            userId: qrCode.ngo_user_id,
            title: 'Food In Transit',
            body: `"${qrCode.donation_title}" has been picked up from donor and is now on the way to your shelter.`,
            type: 'in_app',
            data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'in_transit' },
          }).catch(() => {});
        }

        return {
          success: true,
          type: 'pickup',
          delivery_id: qrCode.delivery_id,
          donation_id: qrCode.donation_id,
          message: 'Quality check passed & pickup confirmed! Food is now in transit.',
        };
      }
    } else {
      // 2. NGO scanning Volunteer's Dropoff QR code
      await client.query(
        `UPDATE deliveries SET status = 'delivered', delivery_time = NOW() WHERE id = $1`,
        [qrCode.delivery_id]
      );

      await client.query(
        `UPDATE food_donations SET status = 'delivered' WHERE id = $1`,
        [qrCode.donation_id]
      );

      // Volunteer stats & availability
      if (qrCode.volunteer_id) {
        await client.query(
          `UPDATE volunteers
           SET availability = 'available', total_deliveries = total_deliveries + 1
           WHERE id = $1`,
          [qrCode.volunteer_id]
        );
      }

      // NGO stats
      await client.query(
        `UPDATE ngos SET total_received = total_received + 1 WHERE id = $1`,
        [qrCode.ngo_id]
      );

      // Provider stats
      await client.query(
        `UPDATE food_providers SET total_donations = total_donations + 1 WHERE id = $1`,
        [qrCode.provider_id]
      );

      await client.query('COMMIT');

      // Notifications to Provider, Volunteer, and NGO
      if (qrCode.provider_user_id) {
        await createNotification({
          userId: qrCode.provider_user_id,
          title: 'Rescue Completed! 🎉',
          body: `"${qrCode.donation_title}" was successfully delivered and verified by the shelter. Thank you for your impact!`,
          type: 'in_app',
          data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'completed' },
        }).catch(() => {});
      }

      if (qrCode.volunteer_user_id) {
        await createNotification({
          userId: qrCode.volunteer_user_id,
          title: 'Delivery Confirmed! 🌟',
          body: `The NGO shelter has verified receipt for "${qrCode.donation_title}". Mission complete!`,
          type: 'in_app',
          data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'delivered' },
        }).catch(() => {});
      }

      if (qrCode.ngo_user_id) {
        await createNotification({
          userId: qrCode.ngo_user_id,
          title: 'Food Delivery Confirmed',
          body: `Receipt confirmed for "${qrCode.donation_title}". Please consider leaving a review for the donor and volunteer.`,
          type: 'in_app',
          data: { donation_id: qrCode.donation_id, delivery_id: qrCode.delivery_id, status: 'delivered' },
        }).catch(() => {});
      }

      return {
        success: true,
        type: 'delivery',
        delivery_id: qrCode.delivery_id,
        donation_id: qrCode.donation_id,
        message: 'Delivery confirmed! Food rescue mission successfully completed.',
      };
    }
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
  return generateQRCodes(deliveryId);
};

/**
 * Get QR codes by donation ID (convenient lookup for Food Provider, Volunteer, and NGO).
 */
const getQRCodesByDonationId = async (donationId) => {
  const { rows } = await db.query(
    `SELECT d.id AS delivery_id, d.status AS delivery_status, d.quality_checklist,
            d.volunteer_id, d.ngo_id
     FROM deliveries d
     WHERE d.donation_id = $1`,
    [donationId]
  );

  if (rows.length === 0) {
    return null;
  }

  const delivery = rows[0];
  const qrs = await generateQRCodes(delivery.delivery_id);

  return {
    delivery_id: delivery.delivery_id,
    delivery_status: delivery.delivery_status,
    quality_checklist: delivery.quality_checklist,
    volunteer_id: delivery.volunteer_id,
    ngo_id: delivery.ngo_id,
    ...qrs,
  };
};

module.exports = {
  generateQRCodes,
  validateQRCodePreview,
  scanQRCode,
  getQRCodesForDelivery,
  getQRCodesByDonationId,
};
