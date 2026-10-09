const db = require('../../config/db');
const { haversineDistance } = require('../matching/matching.service');

/**
 * Get available volunteers ranked by distance from a donation's pickup location.
 */
const rankVolunteers = async (donationId) => {
  // Get donation location
  const donationResult = await db.query(
    'SELECT latitude, longitude FROM food_donations WHERE id = $1',
    [donationId]
  );

  if (donationResult.rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = donationResult.rows[0];

  // Get available volunteers with location
  const { rows: volunteers } = await db.query(
    `SELECT v.*, u.full_name, u.phone, u.email
     FROM volunteers v
     JOIN users u ON u.id = v.user_id
     WHERE v.availability = 'available'
       AND v.latitude IS NOT NULL
       AND v.longitude IS NOT NULL
       AND u.status = 'active'`
  );

  // Calculate distance and rank
  const rankedVolunteers = volunteers
    .map((v) => {
      const distanceKm = haversineDistance(
        donation.latitude, donation.longitude,
        v.latitude, v.longitude
      );
      return {
        ...v,
        distance_km: Math.round(distanceKm * 100) / 100,
        // Estimated time in minutes (assuming 30 km/h average)
        estimated_eta_min: Math.round((distanceKm / 30) * 60),
      };
    })
    .filter((v) => v.distance_km <= (v.max_distance_km || 10))
    .sort((a, b) => a.distance_km - b.distance_km);

  return rankedVolunteers;
};

/**
 * Update volunteer availability.
 */
const updateAvailability = async (userId, availability) => {
  const { rows } = await db.query(
    `UPDATE volunteers SET availability = $1 WHERE user_id = $2 RETURNING *`,
    [availability, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Volunteer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

/**
 * Update volunteer location.
 */
const updateLocation = async (userId, latitude, longitude) => {
  const { rows } = await db.query(
    `UPDATE volunteers SET latitude = $1, longitude = $2 WHERE user_id = $3 RETURNING *`,
    [latitude, longitude, userId]
  );

  if (rows.length === 0) {
    const err = new Error('Volunteer profile not found.');
    err.statusCode = 404;
    throw err;
  }

  return rows[0];
};

/**
 * Get volunteer's active and past deliveries with full metadata & QR status.
 */
const getMyDeliveries = async (userId) => {
  const { rows } = await db.query(
    `SELECT d.*,
            fd.id AS donation_id, fd.title AS donation_title, fd.description AS donation_description,
            fd.category, fd.quantity, fd.unit, fd.weight_kg, fd.image_url AS donation_image,
            fd.pickup_address, fd.pickup_window_start, fd.pickup_window_end, fd.expiry_time,
            fd.special_instructions, fd.status AS donation_status,
            fp.business_name AS provider_name, fp.address AS provider_address,
            u_p.full_name AS provider_contact_name, u_p.phone AS provider_phone,
            n.organization_name AS ngo_name, n.address AS ngo_address,
            u_n.full_name AS ngo_contact_name, u_n.phone AS ngo_phone,
            qr_p.code AS pickup_qr_code, qr_p.is_scanned AS pickup_qr_scanned,
            qr_d.code AS delivery_qr_code, qr_d.is_scanned AS delivery_qr_scanned
     FROM deliveries d
     JOIN volunteers v ON v.id = d.volunteer_id
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u_p ON u_p.id = fp.user_id
     JOIN ngos n ON n.id = d.ngo_id
     JOIN users u_n ON u_n.id = n.user_id
     LEFT JOIN qr_codes qr_p ON qr_p.delivery_id = d.id AND qr_p.type = 'pickup'
     LEFT JOIN qr_codes qr_d ON qr_d.delivery_id = d.id AND qr_d.type = 'delivery'
     WHERE v.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );

  return rows;
};

/**
 * Get all available unassigned delivery missions that volunteers can claim.
 */
const getAvailableMissions = async (userId) => {
  // First, ensure any claimed donation with volunteer pickup has a pending delivery record
  try {
    await db.query(
      `INSERT INTO deliveries (donation_id, ngo_id, status, pickup_type)
       SELECT c.donation_id, c.ngo_id, 'pending', COALESCE(c.pickup_type, 'volunteer')
       FROM donation_claims c
       JOIN food_donations fd ON fd.id = c.donation_id
       WHERE c.status = 'accepted'
         AND COALESCE(c.pickup_type, 'volunteer') = 'volunteer'
         AND fd.status IN ('claimed', 'matched', 'posted')
         AND NOT EXISTS (SELECT 1 FROM deliveries d WHERE d.donation_id = c.donation_id)`
    );
  } catch (syncErr) {
    console.warn('[DELIVERY] Auto-sync claimed donations warning:', syncErr.message);
  }

  const { rows } = await db.query(
    `SELECT d.id AS id, d.id AS delivery_id, d.status AS delivery_status,
            fd.id AS donation_id, fd.title AS donation_title, fd.description AS donation_description,
            fd.category, fd.quantity, fd.unit, fd.weight_kg, fd.image_url AS donation_image,
            fd.pickup_address, fd.latitude AS pickup_lat, fd.longitude AS pickup_lng,
            fd.pickup_window_start, fd.pickup_window_end, fd.expiry_time,
            fd.special_instructions, fd.status AS donation_status,
            fp.business_name AS provider_name, fp.address AS provider_address,
            u_p.full_name AS provider_contact_name, u_p.phone AS provider_phone,
            n.organization_name AS ngo_name, n.address AS ngo_address,
            u_n.full_name AS ngo_contact_name, u_n.phone AS ngo_phone
     FROM deliveries d
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u_p ON u_p.id = fp.user_id
     JOIN ngos n ON n.id = d.ngo_id
     JOIN users u_n ON u_n.id = n.user_id
     WHERE (d.volunteer_id IS NULL OR d.status = 'pending')
       AND COALESCE(d.pickup_type, 'volunteer') = 'volunteer'
       AND fd.status IN ('claimed', 'posted', 'matched', 'volunteer_assigned')
     ORDER BY d.created_at DESC`
  );

  return rows;
};

/**
 * Volunteer claims / accepts an available delivery mission.
 * Accepts either deliveryId or donationId.
 */
const claimMission = async (missionId, userId) => {
  const volResult = await db.query(
    'SELECT id FROM volunteers WHERE user_id = $1',
    [userId]
  );

  if (volResult.rows.length === 0) {
    const err = new Error('Volunteer profile not found. Complete volunteer profile first.');
    err.statusCode = 404;
    throw err;
  }

  const volunteerId = volResult.rows[0].id;
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Check if delivery exists
    let delRes = await client.query(
      `SELECT d.*, fd.title AS donation_title, fd.provider_id, fp.user_id AS provider_user_id,
              n.user_id AS ngo_user_id, u_vol.full_name AS volunteer_name
       FROM deliveries d
       JOIN food_donations fd ON fd.id = d.donation_id
       JOIN food_providers fp ON fp.id = fd.provider_id
       JOIN ngos n ON n.id = d.ngo_id
       JOIN volunteers v ON v.id = $1
       JOIN users u_vol ON u_vol.id = v.user_id
       WHERE (d.id = $2 OR d.donation_id = $2)
       FOR UPDATE`,
      [volunteerId, missionId]
    );

    // If delivery record doesn't exist yet, try finding accepted donation claim and inserting delivery
    if (delRes.rows.length === 0) {
      const claimRes = await client.query(
        `SELECT c.donation_id, c.ngo_id
         FROM donation_claims c
         WHERE (c.donation_id = $1 OR c.id = $1) AND c.status = 'accepted' LIMIT 1`,
        [missionId]
      );

      if (claimRes.rows.length > 0) {
        const ins = await client.query(
          `INSERT INTO deliveries (donation_id, ngo_id, status)
           VALUES ($1, $2, 'pending')
           RETURNING id`,
          [claimRes.rows[0].donation_id, claimRes.rows[0].ngo_id]
        );
        const newDeliveryId = ins.rows[0].id;
        delRes = await client.query(
          `SELECT d.*, fd.title AS donation_title, fd.provider_id, fp.user_id AS provider_user_id,
                  n.user_id AS ngo_user_id, u_vol.full_name AS volunteer_name
           FROM deliveries d
           JOIN food_donations fd ON fd.id = d.donation_id
           JOIN food_providers fp ON fp.id = fd.provider_id
           JOIN ngos n ON n.id = d.ngo_id
           JOIN volunteers v ON v.id = $1
           JOIN users u_vol ON u_vol.id = v.user_id
           WHERE d.id = $2
           FOR UPDATE`,
          [volunteerId, newDeliveryId]
        );
      }
    }

    if (delRes.rows.length === 0) {
      const err = new Error('Delivery mission not found or not yet claimed by an NGO.');
      err.statusCode = 404;
      throw err;
    }

    const delivery = delRes.rows[0];

    if (delivery.volunteer_id && delivery.volunteer_id !== volunteerId) {
      const err = new Error('This delivery mission has already been claimed by another volunteer.');
      err.statusCode = 409;
      throw err;
    }

    // Assign volunteer
    const { rows: updatedRows } = await client.query(
      `UPDATE deliveries
       SET volunteer_id = $1, status = 'accepted', updated_at = NOW()
       WHERE id = $2
       RETURNING *`,
      [volunteerId, delivery.id]
    );

    // Update donation status to volunteer_assigned
    await client.query(
      `UPDATE food_donations SET status = 'volunteer_assigned' WHERE id = $1`,
      [delivery.donation_id]
    );

    // Set volunteer availability to busy
    await client.query(
      `UPDATE volunteers SET availability = 'busy' WHERE id = $1`,
      [volunteerId]
    );

    await client.query('COMMIT');

    // Generate QR codes for the delivery
    try {
      const qrcodeService = require('../qrcodes/qrcode.service');
      await qrcodeService.generateQRCodes(delivery.id);
    } catch (qrErr) {
      console.error('[QR] Failed to generate QR codes on mission claim:', qrErr.message);
    }

    // Notify Provider and NGO
    try {
      const { createNotification } = require('../notifications/notification.service');
      if (delivery.provider_user_id) {
        createNotification({
          userId: delivery.provider_user_id,
          title: 'Volunteer Assigned to Pickup! 🛵',
          body: `Volunteer ${delivery.volunteer_name} has claimed pickup for "${delivery.donation_title}". Please show them your Pickup QR code upon arrival.`,
          type: 'in_app',
          data: { donation_id: delivery.donation_id, delivery_id: delivery.id, status: 'volunteer_assigned' },
        }).catch(() => {});
      }

      if (delivery.ngo_user_id) {
        createNotification({
          userId: delivery.ngo_user_id,
          title: 'Volunteer On The Way',
          body: `Volunteer ${delivery.volunteer_name} is picking up "${delivery.donation_title}".`,
          type: 'in_app',
          data: { donation_id: delivery.donation_id, delivery_id: delivery.id, status: 'volunteer_assigned' },
        }).catch(() => {});
      }
    } catch (notifErr) {
      console.error('[NOTIFY] Failed to notify on claim mission:', notifErr.message);
    }

    return updatedRows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  rankVolunteers,
  updateAvailability,
  updateLocation,
  getMyDeliveries,
  getAvailableMissions,
  claimMission,
};

