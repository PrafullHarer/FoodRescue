const db = require('../../config/db');
const { MATCHING_WEIGHTS } = require('../../config/constants');
const { predictNgoMatch, predictVolunteerMatch } = require('../../ml/model_inference');

/**
 * Spatial Boundary Constants
 */
const NGO_MAX_RADIUS_KM = 20.0;
const VOLUNTEER_MAX_RADIUS_KM = 30.0;

/**
 * Calculate Haversine distance between two lat/lng points (in km).
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  if (lat1 === null || lat1 === undefined || lng1 === null || lng1 === undefined ||
      lat2 === null || lat2 === undefined || lng2 === null || lng2 === undefined) {
    return Infinity;
  }
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(Number(lat2) - Number(lat1));
  const dLng = toRadians(Number(lng2) - Number(lng1));
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(Number(lat1))) * Math.cos(toRadians(Number(lat2))) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Get days since last donation accepted by this NGO.
 */
const getDaysSinceLastDonation = async (ngoId) => {
  const { rows } = await db.query(
    `SELECT MAX(claimed_at) as last_claimed
     FROM donation_claims
     WHERE ngo_id = $1 AND status = 'accepted'`,
    [ngoId]
  );
  if (!rows[0] || !rows[0].last_claimed) return 30; // 30+ days (high urgency)
  const diffMs = Date.now() - new Date(rows[0].last_claimed).getTime();
  return Math.min(30, Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24))));
};

/**
 * Get NGO historical completion rate and rating.
 */
