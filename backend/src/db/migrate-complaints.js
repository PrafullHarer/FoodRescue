const db = require('../config/db');

async function migrateComplaints() {
  console.log('🚀 [MIGRATION] Running Complaint Management System migration...');

  try {
    // 1. Ensure uuid extension
    await db.query(`CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`);

    // 2. Check if complaints table exists. If not, create it from scratch.
    await db.query(`
      CREATE TABLE IF NOT EXISTS complaints (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        complaint_reference VARCHAR(50) UNIQUE,
        reporter_id UUID REFERENCES users(id) ON DELETE SET NULL,
        complainant_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        reported_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        donation_id UUID REFERENCES food_donations(id) ON DELETE SET NULL,
        delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
        category VARCHAR(100) NOT NULL,
        title VARCHAR(255),
        subject VARCHAR(255),
        description TEXT NOT NULL,
        priority VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(50) NOT NULL DEFAULT 'submitted',
        assigned_admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        resolved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        resolution_notes TEXT,
        resolution_summary TEXT,
        rejection_reason TEXT,
        reopen_reason TEXT,
        response_due_at TIMESTAMPTZ,
        resolution_due_at TIMESTAMPTZ,
        escalated_at TIMESTAMPTZ,
        escalation_level INTEGER NOT NULL DEFAULT 0,
        resolved_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        reopened_at TIMESTAMPTZ,
        incident_date TIMESTAMPTZ,
        supporting_evidence_url TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. In case table already existed, ensure all newer columns and correct types
    await db.query(`
      DO $$
      BEGIN
        -- Alter status to VARCHAR(50) if it was an enum
        IF EXISTS (
          SELECT 1 FROM information_schema.columns 
          WHERE table_name = 'complaints' AND column_name = 'status' AND data_type = 'USER-DEFINED'
        ) THEN
          ALTER TABLE complaints ALTER COLUMN status TYPE VARCHAR(50) USING status::text;
        END IF;
      END $$;
    `);

    // Add any columns that might be missing in an older schema
    const alterColumns = [
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complaint_reference VARCHAR(50);`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS complainant_user_id UUID REFERENCES users(id) ON DELETE SET NULL;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS subject_user_id UUID REFERENCES users(id) ON DELETE SET NULL;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS category VARCHAR(100) NOT NULL DEFAULT 'other';`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS title VARCHAR(255);`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS priority VARCHAR(20) NOT NULL DEFAULT 'medium';`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS assigned_admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_summary TEXT;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS rejection_reason TEXT;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopen_reason TEXT;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS response_due_at TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS resolution_due_at TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalated_at TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS escalation_level INTEGER NOT NULL DEFAULT 0;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS closed_at TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS reopened_at TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS incident_date TIMESTAMPTZ;`,
      `ALTER TABLE complaints ADD COLUMN IF NOT EXISTS supporting_evidence_url TEXT;`,
    ];

    for (const sql of alterColumns) {
      await db.query(sql);
    }

    // Set default reference for existing rows if any
    await db.query(`
      UPDATE complaints 
      SET complaint_reference = 'CMP-' || TO_CHAR(created_at, 'YYYY') || '-' || UPPER(SUBSTRING(id::text, 1, 6))
      WHERE complaint_reference IS NULL;
    `);

    // Sync titles and user ids
    await db.query(`
      UPDATE complaints SET title = subject WHERE title IS NULL AND subject IS NOT NULL;
      UPDATE complaints SET subject = title WHERE subject IS NULL AND title IS NOT NULL;
      UPDATE complaints SET complainant_user_id = reporter_id WHERE complainant_user_id IS NULL AND reporter_id IS NOT NULL;
      UPDATE complaints SET reporter_id = complainant_user_id WHERE reporter_id IS NULL AND complainant_user_id IS NOT NULL;
      UPDATE complaints SET assigned_admin_user_id = resolved_by WHERE assigned_admin_user_id IS NULL AND resolved_by IS NOT NULL;
    `);

    // 4. Create complaint_messages table (for communication thread & internal notes)
    await db.query(`
      CREATE TABLE IF NOT EXISTS complaint_messages (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        sender_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        message TEXT NOT NULL,
        visibility VARCHAR(20) NOT NULL DEFAULT 'user', -- 'user' or 'internal'
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Create complaint_history table (append-only audit history)
    await db.query(`
      CREATE TABLE IF NOT EXISTS complaint_history (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        complaint_id UUID NOT NULL REFERENCES complaints(id) ON DELETE CASCADE,
        actor_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        action_type VARCHAR(50) NOT NULL,
        previous_value TEXT,
        new_value TEXT,
        reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 6. Create indexes for high-performance dashboard queries and sorting
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_complaints_reporter ON complaints(reporter_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_complainant ON complaints(complainant_user_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_status ON complaints(status);
      CREATE INDEX IF NOT EXISTS idx_complaints_priority ON complaints(priority);
      CREATE INDEX IF NOT EXISTS idx_complaints_assigned ON complaints(assigned_admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_complaints_ref ON complaints(complaint_reference);
      CREATE INDEX IF NOT EXISTS idx_complaint_messages_cid ON complaint_messages(complaint_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_complaint_history_cid ON complaint_history(complaint_id, created_at);
    `);

    console.log('✅ [MIGRATION] Complaint Management System migration completed successfully!');
  } catch (error) {
    console.error('❌ [MIGRATION] Migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateComplaints()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateComplaints;
