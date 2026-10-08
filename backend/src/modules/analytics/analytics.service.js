const db = require('../../config/db');

/**
 * Get overall platform impact metrics.
 */
const getImpactMetrics = async ({ timeRange = 'all' } = {}) => {
  let timeFilter = '';
  if (timeRange === 'month') {
    timeFilter = `AND created_at >= NOW() - INTERVAL '30 days'`;
  } else if (timeRange === 'year') {
    timeFilter = `AND created_at >= NOW() - INTERVAL '365 days'`;
  }

  // Rescued/active donation statuses
  const rescuedCondition = `status IN ('claimed', 'matched', 'volunteer_assigned', 'collected', 'delivered', 'completed')`;

  const donationsResult = await db.query(
    `SELECT
       COUNT(*) AS total_donations,
       COUNT(*) FILTER (WHERE ${rescuedCondition}) AS completed_donations,
       COUNT(*) FILTER (WHERE status = 'posted') AS active_donations,
       COALESCE(SUM(quantity), 0) AS total_servings,
       COALESCE(SUM(quantity) FILTER (WHERE ${rescuedCondition}), 0) AS rescued_servings,
       COALESCE(SUM(weight_kg), 0) AS total_weight_kg,
       COALESCE(SUM(weight_kg) FILTER (WHERE ${rescuedCondition}), 0) AS rescued_weight_kg
     FROM food_donations
     WHERE 1=1 ${timeFilter}`
  );

  const d = donationsResult.rows[0];

  // Users count by role
  const usersResult = await db.query(
    `SELECT role, COUNT(*) AS count FROM users WHERE status = 'active' GROUP BY role`
  );
  const userCounts = {};
  for (const row of usersResult.rows) {
    userCounts[row.role] = parseInt(row.count, 10);
  }

  // Deliveries count
  const deliveriesResult = await db.query(
    `SELECT
       COUNT(*) AS total_deliveries,
       COUNT(*) FILTER (WHERE status = 'delivered') AS completed_deliveries
     FROM deliveries`
  );

  // Calculate metrics
  const totalWeight = parseFloat(d.rescued_weight_kg) > 0 ? parseFloat(d.rescued_weight_kg) : parseFloat(d.total_weight_kg);
  const totalServings = parseInt(d.rescued_servings, 10) > 0 ? parseInt(d.rescued_servings, 10) : parseInt(d.total_servings, 10);

  const meals_saved = totalServings;
  const kg_rescued = Math.round(totalWeight * 10) / 10;
  const co2_prevented_kg = Math.round(kg_rescued * 2.0 * 10) / 10;
  const active_volunteers = userCounts['volunteer'] || 0;
  const donations_completed = parseInt(d.completed_donations, 10) > 0 ? parseInt(d.completed_donations, 10) : parseInt(d.total_donations, 10);

  return {
    meals_saved,
    kg_rescued,
    co2_prevented_kg,
    active_volunteers,
    donations_completed,
    donations_total: parseInt(d.total_donations, 10),
    donations: d,
    users: userCounts,
    deliveries: deliveriesResult.rows[0],
  };
};

/**
 * Get donation trends over time.
 * When range === 'month', returns a day-wise breakdown (e.g. '08 Oct', '09 Oct').
 * When range === 'year' or 'all', returns a monthly breakdown (e.g. 'Aug', 'Sep', 'Oct').
 */
