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
 * Get volunteer's active deliveries.
 */
const getMyDeliveries = async (userId) => {
  const { rows } = await db.query(
    `SELECT d.*, fd.title AS donation_title, fd.pickup_address,
            fd.latitude AS pickup_lat, fd.longitude AS pickup_lng,
            n.organization_name AS ngo_name, n.address AS ngo_address,
            n.latitude AS ngo_lat, n.longitude AS ngo_lng
     FROM deliveries d
     JOIN volunteers v ON v.id = d.volunteer_id
     JOIN food_donations fd ON fd.id = d.donation_id
     JOIN ngos n ON n.id = d.ngo_id
     WHERE v.user_id = $1
     ORDER BY d.created_at DESC`,
    [userId]
  );

  return rows;
};

module.exports = {
  rankVolunteers,
  updateAvailability,
  updateLocation,
  getMyDeliveries,
};
