const db = require('../config/db');

async function migrateGoogleAuth() {
  console.log('🚀 [MIGRATION] Running Google Auth & Mandatory Profile Completion migration...');

  try {
    // 1. Add google_id, auth_provider, profile_completed columns
    await db.query(`
      ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id VARCHAR(255) UNIQUE;
      ALTER TABLE users ADD COLUMN IF NOT EXISTS auth_provider VARCHAR(50) NOT NULL DEFAULT 'local';
      ALTER TABLE users ADD COLUMN IF NOT EXISTS profile_completed BOOLEAN NOT NULL DEFAULT TRUE;
    `);

    // 2. Allow password_hash and role to be nullable for OAuth-initiated users prior to profile completion
    await db.query(`
      ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
      ALTER TABLE users ALTER COLUMN role DROP NOT NULL;
    `);

    // 3. Ensure existing users have completed status set
    await db.query(`
      UPDATE users SET profile_completed = TRUE WHERE profile_completed IS NULL;
      UPDATE users SET auth_provider = 'local' WHERE auth_provider IS NULL;
    `);

    // 4. Create performance indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);
      CREATE INDEX IF NOT EXISTS idx_users_auth_provider ON users(auth_provider);
      CREATE INDEX IF NOT EXISTS idx_users_profile_completed ON users(profile_completed);
    `);

    console.log('✅ [MIGRATION] Google Auth & Profile Completion schema successfully applied!');
  } catch (err) {
    console.error('❌ [MIGRATION ERROR]:', err);
    throw err;
  }
}

if (require.main === module) {
  migrateGoogleAuth()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateGoogleAuth;
