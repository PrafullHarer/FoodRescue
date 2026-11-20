/**
 * model_inference.js
 * In-process, zero-dependency JavaScript inference engine for the trained
 * NGO and Volunteer smart matching models.
 */

const fs = require('fs');
const path = require('path');

const NGO_MODEL_PATH = path.join(__dirname, 'models', 'ngo_matching_model.json');
const VOL_MODEL_PATH = path.join(__dirname, 'models', 'volunteer_matching_model.json');

let ngoModel = null;
let volunteerModel = null;

try {
  if (fs.existsSync(NGO_MODEL_PATH)) {
    ngoModel = JSON.parse(fs.readFileSync(NGO_MODEL_PATH, 'utf8'));
  }
  if (fs.existsSync(VOL_MODEL_PATH)) {
    volunteerModel = JSON.parse(fs.readFileSync(VOL_MODEL_PATH, 'utf8'));
  }
} catch (err) {
  console.warn('[ML_INFERENCE] Warning: could not load model JSONs:', err.message);
}

const sigmoid = (z) => 1.0 / (1.0 + Math.exp(-Math.max(-20, Math.min(20, z))));

/**
 * Predict match probability for an NGO with a donation.
 * Strict Constraint: distance_km <= 20.0
 *
 * @param {Object} input
 * @param {number} input.distance_km - Distance from donation pickup in km
 * @param {number} input.donation_quantity - Number of servings/items
 * @param {number} input.ngo_capacity - NGO daily meal capacity
 * @param {number} input.food_category_match - 1.0 (preferred), 0.5 (neutral), 0.0 (unpreferred)
 * @param {number} input.hours_to_expiry - Hours until food expires
 * @param {number} input.days_since_last_donation - Recency of previous aid
 * @param {number} input.ngo_rating - Rating (0 to 5)
 * @param {number} input.ngo_completion_rate - Historical pickup completion (0 to 1)
 */
const predictNgoMatch = (input) => {
  const distanceKm = Number(input.distance_km || 0);

  // STRICT RULE: Only NGOs in the radius of 20km of the food provider
  if (distanceKm > 20.0) {
    return {
      isEligible: false,
      score: 0,
      probability: 0.0,
      reason: `Distance (${distanceKm.toFixed(1)} km) exceeds maximum allowed radius of 20.0 km.`,
      distance_km: distanceKm,
    };
  }

  const distanceRatio = Math.min(1.0, distanceKm / 20.0);
  const qty = Number(input.donation_quantity || 50);
  const capacity = Math.max(10, Number(input.ngo_capacity || 100));
  const capacityFitRatio = qty / capacity;
  const capacityOverflowRisk = capacityFitRatio > 1.0 ? 1 : 0;
  const catMatch = input.food_category_match !== undefined ? Number(input.food_category_match) : 0.7;
  const hoursExpiry = Math.max(0.5, Number(input.hours_to_expiry || 12));
  const daysSince = Math.max(0, Number(input.days_since_last_donation || 0));
  const rating = Number(input.ngo_rating || 4.0);
  const completionRate = Number(input.ngo_completion_rate || 0.9);

  if (!ngoModel) {
    // Fallback heuristic if model file missing
    const score = Math.max(10, Math.round((1 - distanceKm / 20) * 40 + catMatch * 25 + Math.min(1, 1 / capacityFitRatio) * 20 + (rating / 5) * 15));
    return {
      isEligible: true,
      score,
      probability: score / 100,
      reason: 'Rule-based heuristic fallback (model file not loaded).',
      distance_km: distanceKm,
    };
  }

  const featureVector = [
    distanceKm,
    distanceRatio,
    capacityFitRatio,
    capacityOverflowRisk,
    catMatch,
    hoursExpiry,
    daysSince,
    rating,
    completionRate,
    1 // is_within_20km
  ];

  // Standardize and compute dot product
  let z = ngoModel.intercept;
  for (let i = 0; i < featureVector.length; i++) {
    const mean = ngoModel.means[i];
    const std = ngoModel.stds[i] || 1.0;
    const scaled = (featureVector[i] - mean) / std;
    z += scaled * ngoModel.weights[i];
  }

  const probability = sigmoid(z);
  const score = Math.round(probability * 100);

  let recommendation = 'STANDARD';
  if (score >= 80) recommendation = 'TOP_MATCH';
  else if (score >= 60) recommendation = 'GOOD_MATCH';
  else if (score < 40) recommendation = 'LOW_AFFINITY';

  return {
    isEligible: true,
    score,
    probability: Math.round(probability * 1000) / 1000,
    recommendation,
    distance_km: distanceKm,
    breakdown: {
      distance_score: Math.round((1 - distanceRatio) * 100),
      capacity_fit: Math.round(Math.min(1.0, 1.0 / Math.max(0.5, capacityFitRatio)) * 100),
      category_alignment: Math.round(catMatch * 100),
      reliability: Math.round(completionRate * 100),
      hunger_urgency: Math.min(100, daysSince * 10),
    }
  };
};

