const cron = require('node-cron');
const db = require('../config/db');

/**
 * Expiry Checker Cron Job
 *
 * Runs every minute to:
 * 1. Mark expired donations (past expiry_time) as 'expired'
 * 2. Block new claims on expired donations
 */
const startExpiryChecker = () => {
  const job = cron.schedule('* * * * *', async () => {
    try {
      const result = await db.query(
        `UPDATE food_donations
         SET status = 'expired'
         WHERE expiry_time < NOW()
           AND status IN ('posted', 'matched')
         RETURNING id, title`
      );

      if (result.rows.length > 0) {
        console.log(`[CRON] Expired ${result.rows.length} donation(s):`,
          result.rows.map((d) => d.title).join(', ')
        );

        // Also expire any pending claims for these donations
        const donationIds = result.rows.map((d) => d.id);
        await db.query(
          `UPDATE donation_claims
           SET status = 'expired', responded_at = NOW()
           WHERE donation_id = ANY($1) AND status = 'pending'`,
          [donationIds]
        );
      }
    } catch (error) {
      console.error('[CRON] Expiry checker error:', error.message);
    }
  });

  console.log('[CRON] Expiry checker started (runs every minute)');
  return job;
};

module.exports = { startExpiryChecker };
