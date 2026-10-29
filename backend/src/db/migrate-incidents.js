const db = require('../config/db');

async function migrateIncidents() {
  console.log('🚀 [MIGRATION] Running Incident Management & Escalation System migration...');

  try {
    // 1. Create incidents table
    await db.query(`
      CREATE TABLE IF NOT EXISTS incidents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_reference VARCHAR(50) UNIQUE NOT NULL,
        incident_type VARCHAR(60) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        severity VARCHAR(20) NOT NULL DEFAULT 'medium',
        status VARCHAR(30) NOT NULL DEFAULT 'open',
        source VARCHAR(30) NOT NULL DEFAULT 'manual',
        reporter_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        assigned_admin_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        donation_id UUID REFERENCES food_donations(id) ON DELETE SET NULL,
        delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
        related_qr_code VARCHAR(255),
        related_organization_id UUID,
        escalation_level INTEGER NOT NULL DEFAULT 0,
        escalated_at TIMESTAMPTZ,
        escalation_reason TEXT,
        detected_at TIMESTAMPTZ,
        reported_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        assigned_at TIMESTAMPTZ,
        acknowledged_at TIMESTAMPTZ,
        resolved_at TIMESTAMPTZ,
        closed_at TIMESTAMPTZ,
        resolution_summary TEXT,
        evidence_urls TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Create incident_audit_logs table (append-only)
    await db.query(`
      CREATE TABLE IF NOT EXISTS incident_audit_logs (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        actor_id UUID REFERENCES users(id) ON DELETE SET NULL,
        actor_type VARCHAR(30) NOT NULL DEFAULT 'user',
        action VARCHAR(60) NOT NULL,
        previous_value JSONB,
        new_value JSONB,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 3. Create incident_notes table (internal notes & investigation)
    await db.query(`
      CREATE TABLE IF NOT EXISTS incident_notes (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        incident_id UUID NOT NULL REFERENCES incidents(id) ON DELETE CASCADE,
        author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        is_internal BOOLEAN NOT NULL DEFAULT TRUE,
        note TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 4. Create qr_scan_attempts table (safe tracking of verification failures)
    await db.query(`
      CREATE TABLE IF NOT EXISTS qr_scan_attempts (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        code_prefix VARCHAR(30) NOT NULL,
        code_hash VARCHAR(64) NOT NULL,
        scanned_by UUID REFERENCES users(id) ON DELETE SET NULL,
        delivery_id UUID REFERENCES deliveries(id) ON DELETE SET NULL,
        failure_reason VARCHAR(255) NOT NULL,
        attempted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 5. Create performance and query indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_incidents_ref ON incidents(incident_reference);
      CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status);
      CREATE INDEX IF NOT EXISTS idx_incidents_severity ON incidents(severity);
      CREATE INDEX IF NOT EXISTS idx_incidents_type ON incidents(incident_type);
      CREATE INDEX IF NOT EXISTS idx_incidents_donation ON incidents(donation_id);
      CREATE INDEX IF NOT EXISTS idx_incidents_delivery ON incidents(delivery_id);
      CREATE INDEX IF NOT EXISTS idx_incidents_assigned ON incidents(assigned_admin_user_id);
      CREATE INDEX IF NOT EXISTS idx_incidents_created ON incidents(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_incidents_escalation ON incidents(escalation_level, status);

      CREATE INDEX IF NOT EXISTS idx_incident_audit_incident ON incident_audit_logs(incident_id);
      CREATE INDEX IF NOT EXISTS idx_incident_audit_created ON incident_audit_logs(created_at DESC);

      CREATE INDEX IF NOT EXISTS idx_incident_notes_incident ON incident_notes(incident_id);
      CREATE INDEX IF NOT EXISTS idx_qr_attempts_delivery ON qr_scan_attempts(delivery_id);
      CREATE INDEX IF NOT EXISTS idx_qr_attempts_time ON qr_scan_attempts(attempted_at DESC);
    `);

    console.log('✅ [MIGRATION] Incident management schema migrated successfully.');
  } catch (error) {
    console.error('❌ [MIGRATION] Incident migration failed:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateIncidents()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = migrateIncidents;