/**
 * Predict pickup success probability for a volunteer.
 * Strict Constraint: Volunteer must be in 30km range of BOTH food provider AND NGO.
 *
 * @param {Object} input
 * @param {number} input.dist_to_provider_km - Distance from volunteer to food provider in km
 * @param {number} input.dist_to_ngo_km - Distance from volunteer to NGO shelter in km
 * @param {number} input.parcel_weight_kg - Weight of the donation in kg
 * @param {string} input.vehicle_type - 'bike', 'car', 'van', 'on_foot'
 * @param {number} input.volunteer_rating - Star rating (0 to 5)
 * @param {number} input.active_deliveries - Current count of in-progress deliveries
 * @param {number} input.volunteer_completion_rate - Historical completion rate (0 to 1)
 * @param {number} input.hours_to_expiry - Hours until food expiry
 */
const predictVolunteerMatch = (input) => {
  const distProvider = Number(input.dist_to_provider_km || 0);
  const distNgo = Number(input.dist_to_ngo_km || 0);

  // STRICT RULE: Volunteer must be <= 30km from BOTH Food Provider AND NGO
  const providerOk = distProvider <= 30.0;
  const ngoOk = distNgo <= 30.0;

  if (!providerOk || !ngoOk) {
    let failureReason = '';
    if (!providerOk && !ngoOk) {
      failureReason = `Volunteer is too far from both provider (${distProvider.toFixed(1)} km > 30km) and NGO (${distNgo.toFixed(1)} km > 30km).`;
    } else if (!providerOk) {
      failureReason = `Volunteer is too far from provider (${distProvider.toFixed(1)} km > 30km limit).`;
    } else {
      failureReason = `Volunteer is too far from NGO (${distNgo.toFixed(1)} km > 30km limit).`;
    }

    return {
      isEligible: false,
      score: 0,
      probability: 0.0,
      reason: failureReason,
      dist_to_provider_km: distProvider,
      dist_to_ngo_km: distNgo,
    };
  }

  const maxDist = Math.max(distProvider, distNgo);
  const totalRoute = distProvider + distNgo;
  const weight = Number(input.parcel_weight_kg || 10);
  const vehType = (input.vehicle_type || 'car').toLowerCase();

  // Vehicle capacity match logic
  let vehMatch = 1.0;
  if (vehType === 'on_foot') {
    vehMatch = weight <= 8 ? 1.0 : (weight <= 15 ? 0.4 : 0.05);
  } else if (vehType === 'bike') {
    vehMatch = weight <= 20 ? 1.0 : (weight <= 35 ? 0.6 : 0.15);
  } else if (vehType === 'car') {
    vehMatch = weight <= 80 ? 1.0 : 0.8;
  } else {
    vehMatch = 1.0; // Van
  }

  const speeds = { on_foot: 5, bike: 18, car: 35, van: 35 };
  const speed = speeds[vehType] || 30;
  const etaMinutes = (distProvider / speed) * 60;

  const rating = Number(input.volunteer_rating || 4.5);
  const activeDeliveries = Number(input.active_deliveries || 0);
  const completionRate = Number(input.volunteer_completion_rate || 0.95);
  const hoursExpiry = Number(input.hours_to_expiry || 12);

  if (!volunteerModel) {
    // Fallback heuristic if model file missing
    const score = Math.max(10, Math.round((1 - maxDist / 30) * 40 + vehMatch * 30 + (rating / 5) * 15 + Math.max(0, 1 - activeDeliveries * 0.4) * 15));
    return {
      isEligible: true,
      score,
      probability: score / 100,
      reason: 'Rule-based heuristic fallback.',
      dist_to_provider_km: distProvider,
      dist_to_ngo_km: distNgo,
    };
  }

  const featureVector = [
    distProvider,
    distNgo,
    maxDist,
    totalRoute,
    1, // both_within_30km is true
    weight,
    vehMatch,
    rating,
    activeDeliveries,
    completionRate,
    hoursExpiry,
    etaMinutes
  ];

  let z = volunteerModel.intercept;
  for (let i = 0; i < featureVector.length; i++) {
    const mean = volunteerModel.means[i];
    const std = volunteerModel.stds[i] || 1.0;
    const scaled = (featureVector[i] - mean) / std;
    z += scaled * volunteerModel.weights[i];
  }

  const probability = sigmoid(z);
  const score = Math.round(probability * 100);

  let recommendation = 'AVAILABLE';
  if (score >= 80) recommendation = 'PREFERRED_COURIER';
  else if (score >= 60) recommendation = 'RELIABLE';
  else if (score < 40) recommendation = 'CAPACITY_CONSTRAINED';

  return {
    isEligible: true,
    score,
    probability: Math.round(probability * 1000) / 1000,
    recommendation,
    dist_to_provider_km: distProvider,
    dist_to_ngo_km: distNgo,
    total_route_km: Math.round(totalRoute * 10) / 10,
    eta_minutes_to_pickup: Math.round(etaMinutes),
    breakdown: {
      pickup_proximity: Math.round((1 - distProvider / 30) * 100),
      dropoff_proximity: Math.round((1 - distNgo / 30) * 100),
      vehicle_suitability: Math.round(vehMatch * 100),
      reliability: Math.round(completionRate * 100),
      availability: Math.max(0, 100 - activeDeliveries * 35),
    }
  };
};

module.exports = {
  predictNgoMatch,
  predictVolunteerMatch,
  getNgoModelMeta: () => (ngoModel ? { version: ngoModel.version, metrics: ngoModel.metrics } : null),
  getVolunteerModelMeta: () => (volunteerModel ? { version: volunteerModel.version, metrics: volunteerModel.metrics } : null),
};
