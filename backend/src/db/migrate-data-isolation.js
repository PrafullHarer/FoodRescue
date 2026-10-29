/**
 * Migration: Data Isolation Indexes & Verification
 * Ensures optimal performance for scoped queries across donations, claims, and deliveries.
 */
const db = require('../config/db');

async function migrateDataIsolation() {
  console.log('--- RUNNING DATA ISOLATION MIGRATION ---');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Index on deliveries(ngo_id) for NGO delivery scoping
    console.log('1. Creating index idx_deliveries_ngo on deliveries(ngo_id)...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_ngo ON deliveries(ngo_id);
    `);

    // 2. Composite index on donation_claims(ngo_id, status) for fast claim lookups
    console.log('2. Creating composite index idx_donation_claims_ngo_status...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_donation_claims_ngo_status ON donation_claims(ngo_id, status);
    `);

    // 3. Composite index on food_donations(provider_id, status) for fast provider listings
    console.log('3. Creating composite index idx_food_donations_provider_status...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_food_donations_provider_status ON food_donations(provider_id, status);
    `);

    // 4. Index on deliveries(volunteer_id, status)
    console.log('4. Creating composite index idx_deliveries_volunteer_status...');
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_deliveries_volunteer_status ON deliveries(volunteer_id, status);
    `);

    await client.query('COMMIT');
    console.log('✅ Data isolation migration completed successfully!');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('❌ Data isolation migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateDataIsolation()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateDataIsolation;