const getDonationTrends = async ({ range = 'all' } = {}) => {
  if (range === 'month') {
    const { rows } = await db.query(
      `SELECT
         TO_CHAR(created_at, 'DD Mon') AS day_label,
         DATE(created_at) AS date_val,
         COUNT(*) AS total,
         COALESCE(SUM(weight_kg), 0) AS kg,
         COALESCE(SUM(quantity), 0) AS meals
       FROM food_donations
       WHERE created_at >= NOW() - INTERVAL '30 days'
       GROUP BY TO_CHAR(created_at, 'DD Mon'), DATE(created_at)
       ORDER BY date_val ASC`
    );

    if (rows.length === 0) {
      const fallback = await db.query(
        `SELECT
           TO_CHAR(created_at, 'DD Mon') AS day_label,
           DATE(created_at) AS date_val,
           COUNT(*) AS total,
           COALESCE(SUM(weight_kg), 0) AS kg,
           COALESCE(SUM(quantity), 0) AS meals
         FROM food_donations
         GROUP BY TO_CHAR(created_at, 'DD Mon'), DATE(created_at)
         ORDER BY date_val ASC
         LIMIT 15`
      );
      return fallback.rows.map(r => ({
        month: r.day_label,
        label: r.day_label,
        kg: Math.round(parseFloat(r.kg || 0) * 10) / 10,
        meals: parseInt(r.meals || 0, 10),
        total: parseInt(r.total || 0, 10),
      }));
    }

    return rows.map(r => ({
      month: r.day_label,
      label: r.day_label,
      kg: Math.round(parseFloat(r.kg || 0) * 10) / 10,
      meals: parseInt(r.meals || 0, 10),
      total: parseInt(r.total || 0, 10),
    }));
  }

  const intervalClause = range === 'year' ? "WHERE created_at >= NOW() - INTERVAL '365 days'" : "";

  const { rows } = await db.query(
    `SELECT
       TO_CHAR(created_at, 'Mon') AS month,
       TO_CHAR(created_at, 'YYYY-MM') AS year_month,
       COUNT(*) AS total,
       COALESCE(SUM(weight_kg), 0) AS kg,
       COALESCE(SUM(quantity), 0) AS meals
     FROM food_donations
     ${intervalClause}
     GROUP BY TO_CHAR(created_at, 'Mon'), TO_CHAR(created_at, 'YYYY-MM')
     ORDER BY year_month ASC`
  );

  return rows.map(r => ({
    month: r.month,
    label: r.month,
    year_month: r.year_month,
    kg: Math.round(parseFloat(r.kg || 0) * 10) / 10,
    meals: parseInt(r.meals || 0, 10),
    total: parseInt(r.total || 0, 10),
  }));
};

/**
 * Get leaderboard data.
 */
const getLeaderboard = async ({ limit = 10 } = {}) => {
  const { rows } = await db.query(
    `SELECT
       u.full_name AS name,
       u.role,
       COALESCE(fp.business_name, n.organization_name, u.full_name) AS display_name,
       COALESCE(fp.total_donations, 0) AS total_donations,
       COALESCE(n.total_received, 0) AS total_received,
       COALESCE(v.total_deliveries, 0) AS total_deliveries,
       COALESCE(SUM(fd.weight_kg), 0) AS kg,
       COALESCE(SUM(fd.quantity), 0) AS meals
     FROM users u
     LEFT JOIN food_providers fp ON fp.user_id = u.id
     LEFT JOIN ngos n ON n.user_id = u.id
     LEFT JOIN volunteers v ON v.user_id = u.id
     LEFT JOIN food_donations fd ON fd.provider_id = fp.id
     WHERE u.status = 'active' AND u.role IN ('provider', 'ngo', 'volunteer')
     GROUP BY u.id, u.full_name, u.role, fp.business_name, n.organization_name, fp.total_donations, n.total_received, v.total_deliveries
     ORDER BY total_donations DESC, total_received DESC, total_deliveries DESC, kg DESC
     LIMIT $1`,
    [limit]
  );

  return rows.map((r, idx) => ({
    rank: idx + 1,
    name: r.display_name || r.name,
    type: r.role === 'provider' ? 'Provider' : r.role === 'ngo' ? 'NGO' : 'Volunteer',
    donations: parseInt(r.total_donations, 10),
    claimed: parseInt(r.total_received, 10),
    deliveries: parseInt(r.total_deliveries, 10),
    kg: Math.round(parseFloat(r.kg || 0) * 10) / 10,
    meals: parseInt(r.meals || 0, 10),
  }));
};

module.exports = {
  getImpactMetrics,
  getDonationTrends,
  getLeaderboard,
};
