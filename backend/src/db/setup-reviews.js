const db = require('../config/db');

async function setupReviews() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS reviews (
        id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
        donation_id UUID REFERENCES food_donations(id) ON DELETE CASCADE,
        claim_id UUID REFERENCES donation_claims(id) ON DELETE CASCADE,
        reviewer_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        reviewee_id UUID REFERENCES users(id) ON DELETE SET NULL,
        review_type VARCHAR(50) DEFAULT 'claim',
        rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
        comment TEXT,
        tags TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reviews_donation ON reviews(donation_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewer ON reviews(reviewer_id);
      CREATE INDEX IF NOT EXISTS idx_reviews_reviewee ON reviews(reviewee_id);
    `);
    console.log('✅ Reviews table created/verified successfully.');
  } catch (error) {
    console.error('❌ Failed to setup reviews table:', error);
  } finally {
    process.exit(0);
  }
}

setupReviews();
