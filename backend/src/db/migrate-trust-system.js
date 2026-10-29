const db = require('../config/db');

async function migrateTrustSystem() {
  console.log('🚀 [MIGRATION] Running Trust, Ratings & Reliability System migration...');

  try {
    // 1. Ensure table exists with all required columns
    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donation_id UUID NOT NULL REFERENCES food_donations(id) ON DELETE CASCADE,
        delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE,
        claim_id UUID REFERENCES donation_claims(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewer_role VARCHAR(50) NOT NULL DEFAULT 'ngo',
        reviewed_role VARCHAR(50) NOT NULL DEFAULT 'provider',
        review_type VARCHAR(50) NOT NULL DEFAULT 'claim',
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        tags TEXT[],
        moderation_status VARCHAR(50) NOT NULL DEFAULT 'approved',
        flag_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );
    `);

    // 2. Add columns if table already existed without them
    await db.query(`
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS delivery_id UUID REFERENCES deliveries(id) ON DELETE CASCADE;
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewer_role VARCHAR(50) NOT NULL DEFAULT 'ngo';
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS reviewed_role VARCHAR(50) NOT NULL DEFAULT 'provider';
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS moderation_status VARCHAR(50) NOT NULL DEFAULT 'approved';
      ALTER TABLE reviews ADD COLUMN IF NOT EXISTS flag_reason TEXT;
    `);

    // 3. Backfill any existing rows with appropriate roles
    await db.query(`
      UPDATE reviews r
      SET reviewer_role = u.role
      FROM users u
      WHERE r.reviewer_id = u.id AND (r.reviewer_role IS NULL OR r.reviewer_role = 'ngo');

      UPDATE reviews r
      SET reviewed_role = u.role
      FROM users u
      WHERE r.reviewee_id = u.id AND (r.reviewed_role IS NULL OR r.reviewed_role = 'provider');
    `);

    // 4. Create performance indexes
    await db.query(`
      CREATE INDEX IF NOT EXISTS idx_reviews_donation_id ON reviews(donation_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_delivery_id ON reviews(delivery_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewer_id ON reviews(reviewer_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewee_id ON reviews(reviewee_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);
      CREATE INDEX IF NOT EXISTS idx_reviews_moderation ON reviews(moderation_status);
      CREATE INDEX IF NOT EXISTS idx_reviews_created_at ON reviews(created_at DESC);
    `);

    // 5. Create unique constraints to prevent duplicate reviews under concurrent requests
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_delivery_reviewer_reviewee 
      ON reviews (delivery_id, reviewer_id, reviewee_id, review_type)
      WHERE delivery_id IS NOT NULL;

      CREATE UNIQUE INDEX IF NOT EXISTS idx_reviews_unique_donation_reviewer_reviewee 
      ON reviews (donation_id, reviewer_id, reviewee_id, review_type)
      WHERE delivery_id IS NULL;
    `);

    console.log('✅ [MIGRATION] Trust, Ratings & Reliability migration completed successfully.');
  } catch (error) {
    console.error('❌ [MIGRATION] Migration error:', error);
    throw error;
  }
}

if (require.main === module) {
  migrateTrustSystem()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = migrateTrustSystem;
