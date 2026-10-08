const db = require('../../config/db');

/**
 * Get overall platform impact metrics.
 */
const getImpactMetrics = async () => {
  const metrics = {};

  // Total donations
  const donationsResult = await db.query(
    `SELECT
       COUNT(*) AS total_donations,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed_donations,
       COUNT(*) FILTER (WHERE status = 'posted') AS active_donations,
       COALESCE(SUM(quantity) FILTER (WHERE status = 'completed'), 0) AS total_servings_rescued,
       COALESCE(SUM(weight_kg) FILTER (WHERE status = 'completed'), 0) AS total_weight_kg_rescued
     FROM food_donations`
  );
  metrics.donations = donationsResult.rows[0];

  // Total users by role
  const usersResult = await db.query(
    `SELECT role, COUNT(*) AS count FROM users GROUP BY role`
  );
  metrics.users = {};
  for (const row of usersResult.rows) {
    metrics.users[row.role] = parseInt(row.count, 10);
  }

  // Total deliveries
  const deliveriesResult = await db.query(
    `SELECT
       COUNT(*) AS total_deliveries,
       COUNT(*) FILTER (WHERE status = 'delivered') AS completed_deliveries,
       AVG(EXTRACT(EPOCH FROM (delivery_time - pickup_time)) / 60)
         FILTER (WHERE delivery_time IS NOT NULL AND pickup_time IS NOT NULL) AS avg_delivery_time_min
     FROM deliveries`
  );
  metrics.deliveries = deliveriesResult.rows[0];

  // Top providers (by total donations)
  const topProviders = await db.query(
    `SELECT fp.business_name, fp.total_donations, u.full_name
     FROM food_providers fp
     JOIN users u ON u.id = fp.user_id
     ORDER BY fp.total_donations DESC
     LIMIT 10`
  );
  metrics.top_providers = topProviders.rows;

  // Top NGOs (by total received)
  const topNgos = await db.query(
    `SELECT n.organization_name, n.total_received
     FROM ngos n
     ORDER BY n.total_received DESC
     LIMIT 10`
  );
  metrics.top_ngos = topNgos.rows;

  // Top volunteers (by total deliveries)
  const topVolunteers = await db.query(
    `SELECT v.total_deliveries, v.rating, u.full_name
     FROM volunteers v
     JOIN users u ON u.id = v.user_id
     ORDER BY v.total_deliveries DESC
     LIMIT 10`
  );
  metrics.top_volunteers = topVolunteers.rows;

  return metrics;
};

/**
 * Get donation trends over time.
 */
const getDonationTrends = async ({ period = 'daily', days = 30 }) => {
  const groupBy = period === 'monthly'
    ? "TO_CHAR(created_at, 'YYYY-MM')"
    : "DATE(created_at)";

  const { rows } = await db.query(
    `SELECT ${groupBy} AS period,
       COUNT(*) AS total,
       COUNT(*) FILTER (WHERE status = 'completed') AS completed,
       COUNT(*) FILTER (WHERE status = 'expired') AS expired
     FROM food_donations
     WHERE created_at >= NOW() - INTERVAL '${days} days'
     GROUP BY ${groupBy}
     ORDER BY period ASC`
  );

  return rows;
};

/**
 * Get leaderboard data.
 */
const getLeaderboard = async ({ period = 'all_time', role = 'provider', limit = 10 }) => {
  if (role === 'provider') {
    const { rows } = await db.query(
      `SELECT fp.business_name AS name, fp.total_donations AS score, u.avatar_url
       FROM food_providers fp
       JOIN users u ON u.id = fp.user_id
       WHERE u.status = 'active'
       ORDER BY fp.total_donations DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  if (role === 'volunteer') {
    const { rows } = await db.query(
      `SELECT u.full_name AS name, v.total_deliveries AS score, v.rating, u.avatar_url
       FROM volunteers v
       JOIN users u ON u.id = v.user_id
       WHERE u.status = 'active'
       ORDER BY v.total_deliveries DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  if (role === 'ngo') {
    const { rows } = await db.query(
      `SELECT n.organization_name AS name, n.total_received AS score, u.avatar_url
       FROM ngos n
       JOIN users u ON u.id = n.user_id
       WHERE u.status = 'active'
       ORDER BY n.total_received DESC
       LIMIT $1`,
      [limit]
    );
    return rows;
  }

  return [];
};

module.exports = {
  getImpactMetrics,
  getDonationTrends,
  getLeaderboard,
};
