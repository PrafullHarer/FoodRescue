/**
 * Migration: User Verification & Admin Approval Workflow
 * Adds verification_status and administrative tracking columns to users table.
 * Creates verification documents table.
 * Safely migrates existing active users and seed accounts to APPROVED.
 */
const db = require('../config/db');

async function migrateVerifications() {
  console.log('🔄 [MIGRATION] Running User Verification & Admin Approval migration...');
  const client = await db.getClient();

  try {
    await client.query('BEGIN');

    // 1. Add verification tracking columns to users
    await client.query(`
      ALTER TABLE users
        ADD COLUMN IF NOT EXISTS verification_status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
        ADD COLUMN IF NOT EXISTS approved_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejected_by UUID REFERENCES users(id) ON DELETE SET NULL,
        ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS rejection_reason TEXT,
        ADD COLUMN IF NOT EXISTS info_requested_notes TEXT,
        ADD COLUMN IF NOT EXISTS info_requested_at TIMESTAMPTZ,
        ADD COLUMN IF NOT EXISTS suspended_at TIMESTAMPTZ;
    `);

    // 2. Add performance index on verification_status
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_users_verification_status ON users(verification_status);
      CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at DESC);
    `);

    // 3. Create user verification documents table for file attachments/credentials
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_verification_documents (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        document_name VARCHAR(255) NOT NULL,
        document_url TEXT NOT NULL,
        document_type VARCHAR(100),
        file_size INTEGER,
        uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
      CREATE INDEX IF NOT EXISTS idx_user_verification_docs_user ON user_verification_documents(user_id);
    `);

    // 4. Safely migrate existing users:
    // Admin accounts must always be APPROVED
    await client.query(`
      UPDATE users
      SET verification_status = 'APPROVED',
          status = 'active',
          approved_at = COALESCE(approved_at, created_at, NOW())
      WHERE role = 'admin';
    `);

    // Known seed accounts and established active users
    await client.query(`
      UPDATE users
      SET verification_status = 'APPROVED',
          status = 'active',
          approved_at = COALESCE(approved_at, created_at, NOW())
      WHERE status = 'active'
        AND email IN (
          'admin@foodrescue.org',
          'provider@foodrescue.org',
          'ngo@foodrescue.org',
          'volunteer@foodrescue.org',
          'pmh13072005@gmail.com'
        );
    `);

    // Suspended or blocked accounts reflect their corresponding status
    await client.query(`
      UPDATE users
      SET verification_status = 'SUSPENDED',
          suspended_at = COALESCE(suspended_at, updated_at, NOW())
      WHERE status = 'suspended' AND verification_status = 'PENDING';
    `);

    await client.query(`
      UPDATE users
      SET verification_status = 'REJECTED',
          rejected_at = COALESCE(rejected_at, updated_at, NOW())
      WHERE status = 'blocked' AND verification_status = 'PENDING';
    `);

    // Ensure food_providers and ngos matching approved users have is_verified = TRUE
    await client.query(`
      UPDATE food_providers fp
      SET is_verified = TRUE
      FROM users u
      WHERE fp.user_id = u.id AND u.verification_status = 'APPROVED';
    `);

    await client.query(`
      UPDATE ngos n
      SET is_verified = TRUE
      FROM users u
      WHERE n.user_id = u.id AND u.verification_status = 'APPROVED';
    `);

    await client.query('COMMIT');
    console.log('✅ [MIGRATION] User Verification schema successfully applied and existing users migrated!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ [MIGRATION] Failed to apply User Verification migration:', err);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  migrateVerifications()
    .then(() => {
      console.log('Done.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateVerifications;

