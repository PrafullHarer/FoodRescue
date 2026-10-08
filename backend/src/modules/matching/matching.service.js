const db = require('../../config/db');
const { MATCHING_WEIGHTS } = require('../../config/constants');

/**
 * Smart Matching Engine
 *
 * Computes match score: M = wd·D + wq·Q + wf·F + wt·T + wp·P
 *
 * Where:
 *   D = Distance score (inverse of distance, closer = higher)
 *   Q = Quantity/Capacity match score
 *   F = Food preference alignment score
 *   T = Time urgency score (less time remaining = more urgent = higher)
 *   P = Past performance score (NGO reliability)
 */

/**
 * Calculate Haversine distance between two lat/lng points (in km).
 */
const haversineDistance = (lat1, lng1, lat2, lng2) => {
  const R = 6371; // Earth's radius in km
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const toRadians = (degrees) => degrees * (Math.PI / 180);

/**
 * Distance score: 1.0 for < 1 km, decaying to 0 at max range (50 km).
 */
const computeDistanceScore = (distanceKm) => {
  const MAX_RANGE = 50;
  if (distanceKm <= 1) return 1.0;
  if (distanceKm >= MAX_RANGE) return 0.0;
  return 1 - (distanceKm / MAX_RANGE);
};

/**
 * Quantity match score: how well does the NGO's capacity match the donation quantity.
 */
const computeQuantityScore = (donationQty, ngoCapacity) => {
  if (!ngoCapacity || ngoCapacity === 0) return 0.5; // neutral if capacity unknown
  const ratio = donationQty / ngoCapacity;
  if (ratio <= 1) return 1.0; // can handle full donation
  if (ratio <= 2) return 0.5; // can handle half
  return 0.2;
};

/**
 * Food preference alignment: does the NGO prefer this food category?
 */
const computeFoodPrefScore = (donationCategory, ngoPreferences) => {
  if (!ngoPreferences || ngoPreferences.length === 0) return 0.7; // no preference = accepts most
  if (ngoPreferences.includes(donationCategory)) return 1.0;
  return 0.3;
};

/**
 * Time urgency: closer to expiry = higher urgency = higher score.
 */
const computeTimeScore = (expiryTime) => {
  const now = Date.now();
  const expiry = new Date(expiryTime).getTime();
  const hoursLeft = (expiry - now) / (1000 * 60 * 60);

  if (hoursLeft <= 1) return 1.0;   // very urgent
  if (hoursLeft <= 3) return 0.9;
  if (hoursLeft <= 6) return 0.7;
  if (hoursLeft <= 12) return 0.5;
  if (hoursLeft <= 24) return 0.3;
  return 0.1;
};

/**
 * Past performance: based on successful pickups vs total claims.
 */
const computePerformanceScore = async (ngoId) => {
  const { rows } = await db.query(
    `SELECT
       COUNT(*) FILTER (WHERE status = 'accepted') AS accepted,
       COUNT(*) AS total
     FROM donation_claims
     WHERE ngo_id = $1`,
    [ngoId]
  );

  if (rows[0].total === 0) return 0.5; // new NGO, neutral score
  return parseFloat(rows[0].accepted) / parseFloat(rows[0].total);
};

/**
 * Match a donation to eligible NGOs and score them.
 *
 * @param {string} donationId - The donation to match
 * @returns {Array<{ngo_id, score, distance_km, scores_breakdown}>}
 */
const matchDonation = async (donationId) => {
  // Get donation details
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
    `SELECT n.*, u.status AS user_status
     FROM ngos n
     JOIN users u ON u.id = n.user_id
     WHERE n.is_verified = TRUE AND u.status = 'active'`
  );

  const scoredNgos = [];

  for (const ngo of ngosResult.rows) {
    // Calculate individual scores
    const distanceKm = haversineDistance(
      donation.latitude, donation.longitude,
      ngo.latitude, ngo.longitude
    );

    // Skip NGOs that are too far
    if (distanceKm > 50) continue;

    const D = computeDistanceScore(distanceKm);
    const Q = computeQuantityScore(donation.quantity, ngo.capacity);
    const F = computeFoodPrefScore(donation.category, ngo.food_preferences);
    const T = computeTimeScore(donation.expiry_time);
    const P = await computePerformanceScore(ngo.id);

    // Weighted composite score
    const score =
      MATCHING_WEIGHTS.distance * D +
      MATCHING_WEIGHTS.quantity * Q +
      MATCHING_WEIGHTS.foodPref * F +
      MATCHING_WEIGHTS.time * T +
      MATCHING_WEIGHTS.pastPerformance * P;

    scoredNgos.push({
      ngo_id: ngo.id,
      ngo_name: ngo.organization_name,
      user_id: ngo.user_id,
      score: Math.round(score * 1000) / 1000,
      distance_km: Math.round(distanceKm * 100) / 100,
      scores_breakdown: {
        distance: Math.round(D * 1000) / 1000,
        quantity: Math.round(Q * 1000) / 1000,
        food_preference: Math.round(F * 1000) / 1000,
        time_urgency: Math.round(T * 1000) / 1000,
        past_performance: Math.round(P * 1000) / 1000,
      },
    });
  }

  // Sort by score descending
  scoredNgos.sort((a, b) => b.score - a.score);

  return scoredNgos;
};

/**
 * Run matching for a donation and persist scored claims.
 * Transitions donation to 'matched' status.
 */
const matchAndNotify = async (donationId) => {
  const matches = await matchDonation(donationId);

  if (matches.length === 0) {
    return { matches: [], message: 'No eligible NGOs found within range.' };
  }

  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // Insert scored claims for top NGOs (top 10)
    const topMatches = matches.slice(0, 10);

    for (const match of topMatches) {
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

    return { matches: topMatches, message: `Matched with ${topMatches.length} NGOs.` };
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  matchDonation,
  matchAndNotify,
  haversineDistance,
};
