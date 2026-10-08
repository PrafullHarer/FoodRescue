const bcrypt = require('bcryptjs');
const { pool } = require('../config/db');

async function seed() {
  console.log('[SEED] Seeding database with initial users and demo data...');
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash('password123', salt);

    // 1. Admin User
    const adminRes = await client.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'admin', 'active', 'System Administrator', '+1 555-0100')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id, email, role`,
      ['admin@foodrescue.org', passwordHash]
    );
    const adminId = adminRes.rows[0].id;

    // 2. Provider User
    const providerRes = await client.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'provider', 'active', 'Green Valley Bakery & Cafe', '+1 555-0101')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id, email, role`,
      ['provider@foodrescue.org', passwordHash]
    );
    const providerUserId = providerRes.rows[0].id;

    // Provider profile
    const fpRes = await client.query(
      `INSERT INTO food_providers (user_id, business_name, business_type, address, latitude, longitude, is_verified)
       VALUES ($1, 'Green Valley Bakery & Cafe', 'Bakery & Deli', '124 Market St, Downtown', 37.7749, -122.4194, TRUE)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [providerUserId]
    );
    let providerId = fpRes.rows[0]?.id;
    if (!providerId) {
      const existingFp = await client.query('SELECT id FROM food_providers WHERE user_id = $1', [providerUserId]);
      providerId = existingFp.rows[0].id;
    }

    // 3. NGO User
    const ngoRes = await client.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'ngo', 'active', 'Hope Harvest Community Shelter', '+1 555-0102')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id, email, role`,
      ['ngo@foodrescue.org', passwordHash]
    );
    const ngoUserId = ngoRes.rows[0].id;

    // NGO profile
    const ngoProfRes = await client.query(
      `INSERT INTO ngos (user_id, organization_name, registration_no, address, latitude, longitude, capacity, is_verified)
       VALUES ($1, 'Hope Harvest Community Shelter', 'NGO-88421-US', '450 Mission Blvd, San Francisco', 37.7790, -122.4180, 500, TRUE)
       ON CONFLICT DO NOTHING
       RETURNING id`,
      [ngoUserId]
    );
    let ngoId = ngoProfRes.rows[0]?.id;
    if (!ngoId) {
      const existingNgo = await client.query('SELECT id FROM ngos WHERE user_id = $1', [ngoUserId]);
      ngoId = existingNgo.rows[0].id;
    }

    // 4. Volunteer User
    const volRes = await client.query(
      `INSERT INTO users (email, password_hash, role, status, full_name, phone)
       VALUES ($1, $2, 'volunteer', 'active', 'Alex Morgan (Volunteer)', '+1 555-0103')
       ON CONFLICT (email) DO UPDATE SET password_hash = EXCLUDED.password_hash, status = 'active'
       RETURNING id, email, role`,
      ['volunteer@foodrescue.org', passwordHash]
    );
    const volUserId = volRes.rows[0].id;

    // Volunteer profile
    await client.query(
      `INSERT INTO volunteers (user_id, availability, vehicle_type, max_distance_km)
       VALUES ($1, 'available', 'car', 15)
       ON CONFLICT DO NOTHING`,
      [volUserId]
    );

    // 5. Sample Food Donations
    const now = new Date();
    const expirySoon = new Date(now.getTime() + 6 * 60 * 60 * 1000);
    const expiryTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000);

    const donation1 = await client.query(
      `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg, pickup_address, latitude, longitude, pickup_window_start, pickup_window_end, expiry_time, status)
       VALUES ($1, 'Fresh Artisan Sourdough & Pastries', '25 fresh loaves of organic sourdough bread and assorted fruit danishes packaged safely.', 'bakery', 35, 'items', 18.5, '124 Market St, Downtown', 37.7749, -122.4194, NOW(), NOW() + interval '4 hours', $2, 'posted')
       RETURNING id`,
      [providerId, expirySoon]
    );

    const donation2 = await client.query(
      `INSERT INTO food_donations
       (provider_id, title, description, category, quantity, unit, weight_kg, pickup_address, latitude, longitude, pickup_window_start, pickup_window_end, expiry_time, status)
       VALUES ($1, 'Gourmet Vegetable Pasta Trays', 'Hot prepared vegetable penne pasta with marinara, prepared this afternoon for an event.', 'cooked_meals', 50, 'servings', 22.0, '124 Market St, Downtown', 37.7749, -122.4194, NOW(), NOW() + interval '3 hours', $2, 'posted')
       RETURNING id`,
      [providerId, expiryTomorrow]
    );

    // 6. Notifications for users
    await client.query(
      `INSERT INTO notifications (user_id, type, title, body)
       VALUES
       ($1, 'in_app', 'Welcome to FoodRescue', 'Your provider account is active. You can now list surplus food anytime!'),
       ($2, 'in_app', 'New Surplus Nearby', 'Fresh Artisan Sourdough is available for rescue in your neighborhood.'),
       ($3, 'in_app', 'Ready for Missions', 'You are marked as available for rescue deliveries today.')`,
      [providerUserId, ngoUserId, volUserId]
    );

    await client.query('COMMIT');

    console.log('\n======================================================');
    console.log('✅ DATABASE SEEDING COMPLETED SUCCESSFULLY!');
    console.log('======================================================');
    console.log('Seed Accounts Ready:');
    console.log('1. Provider   : provider@foodrescue.org  | password: password123');
    console.log('2. NGO        : ngo@foodrescue.org       | password: password123');
    console.log('3. Volunteer  : volunteer@foodrescue.org | password: password123');
    console.log('4. Admin      : admin@foodrescue.org     | password: password123');
    console.log('======================================================\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('[SEED] Error during seeding:', err.message);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

if (require.main === module) {
  seed().catch(() => process.exit(1));
}

module.exports = seed;
