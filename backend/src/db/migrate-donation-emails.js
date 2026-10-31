/**
 * Migration: Donation Timeline Events & Completion Email Tracking
 * Creates donation_timeline_events and donation_completion_emails tables
 */
const db = require('../config/db');

async function migrateDonationEmails() {
  console.log('🔄 [MIGRATION] Starting Donation Timeline & Completion Emails migration...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Create donation_timeline_events table
    await client.query(`
      CREATE TABLE IF NOT EXISTS donation_timeline_events (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
        event_type VARCHAR(50) NOT NULL,
        event_timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_donation_timeline_events_donation 
        ON donation_timeline_events(donation_id, event_timestamp ASC);
      CREATE INDEX IF NOT EXISTS idx_donation_timeline_events_type 
        ON donation_timeline_events(event_type);
    `);
    console.log('  ✅ Created donation_timeline_events table and indexes');

    // 2. Create donation_completion_emails table
    await client.query(`
      CREATE TABLE IF NOT EXISTS donation_completion_emails (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
        recipient_type VARCHAR(20) NOT NULL,
        recipient_email VARCHAR(255) NOT NULL,
        recipient_name VARCHAR(255),
        status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
        subject VARCHAR(255),
        sent_at TIMESTAMPTZ,
        last_attempt_at TIMESTAMPTZ,
        retry_count INTEGER NOT NULL DEFAULT 0,
        failure_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        UNIQUE(donation_id, recipient_type)
      );

      CREATE INDEX IF NOT EXISTS idx_donation_completion_emails_donation 
        ON donation_completion_emails(donation_id);
      CREATE INDEX IF NOT EXISTS idx_donation_completion_emails_status 
        ON donation_completion_emails(status);
    `);
    console.log('  ✅ Created donation_completion_emails table and indexes');

    // 3. Backfill timeline events for existing completed / delivered donations
    const { rows: completedDonations } = await client.query(`
      SELECT 
        fd.id, 
        fd.created_at, 
        fd.status,
        c.claimed_at,
        c.created_at AS claim_created_at,
        d.created_at AS delivery_created_at,
        d.pickup_time,
        d.delivery_time,
        d.volunteer_id
      FROM food_donations fd
      LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
      LEFT JOIN deliveries d ON d.donation_id = fd.id
      WHERE fd.status IN ('delivered', 'completed')
    `);

    console.log(`  ℹ️ Found ${completedDonations.length} completed/delivered donations to backfill`);

    for (const d of completedDonations) {
      // DONATION_CREATED
      await client.query(`
        INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
        SELECT $1, 'DONATION_CREATED', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'DONATION_CREATED'
        )
      `, [d.id, d.created_at]);

      // DONATION_CLAIMED
      const claimTime = d.claimed_at || d.claim_created_at;
      if (claimTime) {
        await client.query(`
          INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
          SELECT $1, 'DONATION_CLAIMED', $2
          WHERE NOT EXISTS (
            SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'DONATION_CLAIMED'
          )
        `, [d.id, claimTime]);
      }

      // VOLUNTEER_ASSIGNED
      if (d.volunteer_id && d.delivery_created_at) {
        await client.query(`
          INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
          SELECT $1, 'VOLUNTEER_ASSIGNED', $2
          WHERE NOT EXISTS (
            SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'VOLUNTEER_ASSIGNED'
          )
        `, [d.id, d.delivery_created_at]);
      }

      // PICKUP_CONFIRMED & DELIVERY_STARTED
      if (d.pickup_time) {
        await client.query(`
          INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
          SELECT $1, 'PICKUP_CONFIRMED', $2
          WHERE NOT EXISTS (
            SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'PICKUP_CONFIRMED'
          )
        `, [d.id, d.pickup_time]);

        await client.query(`
          INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
          SELECT $1, 'DELIVERY_STARTED', $2
          WHERE NOT EXISTS (
            SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'DELIVERY_STARTED'
          )
        `, [d.id, d.pickup_time]);
      }

      // FOOD_RECEIVED & DONATION_COMPLETED
      const completeTime = d.delivery_time || d.created_at;
      await client.query(`
        INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
        SELECT $1, 'FOOD_RECEIVED', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'FOOD_RECEIVED'
        )
      `, [d.id, completeTime]);

      await client.query(`
        INSERT INTO donation_timeline_events (donation_id, event_type, event_timestamp)
        SELECT $1, 'DONATION_COMPLETED', $2
        WHERE NOT EXISTS (
          SELECT 1 FROM donation_timeline_events WHERE donation_id = $1 AND event_type = 'DONATION_COMPLETED'
        )
      `, [d.id, completeTime]);
    }

    await client.query('COMMIT');
    console.log('🎉 [MIGRATION] Donation Timeline & Completion Emails migration completed successfully!\n');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [MIGRATION ERROR]', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateDonationEmails()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateDonationEmails;