const getNgoHistory = async (ngoId) => {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
       COUNT(*) AS total
     FROM donation_claims
     WHERE ngo_id = $1`,
    [ngoId]
  );

  const total = parseInt(rows[0]?.total || 0, 10);
  const accepted = parseInt(rows[0]?.accepted || 0, 10);
  const completionRate = total === 0 ? 0.90 : (accepted / total);

  // Review rating
  const { rows: reviewRows } = await db.query(
    `SELECT AVG(rating) as avg_rating
     FROM reviews
     WHERE reviewee_id = (SELECT user_id FROM ngos WHERE id = $1)`,
    [ngoId]
  );
  const avgRating = reviewRows[0]?.avg_rating ? parseFloat(reviewRows[0].avg_rating) : 4.5;

  return { completionRate, avgRating };
};

/**
 * Match a donation to eligible NGOs strictly within 20km radius of the food provider.
 * Uses ML model inference to predict match suitability.
 *
 * @param {string} donationId
 * @returns {Promise<Array>} Array of matched, ranked NGOs within 20km
 */
const matchDonation = async (donationId) => {
  const donationResult = await db.query(
    'SELECT * FROM food_donations WHERE id = $1',
    [donationId]
  );

  if (donationResult.rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }

  const donation = donationResult.rows[0];

  // Get all verified, active NGOs
  const ngosResult = await db.query(
    `SELECT n.*, u.status AS user_status, u.full_name AS contact_name, u.email, u.phone
     FROM ngos n
     JOIN users u ON u.id = n.user_id
     WHERE n.is_verified = TRUE AND u.status = 'active'`
  );

  const hoursToExpiry = donation.expiry_time
    ? Math.max(0.5, (new Date(donation.expiry_time).getTime() - Date.now()) / (1000 * 60 * 60))
    : 12.0;

  const scoredNgos = [];

  for (const ngo of ngosResult.rows) {
    // 1. Calculate Haversine distance from food provider pickup location
    const distanceKm = haversineDistance(
      donation.latitude, donation.longitude,
      ngo.latitude, ngo.longitude
    );

    // 2. STRICT RULE: Only NGOs in the radius of 20km of the food provider
    if (distanceKm > NGO_MAX_RADIUS_KM) {
      continue; // Strictly exclude NGOs outside 20km
    }

    // Category preference match
    let categoryMatch = 0.7; // default neutral
    if (Array.isArray(ngo.food_preferences) && ngo.food_preferences.length > 0) {
      categoryMatch = ngo.food_preferences.includes(donation.category) ? 1.0 : 0.2;
    }

    // Historical data
    const daysSince = await getDaysSinceLastDonation(ngo.id);
    const { completionRate, avgRating } = await getNgoHistory(ngo.id);

    // 3. ML Model prediction
    const mlResult = predictNgoMatch({
      distance_km: distanceKm,
      donation_quantity: donation.quantity,
      ngo_capacity: ngo.capacity,
      food_category_match: categoryMatch,
      hours_to_expiry: hoursToExpiry,
      days_since_last_donation: daysSince,
      ngo_rating: avgRating,
      ngo_completion_rate: completionRate,
    });

    if (mlResult.isEligible) {
      scoredNgos.push({
        ngo_id: ngo.id,
        ngo_name: ngo.organization_name,
        user_id: ngo.user_id,
        contact_name: ngo.contact_name,
        phone: ngo.phone,
        email: ngo.email,
        score: mlResult.score,
        probability: mlResult.probability,
        recommendation: mlResult.recommendation,
        distance_km: Math.round(distanceKm * 100) / 100,
        within_radius_km: NGO_MAX_RADIUS_KM,
        scores_breakdown: mlResult.breakdown,
      });
    }
  }

  // Sort descending by ML match score
  scoredNgos.sort((a, b) => b.score - a.score);

  return scoredNgos;
};

/**
 * Match eligible volunteers for a donation pickup.
 * STRICT RULE: Volunteer MUST be within 30km of BOTH the food provider AND the NGO.
 *
 * @param {string} donationId - Donation ID
 * @param {string} ngoId - Destination NGO ID
 * @returns {Promise<Array>} Array of matched, ranked volunteers
 */
const matchVolunteersForPickup = async (donationId, ngoId) => {
  // 1. Get donation (provider location)
  const donationRes = await db.query(
    'SELECT id, title, quantity, unit, weight_kg, latitude, longitude, expiry_time FROM food_donations WHERE id = $1',
    [donationId]
  );
  if (donationRes.rows.length === 0) {
    const err = new Error('Donation not found.');
    err.statusCode = 404;
    throw err;
  }
  const donation = donationRes.rows[0];

  // 2. Get NGO (destination location)
  const ngoRes = await db.query(
    'SELECT id, organization_name, latitude, longitude, address FROM ngos WHERE id = $1',
    [ngoId]
  );
  if (ngoRes.rows.length === 0) {
    const err = new Error('NGO not found.');
    err.statusCode = 404;
    throw err;
  }
  const ngo = ngoRes.rows[0];

  // 3. Query active volunteers with coordinates
  const { rows: volunteers } = await db.query(
    `SELECT v.*, u.full_name, u.phone, u.email,
       (SELECT COUNT(*) FROM deliveries d WHERE d.volunteer_id = v.id AND d.status IN ('assigned', 'picked_up', 'in_transit')) AS active_deliveries
     FROM volunteers v
     JOIN users u ON u.id = v.user_id
     WHERE u.status = 'active'
       AND v.availability IN ('available', 'busy')
       AND v.latitude IS NOT NULL
       AND v.longitude IS NOT NULL`
  );

  const hoursToExpiry = donation.expiry_time
    ? Math.max(0.5, (new Date(donation.expiry_time).getTime() - Date.now()) / (1000 * 60 * 60))
    : 12.0;

  const parcelWeight = donation.weight_kg || (donation.quantity * 0.4);

  const scoredVolunteers = [];

  for (const vol of volunteers) {
    // Distance from volunteer to food provider
    const distToProvider = haversineDistance(
      vol.latitude, vol.longitude,
      donation.latitude, donation.longitude
    );

    // Distance from volunteer to NGO shelter
    const distToNgo = haversineDistance(
      vol.latitude, vol.longitude,
      ngo.latitude, ngo.longitude
    );

    // STRICT DUAL-RADIUS RULE:
    // Volunteer MUST be <= 30km from BOTH Food Provider AND NGO
    if (distToProvider > VOLUNTEER_MAX_RADIUS_KM || distToNgo > VOLUNTEER_MAX_RADIUS_KM) {
      continue; // Exclude if outside 30km of either endpoint
    }

    // Historical volunteer performance
    const totalDeliveries = parseInt(vol.total_deliveries || 0, 10);
    const completionRate = totalDeliveries === 0 ? 0.95 : 0.98;

    // ML Model prediction
    const mlResult = predictVolunteerMatch({
      dist_to_provider_km: distToProvider,
      dist_to_ngo_km: distToNgo,
      parcel_weight_kg: parcelWeight,
      vehicle_type: vol.vehicle_type || 'car',
      volunteer_rating: vol.rating || 4.5,
      active_deliveries: parseInt(vol.active_deliveries || 0, 10),
      volunteer_completion_rate: completionRate,
      hours_to_expiry: hoursToExpiry,
    });

    if (mlResult.isEligible) {
      scoredVolunteers.push({
        volunteer_id: vol.id,
        user_id: vol.user_id,
        full_name: vol.full_name,
        phone: vol.phone,
        email: vol.email,
        vehicle_type: vol.vehicle_type || 'car',
        score: mlResult.score,
        probability: mlResult.probability,
        recommendation: mlResult.recommendation,
        dist_to_provider_km: Math.round(distToProvider * 100) / 100,
        dist_to_ngo_km: Math.round(distToNgo * 100) / 100,
        total_route_km: mlResult.total_route_km,
        eta_minutes_to_pickup: mlResult.eta_minutes_to_pickup,
        within_radius_km: VOLUNTEER_MAX_RADIUS_KM,
        scores_breakdown: mlResult.breakdown,
      });
    }
  }

  // Sort descending by volunteer match score
  scoredVolunteers.sort((a, b) => b.score - a.score);

  return scoredVolunteers;
};

/**
 * Run smart matching for a donation, persist scored claims for eligible NGOs within 20km,
 * and dispatch notifications to only eligible NGOs.
 */
const matchAndNotify = async (donationId) => {
  const matches = await matchDonation(donationId);

  if (matches.length === 0) {
    return { matches: [], message: `No eligible NGOs found within ${NGO_MAX_RADIUS_KM}km radius of the food provider.` };
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Insert scored claims for eligible NGOs within 20km
    for (const match of matches) {
      await client.query(
        `INSERT INTO donation_claims (donation_id, ngo_id, match_score, status)
         VALUES ($1, $2, $3, 'pending')
         ON CONFLICT (donation_id, ngo_id) DO UPDATE SET match_score = $3`,
        [donationId, match.ngo_id, match.score]
      );
    }

    // Transition donation status to 'matched'
    await client.query(
      `UPDATE food_donations SET status = 'matched' WHERE id = $1 AND status = 'posted'`,
      [donationId]
    );

    await client.query('COMMIT');

    // Asynchronously notify eligible NGOs within 20km
    const notificationService = require('../notifications/notification.service');
    const { rows: donationRows } = await db.query('SELECT * FROM food_donations WHERE id = $1', [donationId]);
    if (donationRows.length > 0) {
      notificationService.notifyEligibleNgosOfDonation(donationRows[0], matches).catch(err => {
        console.error('[NOTIFY] Error notifying eligible NGOs:', err.message);
      });
    }

    return {
      matches,
      radius_km: NGO_MAX_RADIUS_KM,
      message: `Successfully matched and alerted ${matches.length} eligible NGO(s) within ${NGO_MAX_RADIUS_KM}km radius.`
    };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  haversineDistance,
  NGO_MAX_RADIUS_KM,
  VOLUNTEER_MAX_RADIUS_KM,
  matchDonation,
  matchVolunteersForPickup,
  matchAndNotify,
  ...require('./claim-ranking.service'),
};
