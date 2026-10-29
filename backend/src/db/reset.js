const fs = require('fs');
const path = require('path');
const bcrypt = require('bcryptjs');
const { pool, getClient } = require('../config/db');
const migrateIncidents = require('./migrate-incidents');
const migrateComplaints = require('./migrate-complaints');
const migrateDataIsolation = require('./migrate-data-isolation');

async function resetDatabase() {
  console.log('\n======================================================');
  console.log('🔄 STARTING COMPREHENSIVE DATABASE RESET & RE-SEED');
  console.log('======================================================');

  let client;
  try {
    client = await getClient();
    console.log('[RESET] 1. Dropping and re-creating public schema...');
    await client.query(`
      DROP SCHEMA IF EXISTS public CASCADE;
      CREATE SCHEMA public;
      GRANT ALL ON SCHEMA public TO public;
    `);
    console.log('✅ [RESET] Schema cleared.');

    console.log('[RESET] 2. Executing database/schema.sql...');
    const schemaPath = path.resolve(__dirname, '../../../database/schema.sql');
    const sql = fs.readFileSync(schemaPath, 'utf8');
    await client.query(sql);
    console.log('✅ [RESET] Base schema, tables, enums, triggers & indexes created.');

    console.log('[RESET] 3. Ensuring pickup_type columns...');
    await client.query(`
      ALTER TABLE deliveries ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
      ALTER TABLE donation_claims ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
      ALTER TABLE food_donations ADD COLUMN IF NOT EXISTS pickup_type VARCHAR(50) DEFAULT 'volunteer';
    `);
    console.log('✅ [RESET] pickup_type columns verified.');
  } catch (err) {
    console.error('❌ [RESET] Schema initialization failed:', err);
    throw err;
  } finally {
    if (client) client.release();
  }

  // Run specialized migrations
  console.log('[RESET] 4. Running Incidents migration...');
  await migrateIncidents();

  console.log('[RESET] 5. Running Complaints migration...');
  await migrateComplaints();

  console.log('[RESET] 6. Running Data Isolation migration...');
  await migrateDataIsolation();

  // Seed Clean Demo & Platform Data
  console.log('[RESET] 7. Seeding clean platform accounts and initial listings...');
  let seedClient;
  try {
    seedClient = await getClient();
    await seedClient.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Admin User
    const adminRes = await seedClient.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'admin', 'active', 'System Administrator', '+1 555-0100')
       RETURNING id, email, role`,
      ['admin@foodrescue.org', passwordHash]
    );
    const adminId = adminRes.rows[0]?.id;

    // 2. Provider User
    const providerRes = await seedClient.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'provider', 'active', 'Green Valley Bakery & Cafe', '+1 555-0101')
       RETURNING id, email, role`,
      ['provider@foodrescue.org', passwordHash]
    );
    const providerUserId = providerRes.rows[0]?.id;

    const fpRes = await seedClient.query(
      `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, is_verified)
       VALUES ($1, 'Green Valley Bakery & Cafe', 'Bakery & Deli', '124 Market St, Downtown', 37.7749, -122.4194, TRUE)
       RETURNING id`,
      [providerUserId]
    );
    const providerId = fpRes.rows[0]?.id;

    // 3. NGO User
    const ngoRes = await seedClient.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'ngo', 'active', 'Hope Harvest Community Shelter', '+1 555-0102')
       RETURNING id, email, role`,
      ['ngo@foodrescue.org', passwordHash]
    );
    const ngoUserId = ngoRes.rows[0]?.id;

    const ngoProfRes = await seedClient.query(
      `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, is_verified)
       VALUES ($1, 'Hope Harvest Community Shelter', 'NGO-88421-US', '450 Mission Blvd, San Francisco', 37.7790, -122.4180, 500, TRUE)
       RETURNING id`,
      [ngoUserId]
    );
    const ngoId = ngoProfRes.rows[0]?.id;

    // 4. Volunteer User
    const volRes = await seedClient.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'volunteer', 'active', 'Alex Morgan (Volunteer)', '+1 555-0103')
       RETURNING id, email, role`,
      ['volunteer@foodrescue.org', passwordHash]
    );
    const volUserId = volRes.rows[0]?.id;

    await seedClient.query(
      `INSERT INTO volunteers (user_id, availability, vehicle_type, max_distance_km)
       VALUES ($1, 'available', 'car', 15)`,
      [volUserId]
    );

    // 5. Initial Food Donations
    const now = new Date();
    const expirySoon = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const expiryTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    await seedClient.query(
      `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg, pickup_address, latitude, longitude, pickup_window_start, pickup_window_end, expiry_time, status)
       VALUES ($1, 'Fresh Artisan Sourdough & Pastries', '25 fresh loaves of organic sourdough bread and assorted fruit danishes packaged safely.', 'bakery', 35, 'items', 18.5, '124 Market St, Downtown', 37.7749, -122.4194, NOW(), NOW() + interval '4 hours', $2, 'posted')`,
      [providerId, expirySoon]
    );

    await seedClient.query(
      `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg, pickup_address, latitude, longitude, pickup_window_start, pickup_window_end, expiry_time, status)
       VALUES ($1, 'Gourmet Vegetable Pasta Trays', 'Hot prepared vegetable penne pasta with marinara, prepared this afternoon for an event.', 'cooked_meals', 50, 'servings', 22.0, '124 Market St, Downtown', 37.7749, -122.4194, NOW(), NOW() + interval '3 hours', $2, 'posted')`,
      [providerId, expiryTomorrow]
    );

    // 6. Initial Welcome Notifications
    await seedClient.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES
       ($1, 'in_app', 'Welcome to FoodRescue', 'Your provider account is active. You can now list surplus food anytime!'),
       ($2, 'in_app', 'New Surplus Nearby', 'Fresh Artisan Sourdough is available for rescue in your neighborhood.'),
       ($3, 'in_app', 'Ready for Missions', 'You are marked as available for rescue deliveries today.')`,
      [providerUserId, ngoUserId, volUserId]
    );

    await seedClient.query('COMMIT');
    console.log('✅ [RESET] Platform accounts and initial data seeded successfully.');
  } catch (seedErr) {
    if (seedClient) {
      try { await seedClient.query('ROLLBACK'); } catch (_) {}
    }
    console.error('❌ [RESET] Seeding failed:', seedErr);
    throw seedErr;
  } finally {
    if (seedClient) seedClient.release();
  }

  console.log('\n======================================================');
  console.log('🎉 DATABASE RESET & RE-SEED COMPLETED SUCCESSFULLY!');
  console.log('======================================================');
  console.log('Fresh Demo Accounts Ready:');
  console.log('  1. Provider  : provider@foodrescue.org  | password: password123');
  console.log('  2. NGO       : ngo@foodrescue.org       | password: password123');
  console.log('  3. Volunteer : volunteer@foodrescue.org | password: password123');
  console.log('  4. Admin     : admin@foodrescue.org     | password: password123');
  console.log('======================================================\n');
}

if (require.main === module) {
  resetDatabase()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = resetDatabase;
