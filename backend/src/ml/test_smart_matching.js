/**
 * test_smart_matching.js
 * Comprehensive test script verifying:
 * 1. 20km NGO Matching Rule & ML Scoring
 * 2. 30km Dual-Radius Volunteer Matching Rule (Provider & NGO) & ML Scoring
 * 3. Spatial exclusion boundary test cases
 */

const {
  haversineDistance,
  NGO_MAX_RADIUS_KM,
  VOLUNTEER_MAX_RADIUS_KM
} = require('../modules/matching/matching.service');

const {
  predictNgoMatch,
  predictVolunteerMatch,
  getNgoModelMeta,
  getVolunteerModelMeta
} = require('./model_inference');

console.log('================================================================');
console.log('      SMART MATCHING ALGORITHM & ML MODEL VERIFICATION          ');
console.log('================================================================\n');

// 1. Check Model Metadata
console.log('--- 1. ML Model Artifacts & Evaluation Metrics ---');
const ngoMeta = getNgoModelMeta();
const volMeta = getVolunteerModelMeta();

console.log('NGO Matching Model:', JSON.stringify(ngoMeta, null, 2));
console.log('\nVolunteer Matching Model:', JSON.stringify(volMeta, null, 2));

console.log('\n--- 2. NGO 20km Radius Spatial Rule Tests ---');
// Provider location: Downtown San Francisco (37.7749, -122.4194)
const providerLocation = { lat: 37.7749, lng: -122.4194, name: 'Green Valley Bakery (Downtown SF)' };

const testNgos = [
  { name: 'Hope Harvest Shelter (Mission SF)', lat: 37.7599, lng: -122.4148, capacity: 250, pref: 1.0 },
  { name: 'Oakland Community Food Bank', lat: 37.8044, lng: -122.2712, capacity: 400, pref: 1.0 },
  { name: 'Daly City Relief Kitchen', lat: 37.6879, lng: -122.4702, capacity: 150, pref: 0.7 },
  { name: 'Berkeley Shelter Network', lat: 37.8715, lng: -122.2730, capacity: 300, pref: 1.0 },
  { name: 'San Mateo Community Pantry (Edge: ~27km)', lat: 37.5630, lng: -122.3255, capacity: 200, pref: 1.0 },
  { name: 'San Jose Urban Ministry (>60km)', lat: 37.3382, lng: -121.8863, capacity: 500, pref: 1.0 },
];

testNgos.forEach(ngo => {
  const dist = haversineDistance(providerLocation.lat, providerLocation.lng, ngo.lat, ngo.lng);
  const result = predictNgoMatch({
    distance_km: dist,
    donation_quantity: 60,
    ngo_capacity: ngo.capacity,
    food_category_match: ngo.pref,
    hours_to_expiry: 14,
    days_since_last_donation: 5,
    ngo_rating: 4.8,
    ngo_completion_rate: 0.95
  });

  const status = result.isEligible ? '✅ MATCHED & NOTIFIED' : '❌ EXCLUDED (Out of 20km Radius)';
  console.log(`NGO: ${ngo.name.padEnd(42)} | Dist: ${dist.toFixed(2).padStart(5)} km | Rule (<=20km): ${dist <= 20 ? 'PASS' : 'FAIL'} | Status: ${status} | Score: ${result.score}%`);
  if (!result.isEligible) {
    console.log(`   ↳ Exclusion Reason: ${result.reason}`);
  }
});

console.log('\n--- 3. Volunteer 30km Dual-Radius Spatial Rule Tests ---');
// Provider: SF (37.7749, -122.4194)
// NGO Shelter: Oakland (37.8044, -122.2712) - Provider to NGO is ~13.5 km
const ngoShelter = { lat: 37.8044, lng: -122.2712, name: 'Oakland Community Food Bank' };
const providerToNgoDist = haversineDistance(providerLocation.lat, providerLocation.lng, ngoShelter.lat, ngoShelter.lng);
console.log(`Mission Route: [${providerLocation.name}] ➔ [${ngoShelter.name}] (Direct Distance: ${providerToNgoDist.toFixed(2)} km)\n`);

const testVolunteers = [
  { name: 'Alex M. (Downtown SF)', lat: 37.7833, lng: -122.4167, vehicle: 'car', rating: 4.9, active: 0 },
  { name: 'Sarah T. (Oakland Hills)', lat: 37.8200, lng: -122.2400, vehicle: 'car', rating: 4.8, active: 0 },
  { name: 'David K. (Berkeley)', lat: 37.8715, lng: -122.2730, vehicle: 'bike', rating: 4.7, active: 0 },
  { name: 'Elena R. (San Mateo: ~25km from SF, ~27km from Oakland)', lat: 37.5630, lng: -122.3255, vehicle: 'van', rating: 5.0, active: 1 },
  { name: 'Marcus L. (San Rafael: ~22km from SF, ~26km from Oakland)', lat: 37.9735, lng: -122.5311, vehicle: 'car', rating: 4.6, active: 0 },
  { name: 'Brian P. (Palo Alto: ~44km from SF, ~42km from Oakland)', lat: 37.4419, lng: -122.1430, vehicle: 'car', rating: 4.9, active: 0 },
  { name: 'Chloe H. (San Jose: ~67km from SF, ~60km from Oakland)', lat: 37.3382, lng: -121.8863, vehicle: 'van', rating: 4.8, active: 0 },
];

testVolunteers.forEach(vol => {
  const distToProvider = haversineDistance(vol.lat, vol.lng, providerLocation.lat, providerLocation.lng);
  const distToNgo = haversineDistance(vol.lat, vol.lng, ngoShelter.lat, ngoShelter.lng);
  const bothWithin30km = distToProvider <= 30.0 && distToNgo <= 30.0;

  const result = predictVolunteerMatch({
    dist_to_provider_km: distToProvider,
    dist_to_ngo_km: distToNgo,
    parcel_weight_kg: 25.0,
    vehicle_type: vol.vehicle,
    volunteer_rating: vol.rating,
    active_deliveries: vol.active,
    volunteer_completion_rate: 0.98,
    hours_to_expiry: 12.0
  });

  const status = result.isEligible ? '✅ MATCHED & NOTIFIED' : '❌ EXCLUDED (Must be <=30km of BOTH)';
  console.log(`Volunteer: ${vol.name.padEnd(52)}`);
  console.log(`   Dist to Provider: ${distToProvider.toFixed(2).padStart(5)} km | Dist to Shelter: ${distToNgo.toFixed(2).padStart(5)} km | Dual 30km: ${bothWithin30km ? 'PASS' : 'FAIL'}`);
  console.log(`   Status: ${status} | Score: ${result.score}% | Recommendation: ${result.recommendation || 'N/A'}`);
  if (!result.isEligible) {
    console.log(`   ↳ Exclusion Reason: ${result.reason}`);
  }
  console.log('');
});

console.log('================================================================');
console.log('                  VERIFICATION COMPLETED                        ');
console.log('================================================================');
process.exit(0);
