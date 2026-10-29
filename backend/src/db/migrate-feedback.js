const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../../.env') });
const db = require('../config/db');

async function migrateFeedback() {
  console.log('[MIGRATION] Checking/creating feedback table...');
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS feedback (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        name VARCHAR(255),
        email VARCHAR(255),
        feedback_type VARCHAR(50) NOT NULL DEFAULT 'general',
        rating INTEGER CHECK (rating IS NULL OR (rating >= 1 AND rating <= 5)),
        subject VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        is_anonymous BOOLEAN DEFAULT false,
        status VARCHAR(50) DEFAULT 'NEW',
        admin_notes TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
      CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON feedback(created_at DESC);
      CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);
    `);

    console.log('✅ [MIGRATION] feedback table ready.');
  } catch (err) {
    console.error('❌ [MIGRATION] Failed to migrate feedback table:', err.message);
    throw err;
  }
}

if (require.main === module) {
  migrateFeedback()
    .then(() => {
      console.log('Feedback migration completed successfully.');
      process.exit(0);
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateFeedback;
