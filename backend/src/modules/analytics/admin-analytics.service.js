const db = require('../../config/db');

/**
 * Helper to compute date bounds for current and previous equivalent comparison periods.
 */
function getPeriodBounds({ dateRange, period, startDate, endDate } = {}) {
  const range = dateRange || period || '30d';
  const now = new Date();
  let currentStart, currentEnd, previousStart, previousEnd;

  if (range === 'today') {
    currentStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    currentEnd = new Date(now);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 1);
    previousEnd = new Date(currentStart);
  } else if (range === '7d') {
    currentEnd = new Date(now);
    currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 7);
    previousEnd = new Date(currentStart);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 7);
  } else if (range === '30d') {
    currentEnd = new Date(now);
    currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    previousEnd = new Date(currentStart);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);
  } else if (range === '90d') {
    currentEnd = new Date(now);
    currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 90);
    previousEnd = new Date(currentStart);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 90);
  } else if (range === 'all' || range === 'all_time') {
    currentStart = new Date(0); // Beginning of epoch
    currentEnd = new Date(now.getTime() + 86400000);
    previousStart = new Date(0);
    previousEnd = new Date(0);
  } else if (range === 'custom' && startDate && endDate) {
    currentStart = new Date(startDate);
    currentEnd = new Date(endDate);
    const durationMs = Math.max(currentEnd.getTime() - currentStart.getTime(), 86400000);
    previousEnd = new Date(currentStart);
    previousStart = new Date(currentStart.getTime() - durationMs);
  } else {
    // Default 30 days
    currentEnd = new Date(now);
    currentStart = new Date(now);
    currentStart.setDate(currentStart.getDate() - 30);
    previousEnd = new Date(currentStart);
    previousStart = new Date(currentStart);
    previousStart.setDate(previousStart.getDate() - 30);
  }

  return { currentStart, currentEnd, previousStart, previousEnd };
}

/**
 * Build dynamic WHERE clause clauses and parameter values.
 */
function buildFilterConditions({
  region,
  organizationType,
  organizationId,
  category,
  deliveryStatus,
  paramOffset = 1,
  donationAlias = 'fd',
  deliveryAlias = 'd'
}) {
  const clauses = [];
  const params = [];
  let index = paramOffset;

  if (region && region.trim()) {
    params.push(`%${region.trim().toLowerCase()}%`);
    clauses.push(`(LOWER(${donationAlias}.pickup_address) LIKE $${index} OR LOWER(COALESCE(fp.address, '')) LIKE $${index})`);
    index++;
  }

  if (category && category.trim() && category !== 'all') {
    params.push(category.trim());
    clauses.push(`${donationAlias}.category = $${index}`);
    index++;
  }

  if (deliveryStatus && deliveryStatus.trim() && deliveryStatus !== 'all') {
    params.push(deliveryStatus.trim());
    clauses.push(`${deliveryAlias}.status = $${index}`);
    index++;
  }

  if (organizationId && organizationId.trim()) {
    if (organizationType === 'ngo') {
      params.push(organizationId.trim());
      clauses.push(`${deliveryAlias}.ngo_id = $${index}`);
      index++;
    } else if (organizationType === 'provider') {
      params.push(organizationId.trim());
      clauses.push(`${donationAlias}.provider_id = $${index}`);
      index++;
    }
  }

  return {
    whereSql: clauses.length > 0 ? ' AND ' + clauses.join(' AND ') : '',
    params,
    nextIndex: index
  };
}

/**
 * Safe percentage change calculation.
 * Returns null if previous is 0 or missing, rather than Infinity.
 */
function calculateChange(current, previous) {
  const curr = Number(current) || 0;
  const prev = Number(previous) || 0;
  if (prev === 0) {
    if (curr === 0) return 0;
    return null; // Cannot compute clean percentage on 0 denominator
  }
  return Math.round(((curr - prev) / prev) * 1000) / 10;
}

/**
 * 1. KPI Summary Cards with Historical Comparison
 */
async function getKPISummary(filters = {}) {
  const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodBounds(filters);

  // Common filter conditions
  const currentFilters = buildFilterConditions({ ...filters, paramOffset: 3 });
  const previousFilters = buildFilterConditions({ ...filters, paramOffset: 3 });

  // Query for current period
  const currentQuery = `
    SELECT
      COUNT(DISTINCT fd.id) AS total_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'delivered') AS delivered_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'posted') AS available_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status IN ('claimed', 'matched', 'volunteer_assigned', 'collected')) AS in_progress_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'expired') AS expired_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'cancelled') AS cancelled_donations,
      COALESCE(SUM(fd.quantity) FILTER (WHERE fd.status = 'delivered'), 0) AS rescued_servings,
      COALESCE(SUM(fd.weight_kg) FILTER (WHERE fd.status = 'delivered'), 0) AS rescued_weight_kg,
      COALESCE(SUM(fd.quantity), 0) AS total_servings,
      COUNT(DISTINCT fd.provider_id) AS active_providers,
      COUNT(DISTINCT d.ngo_id) FILTER (WHERE d.status = 'delivered') AS active_ngos,
      COUNT(DISTINCT d.volunteer_id) FILTER (WHERE d.status IN ('in_transit', 'delivered')) AS active_volunteers,
      COUNT(DISTINCT d.id) AS total_deliveries,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'failed') AS failed_deliveries
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
    ${currentFilters.whereSql}
  `;

  // Query for previous period
  const previousQuery = `
    SELECT
      COUNT(DISTINCT fd.id) AS total_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'delivered') AS delivered_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'posted') AS available_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status IN ('claimed', 'matched', 'volunteer_assigned', 'collected')) AS in_progress_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'expired') AS expired_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status = 'cancelled') AS cancelled_donations,
      COALESCE(SUM(fd.quantity) FILTER (WHERE fd.status = 'delivered'), 0) AS rescued_servings,
      COALESCE(SUM(fd.weight_kg) FILTER (WHERE fd.status = 'delivered'), 0) AS rescued_weight_kg,
      COUNT(DISTINCT fd.provider_id) AS active_providers,
      COUNT(DISTINCT d.ngo_id) FILTER (WHERE d.status = 'delivered') AS active_ngos,
      COUNT(DISTINCT d.volunteer_id) FILTER (WHERE d.status IN ('in_transit', 'delivered')) AS active_volunteers,
      COUNT(DISTINCT d.id) AS total_deliveries,
      COUNT(DISTINCT d.id) FILTER (WHERE d.status = 'delivered') AS completed_deliveries
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
    ${previousFilters.whereSql}
  `;

  // Inactive providers count query
  const inactiveProvidersQuery = `
    SELECT COUNT(*) AS inactive_count
    FROM food_providers fp
    WHERE NOT EXISTS (
      SELECT 1 FROM food_donations fd
      WHERE fd.provider_id = fp.id
      AND fd.created_at >= NOW() - INTERVAL '30 days'
    )
  `;

  const [curRes, prevRes, inactRes] = await Promise.all([
    db.query(currentQuery, [currentStart, currentEnd, ...currentFilters.params]),
    db.query(previousQuery, [previousStart, previousEnd, ...previousFilters.params]),
    db.query(inactiveProvidersQuery)
  ]);

  const curr = curRes.rows[0];
  const prev = prevRes.rows[0];
  const inactiveCount = parseInt(inactRes.rows[0].inactive_count, 10) || 0;

  // Delivery completion rate: delivered / (delivered + failed + cancelled)
  const totalFinishedCurrent = parseInt(curr.completed_deliveries, 10) + parseInt(curr.failed_deliveries, 10);
  const completionRateCurrent = totalFinishedCurrent > 0
    ? Math.round((parseInt(curr.completed_deliveries, 10) / totalFinishedCurrent) * 1000) / 10
    : (parseInt(curr.total_donations, 10) > 0 ? Math.round((parseInt(curr.delivered_donations, 10) / parseInt(curr.total_donations, 10)) * 1000) / 10 : 0);

  const totalFinishedPrev = parseInt(prev.completed_deliveries, 10);
  const completionRatePrev = totalFinishedPrev > 0
    ? Math.round((parseInt(prev.completed_deliveries, 10) / totalFinishedPrev) * 1000) / 10
    : (parseInt(prev.total_donations, 10) > 0 ? Math.round((parseInt(prev.delivered_donations, 10) / parseInt(prev.total_donations, 10)) * 1000) / 10 : 0);

  return {
    period: {
      current: { start: currentStart, end: currentEnd },
      previous: { start: previousStart, end: previousEnd },
      hasHistoricalComparison: Boolean(prev && parseInt(prev.total_donations, 10) > 0)
    },
    metrics: {
      total_donations: {
        value: parseInt(curr.total_donations, 10) || 0,
        change: calculateChange(curr.total_donations, prev.total_donations)
      },
      delivered_donations: {
        value: parseInt(curr.delivered_donations, 10) || 0,
        change: calculateChange(curr.delivered_donations, prev.delivered_donations)
      },
      rescued_servings: {
        value: parseInt(curr.rescued_servings, 10) || 0,
        change: calculateChange(curr.rescued_servings, prev.rescued_servings)
      },
      rescued_weight_kg: {
        value: Math.round((parseFloat(curr.rescued_weight_kg) || 0) * 10) / 10,
        change: calculateChange(curr.rescued_weight_kg, prev.rescued_weight_kg)
      },
      available_donations: {
        value: parseInt(curr.available_donations, 10) || 0,
        change: calculateChange(curr.available_donations, prev.available_donations)
      },
      in_progress_donations: {
        value: parseInt(curr.in_progress_donations, 10) || 0,
        change: calculateChange(curr.in_progress_donations, prev.in_progress_donations)
      },
      expired_donations: {
        value: parseInt(curr.expired_donations, 10) || 0,
        change: calculateChange(curr.expired_donations, prev.expired_donations)
      },
      cancelled_donations: {
        value: parseInt(curr.cancelled_donations, 10) || 0,
        change: calculateChange(curr.cancelled_donations, prev.cancelled_donations)
      },
      delivery_completion_rate: {
        value: completionRateCurrent,
        change: completionRatePrev > 0 ? Math.round((completionRateCurrent - completionRatePrev) * 10) / 10 : null
      },
      active_providers: {
        value: parseInt(curr.active_providers, 10) || 0,
        change: calculateChange(curr.active_providers, prev.active_providers)
      },
      active_ngos: {
        value: parseInt(curr.active_ngos, 10) || 0,
        change: calculateChange(curr.active_ngos, prev.active_ngos)
      },
      active_volunteers: {
        value: parseInt(curr.active_volunteers, 10) || 0,
        change: calculateChange(curr.active_volunteers, prev.active_volunteers)
      },
      inactive_providers: {
        value: inactiveCount,
        change: null
      }
    }
  };
}

/**
 * Helper to resolve the best human-readable municipal area name for a cluster
 */
function resolveAreaName(addresses, lat, lng) {
  const validAddresses = (addresses || []).filter(a =>
    a &&
    typeof a === 'string' &&
    !a.startsWith('Location (') &&
    a.length > 3 &&
    !/^[a-z]+$/i.test(a.trim())
  );

  // Prioritize detailed street/municipal addresses with commas
  const sorted = [...validAddresses].sort((a, b) =>
    (b.includes(',') ? 1 : 0) - (a.includes(',') ? 1 : 0) || b.length - a.length
  );

  for (const addr of sorted) {
    const parts = addr.split(',').map(p => p.trim()).filter(Boolean);
    const informativeParts = parts.filter(p =>
      !/^\d+$/.test(p) &&
      !['india', 'united states', 'usa', 'us'].includes(p.toLowerCase())
    );

    if (informativeParts.length >= 2) {
      return informativeParts.slice(-2).join(', ');
    } else if (informativeParts.length === 1) {
      return informativeParts[0];
    }
  }

  if (validAddresses.length > 0) {
    return validAddresses[0];
  }

  // Coordinate fallback mapping for known active project regions
  if (Math.abs(lat - 28.61) < 0.25 && Math.abs(lng - 77.21) < 0.25) return 'New Delhi Metro Area';
  if (Math.abs(lat - 16.65) < 0.25 && Math.abs(lng - 74.26) < 0.25) return 'Kolhapur, Maharashtra';
  if (Math.abs(lat - 37.78) < 0.25 && Math.abs(lng - -122.41) < 0.25) return 'San Francisco Bay Area';

  return `Zone [${lat.toFixed(2)}, ${lng.toFixed(2)}]`;
}

/**
 * 2. Donation Hotspots & Demand Map Aggregation
 * Clustered strictly by privacy-safe rounded coordinates (approx 1.1km grid).
 */
async function getDonationHotspots(filters = {}) {
  const { currentStart, currentEnd } = getPeriodBounds(filters);
  const filterHelper = buildFilterConditions({ ...filters, paramOffset: 3 });

  const query = `
    SELECT
      ROUND(fd.latitude::numeric, 2) AS cluster_lat,
      ROUND(fd.longitude::numeric, 2) AS cluster_lng,
      COUNT(DISTINCT fd.id) AS total_donations,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status IN ('delivered', 'completed')) AS completed_deliveries,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status IN ('posted', 'matched', 'claimed', 'volunteer_assigned', 'collected')) AS available_count,
      COUNT(DISTINCT fd.id) FILTER (WHERE fd.status IN ('expired', 'cancelled')) AS expired_count,
      COALESCE(SUM(fd.quantity), 0) AS total_quantity,
      COALESCE(SUM(fd.quantity) FILTER (WHERE fd.status IN ('delivered', 'completed')), 0) AS delivered_quantity,
      COUNT(DISTINCT fd.provider_id) AS distinct_providers,
      COUNT(DISTINCT d.ngo_id) AS distinct_ngos,
      ARRAY_AGG(DISTINCT fd.pickup_address) FILTER (WHERE fd.pickup_address IS NOT NULL AND fd.pickup_address != '') AS addresses
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
      AND fd.latitude IS NOT NULL
      AND fd.longitude IS NOT NULL
      ${filterHelper.whereSql}
    GROUP BY
      ROUND(fd.latitude::numeric, 2),
      ROUND(fd.longitude::numeric, 2)
    ORDER BY total_donations DESC
    LIMIT 100
  `;

  const { rows } = await db.query(query, [currentStart, currentEnd, ...filterHelper.params]);

  const hotspots = rows.map((r, i) => {
    const lat = parseFloat(r.cluster_lat);
    const lng = parseFloat(r.cluster_lng);
    const total = parseInt(r.total_donations, 10);
    const completed = parseInt(r.completed_deliveries, 10);
    const available = parseInt(r.available_count, 10);
    const expired = parseInt(r.expired_count, 10);
    const fulfillmentRate = Math.round((completed / Math.max(total, 1)) * 100);

    // Demand gap indicator:
    // - Unmet supply: high available or high expired without adequate NGO claims
    // - High fulfillment: high completion delivery rate
    // - Balanced: healthy ongoing distribution
    let demandGapStatus = 'balanced';
    if (available >= 2 || expired >= 2) {
      demandGapStatus = 'unmet_supply';
    } else if (fulfillmentRate >= 50) {
      demandGapStatus = 'high_fulfillment';
    }

    const areaName = resolveAreaName(r.addresses, lat, lng);

    return {
      id: `spot-${i + 1}`,
      lat,
      lng,
      area_name: areaName,
      total_donations: total,
      completed_deliveries: completed,
      available_count: available,
      expired_count: expired,
      fulfillment_rate: fulfillmentRate,
      total_quantity: parseInt(r.total_quantity, 10),
      delivered_quantity: parseInt(r.delivered_quantity, 10),
      distinct_providers: parseInt(r.distinct_providers, 10),
      distinct_ngos: parseInt(r.distinct_ngos, 10),
      demand_gap_status: demandGapStatus,
      sample_addresses: (r.addresses || []).slice(0, 5)
    };
  });

  return { hotspots };
}

/**
 * 3. Frequently Wasted / Expired Categories Analytics
 */
async function getWastedCategories(filters = {}) {
  const { currentStart, currentEnd, previousStart, previousEnd } = getPeriodBounds(filters);
  const currentFilters = buildFilterConditions({ ...filters, paramOffset: 3 });
  const previousFilters = buildFilterConditions({ ...filters, paramOffset: 3 });

  // Current period by category
  const query = `
    SELECT
      fd.category,
      COUNT(fd.id) AS total_donations,
      COUNT(fd.id) FILTER (WHERE fd.status = 'delivered') AS delivered_count,
      COUNT(fd.id) FILTER (WHERE fd.status = 'expired') AS expired_count,
      COUNT(fd.id) FILTER (WHERE fd.status = 'cancelled') AS cancelled_count,
      COALESCE(SUM(fd.quantity), 0) AS total_quantity,
      COALESCE(SUM(fd.quantity) FILTER (WHERE fd.status = 'expired'), 0) AS expired_quantity,
      COALESCE(SUM(fd.weight_kg), 0) AS total_weight_kg,
      COALESCE(SUM(fd.weight_kg) FILTER (WHERE fd.status = 'expired'), 0) AS expired_weight_kg,
      COUNT(DISTINCT fd.provider_id) AS provider_count
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
      ${currentFilters.whereSql}
    GROUP BY fd.category
    ORDER BY expired_count DESC, total_donations DESC
  `;

  // Previous period for comparison
  const prevQuery = `
    SELECT
      fd.category,
      COUNT(fd.id) AS total_donations,
      COUNT(fd.id) FILTER (WHERE fd.status = 'expired') AS expired_count
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
      ${previousFilters.whereSql}
    GROUP BY fd.category
  `;

  const [res, prevRes] = await Promise.all([
    db.query(query, [currentStart, currentEnd, ...currentFilters.params]),
    db.query(prevQuery, [previousStart, previousEnd, ...previousFilters.params])
  ]);

  const prevMap = {};
  prevRes.rows.forEach(r => {
    prevMap[r.category] = {
      total: parseInt(r.total_donations, 10),
      expired: parseInt(r.expired_count, 10)
    };
  });

  const categories = res.rows.map(r => {
    const total = parseInt(r.total_donations, 10);
    const expired = parseInt(r.expired_count, 10);
    const delivered = parseInt(r.delivered_count, 10);
    const expiryRate = total > 0 ? Math.round((expired / total) * 1000) / 10 : 0;

    const prevData = prevMap[r.category];
    const prevRate = prevData && prevData.total > 0
      ? Math.round((prevData.expired / prevData.total) * 1000) / 10
      : null;

    return {
      category: r.category,
      total_donations: total,
      delivered_count: delivered,
      expired_count: expired,
      cancelled_count: parseInt(r.cancelled_count, 10),
      total_quantity: parseInt(r.total_quantity, 10),
      expired_quantity: parseInt(r.expired_quantity, 10),
      total_weight_kg: Math.round(parseFloat(r.total_weight_kg) * 10) / 10,
      expired_weight_kg: Math.round(parseFloat(r.expired_weight_kg) * 10) / 10,
      provider_count: parseInt(r.provider_count, 10),
      expiry_rate: expiryRate,
      rate_change: prevRate !== null ? Math.round((expiryRate - prevRate) * 10) / 10 : null
    };
  });

  return { categories };
}

/**
 * 4. NGO Demand Gaps & Fulfillment Analysis
 */
async function getNGODemandGaps(filters = {}) {
  const { currentStart, currentEnd } = getPeriodBounds(filters);
  const filterHelper = buildFilterConditions({ ...filters, paramOffset: 3 });

  // 1. Top NGOs by claim activity vs delivery completion
  const ngoActivityQuery = `
    SELECT
      n.id AS ngo_id,
      n.organization_name,
      n.address,
      u.email,
      COUNT(d.id) AS total_claims,
      COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS delivered_count,
      COUNT(d.id) FILTER (WHERE d.status IN ('in_transit', 'accepted', 'pending')) AS active_claims,
      COUNT(d.id) FILTER (WHERE d.status = 'failed') AS failed_claims,
      COALESCE(SUM(fd.quantity), 0) AS requested_servings,
      COALESCE(SUM(fd.quantity) FILTER (WHERE d.status = 'delivered'), 0) AS received_servings
    FROM ngos n
    JOIN users u ON u.id = n.user_id
    JOIN deliveries d ON d.ngo_id = n.id
    JOIN food_donations fd ON fd.id = d.donation_id
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    WHERE d.created_at >= $1 AND d.created_at <= $2
      ${filterHelper.whereSql}
    GROUP BY n.id, n.organization_name, n.address, u.email
    ORDER BY total_claims DESC
    LIMIT 20
  `;

  // 2. Average time from post to claim (hours)
  const timeToClaimQuery = `
    SELECT
      ROUND(AVG(EXTRACT(EPOCH FROM (d.created_at - fd.created_at)) / 3600)::numeric, 1) AS avg_hours_to_claim,
      ROUND(MIN(EXTRACT(EPOCH FROM (d.created_at - fd.created_at)) / 60)::numeric, 1) AS min_minutes_to_claim,
      ROUND(MAX(EXTRACT(EPOCH FROM (d.created_at - fd.created_at)) / 3600)::numeric, 1) AS max_hours_to_claim
    FROM deliveries d
    JOIN food_donations fd ON fd.id = d.donation_id
    WHERE d.created_at >= $1 AND d.created_at <= $2
      AND d.created_at >= fd.created_at
  `;

  // 3. Unclaimed donations approaching expiry within 24 hours
  const approachingExpiryQuery = `
    SELECT
      fd.id,
      fd.title,
      fd.category,
      fd.quantity,
      fd.unit,
      fd.expiry_time,
      fd.pickup_address,
      fp.business_name AS provider_name,
      ROUND(EXTRACT(EPOCH FROM (fd.expiry_time - NOW())) / 3600)::numeric(10, 1) AS hours_remaining
    FROM food_donations fd
    JOIN food_providers fp ON fp.id = fd.provider_id
    WHERE fd.status = 'posted'
      AND fd.expiry_time > NOW()
      AND fd.expiry_time <= NOW() + INTERVAL '24 hours'
    ORDER BY fd.expiry_time ASC
    LIMIT 20
  `;

  // 4. Regional distribution of donations vs claims
  const regionalMismatchQuery = `
    SELECT
      COALESCE(
        SPLIT_PART(fd.pickup_address, ',', -2),
        SPLIT_PART(fd.pickup_address, ',', 1),
        'Metro Area'
      ) AS region_name,
      COUNT(fd.id) AS donations_available,
      COUNT(d.id) AS claims_made,
      COUNT(fd.id) FILTER (WHERE fd.status = 'expired') AS expired_unclaimed
    FROM food_donations fd
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
    GROUP BY
      COALESCE(
        SPLIT_PART(fd.pickup_address, ',', -2),
        SPLIT_PART(fd.pickup_address, ',', 1),
        'Metro Area'
      )
    ORDER BY donations_available DESC
    LIMIT 10
  `;

  const [ngoRes, timeRes, expRes, regRes] = await Promise.all([
    db.query(ngoActivityQuery, [currentStart, currentEnd, ...filterHelper.params]),
    db.query(timeToClaimQuery, [currentStart, currentEnd]),
    db.query(approachingExpiryQuery),
    db.query(regionalMismatchQuery, [currentStart, currentEnd])
  ]);

  return {
    ngo_activity: ngoRes.rows.map(r => ({
      ngo_id: r.ngo_id,
      organization_name: r.organization_name,
      address: r.address,
      email: r.email,
      total_claims: parseInt(r.total_claims, 10),
      delivered_count: parseInt(r.delivered_count, 10),
      active_claims: parseInt(r.active_claims, 10),
      failed_claims: parseInt(r.failed_claims, 10),
      requested_servings: parseInt(r.requested_servings, 10),
      received_servings: parseInt(r.received_servings, 10),
      fulfillment_rate: parseInt(r.total_claims, 10) > 0
        ? Math.round((parseInt(r.delivered_count, 10) / parseInt(r.total_claims, 10)) * 1000) / 10
        : 0
    })),
    time_to_claim: {
      avg_hours: parseFloat(timeRes.rows[0]?.avg_hours_to_claim) || 0,
      min_minutes: parseFloat(timeRes.rows[0]?.min_minutes_to_claim) || 0,
      max_hours: parseFloat(timeRes.rows[0]?.max_hours_to_claim) || 0
    },
    approaching_expiry: expRes.rows.map(r => ({
      id: r.id,
      title: r.title,
      category: r.category,
      quantity: r.quantity,
      unit: r.unit,
      expiry_time: r.expiry_time,
      pickup_address: r.pickup_address,
      provider_name: r.provider_name,
      hours_remaining: parseFloat(r.hours_remaining) || 0
    })),
    regional_mismatch: regRes.rows.map(r => ({
      region: r.region_name.trim(),
      donations_available: parseInt(r.donations_available, 10),
      claims_made: parseInt(r.claims_made, 10),
      expired_unclaimed: parseInt(r.expired_unclaimed, 10)
    }))
  };
}

/**
 * 5. Delivery Reliability & Completion Analytics
 */
async function getDeliveryReliability(filters = {}) {
  const { currentStart, currentEnd } = getPeriodBounds(filters);
  const filterHelper = buildFilterConditions({ ...filters, paramOffset: 3 });

  // Funnel & Counts
  const funnelQuery = `
    SELECT
      COUNT(d.id) AS total_deliveries,
      COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS delivered_count,
      COUNT(d.id) FILTER (WHERE d.status = 'in_transit') AS in_transit_count,
      COUNT(d.id) FILTER (WHERE d.status IN ('pending', 'accepted', 'picked_up')) AS pending_pickup_count,
      COUNT(d.id) FILTER (WHERE d.status = 'failed') AS failed_count,
      COUNT(d.id) FILTER (WHERE fd.status = 'cancelled') AS cancelled_count,
      -- Average claim to pickup duration (hours)
      ROUND(AVG(
        CASE WHEN d.pickup_time IS NOT NULL AND d.created_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (d.pickup_time - d.created_at)) / 3600
        ELSE NULL END
      )::numeric, 1) AS avg_hours_claim_to_pickup,
      -- Average pickup to delivery duration (minutes)
      ROUND(AVG(
        CASE WHEN d.delivery_time IS NOT NULL AND d.pickup_time IS NOT NULL
        THEN EXTRACT(EPOCH FROM (d.delivery_time - d.pickup_time)) / 60
        ELSE NULL END
      )::numeric, 1) AS avg_minutes_pickup_to_delivery,
      -- On-time delivery rate (delivered before donation expiry_time)
      COUNT(d.id) FILTER (
        WHERE d.status = 'delivered'
          AND d.delivery_time IS NOT NULL
          AND fd.expiry_time IS NOT NULL
          AND d.delivery_time <= fd.expiry_time
      ) AS on_time_deliveries
    FROM deliveries d
    JOIN food_donations fd ON fd.id = d.donation_id
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    WHERE d.created_at >= $1 AND d.created_at <= $2
      ${filterHelper.whereSql}
  `;

  // QR Verification Failures count in period
  const qrFailuresQuery = `
    SELECT COUNT(*) AS total_failed_scans
    FROM qr_scan_attempts
    WHERE attempted_at >= $1 AND attempted_at <= $2
  `;

  // Outcomes by volunteer
  const volunteerPerfQuery = `
    SELECT
      u.full_name AS volunteer_name,
      v.vehicle_type,
      v.rating,
      COUNT(d.id) AS assigned_missions,
      COUNT(d.id) FILTER (WHERE d.status = 'delivered') AS completed_missions,
      COUNT(d.id) FILTER (WHERE d.status = 'failed') AS failed_missions
    FROM deliveries d
    JOIN volunteers v ON v.id = d.volunteer_id
    JOIN users u ON u.id = v.user_id
    WHERE d.created_at >= $1 AND d.created_at <= $2
    GROUP BY u.full_name, v.vehicle_type, v.rating
    ORDER BY completed_missions DESC
    LIMIT 10
  `;

  const [funnelRes, qrRes, volRes] = await Promise.all([
    db.query(funnelQuery, [currentStart, currentEnd, ...filterHelper.params]),
    db.query(qrFailuresQuery, [currentStart, currentEnd]),
    db.query(volunteerPerfQuery, [currentStart, currentEnd])
  ]);

  const f = funnelRes.rows[0];
  const total = parseInt(f.total_deliveries, 10) || 0;
  const delivered = parseInt(f.delivered_count, 10) || 0;
  const onTime = parseInt(f.on_time_deliveries, 10) || 0;

  return {
    totals: {
      total_deliveries: total,
      delivered_count: delivered,
      in_transit_count: parseInt(f.in_transit_count, 10) || 0,
      pending_pickup_count: parseInt(f.pending_pickup_count, 10) || 0,
      failed_count: parseInt(f.failed_count, 10) || 0,
      cancelled_count: parseInt(f.cancelled_count, 10) || 0,
      completion_rate: total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0,
      on_time_rate: delivered > 0 ? Math.round((onTime / delivered) * 1000) / 10 : 0,
      avg_hours_claim_to_pickup: parseFloat(f.avg_hours_claim_to_pickup) || 0,
      avg_minutes_pickup_to_delivery: parseFloat(f.avg_minutes_pickup_to_delivery) || 0,
      qr_scan_failures: parseInt(qrRes.rows[0]?.total_failed_scans, 10) || 0
    },
    top_volunteers: volRes.rows.map(r => ({
      name: r.volunteer_name,
      vehicle_type: r.vehicle_type,
      rating: parseFloat(r.rating) || 0,
      assigned: parseInt(r.assigned_missions, 10),
      completed: parseInt(r.completed_missions, 10),
      failed: parseInt(r.failed_missions, 10),
      rate: parseInt(r.assigned_missions, 10) > 0
        ? Math.round((parseInt(r.completed_missions, 10) / parseInt(r.assigned_missions, 10)) * 1000) / 10
        : 0
    }))
  };
}

/**
 * 6. Inactive Provider Monitoring
 */
async function getInactiveProviders({ days = 30, limit = 50, page = 1 } = {}) {
  const thresholdDays = Math.max(parseInt(days, 10) || 30, 1);
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM food_providers fp
    JOIN users u ON u.id = fp.user_id
    WHERE NOT EXISTS (
      SELECT 1 FROM food_donations fd
      WHERE fd.provider_id = fp.id
      AND fd.created_at >= NOW() - ($1 || ' days')::interval
    )
  `;

  const listQuery = `
    SELECT
      fp.id AS provider_id,
      fp.business_name,
      fp.business_type,
      fp.address,
      fp.is_verified,
      u.id AS user_id,
      u.full_name AS contact_name,
      u.email,
      u.phone,
      u.status AS account_status,
      MAX(fd.created_at) AS last_donation_date,
      ROUND(EXTRACT(EPOCH FROM (NOW() - MAX(fd.created_at))) / 86400)::integer AS days_inactive,
      COUNT(fd.id) AS total_donations,
      COUNT(fd.id) FILTER (WHERE fd.status = 'delivered') AS completed_donations,
      COUNT(fd.id) FILTER (WHERE fd.status = 'expired') AS expired_donations
    FROM food_providers fp
    JOIN users u ON u.id = fp.user_id
    LEFT JOIN food_donations fd ON fd.provider_id = fp.id
    GROUP BY fp.id, fp.business_name, fp.business_type, fp.address, fp.is_verified,
             u.id, u.full_name, u.email, u.phone, u.status
    HAVING MAX(fd.created_at) IS NULL OR MAX(fd.created_at) < NOW() - ($1 || ' days')::interval
    ORDER BY MAX(fd.created_at) ASC NULLS FIRST
    LIMIT $2 OFFSET $3
  `;

  const [countRes, listRes] = await Promise.all([
    db.query(countQuery, [thresholdDays]),
    db.query(listQuery, [thresholdDays, limit, offset])
  ]);

  const total = parseInt(countRes.rows[0]?.total, 10) || 0;

  return {
    threshold_days: thresholdDays,
    pagination: {
      total,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    },
    providers: listRes.rows.map(r => ({
      provider_id: r.provider_id,
      user_id: r.user_id,
      business_name: r.business_name,
      business_type: r.business_type || 'Restaurant / Donor',
      address: r.address,
      contact_name: r.contact_name,
      email: r.email,
      phone: r.phone,
      is_verified: r.is_verified,
      account_status: r.account_status,
      last_donation_date: r.last_donation_date,
      days_inactive: r.days_inactive !== null ? r.days_inactive : 'Never Donated',
      total_donations: parseInt(r.total_donations, 10),
      completed_donations: parseInt(r.completed_donations, 10),
      expired_donations: parseInt(r.expired_donations, 10)
    }))
  };
}

/**
 * 7. CSV Data Export
 * Generates structured CSV rows based on current filters.
 */
async function exportFilteredData(filters = {}) {
  const { currentStart, currentEnd } = getPeriodBounds(filters);
  const filterHelper = buildFilterConditions({ ...filters, paramOffset: 3 });

  const query = `
    SELECT
      fd.id AS donation_id,
      fd.title AS donation_title,
      fd.category,
      fd.quantity,
      fd.unit,
      fd.weight_kg,
      fd.status AS donation_status,
      fd.created_at AS posted_at,
      fd.expiry_time,
      fp.business_name AS provider_name,
      fp.address AS pickup_address,
      ngo.organization_name AS ngo_name,
      u_ngo.email AS ngo_email,
      d.id AS delivery_id,
      d.status AS delivery_status,
      d.pickup_time,
      d.delivery_time,
      u_vol.full_name AS volunteer_name
    FROM food_donations fd
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.donation_id = fd.id
    LEFT JOIN ngos ngo ON ngo.id = d.ngo_id
    LEFT JOIN users u_ngo ON u_ngo.id = ngo.user_id
    LEFT JOIN volunteers v ON v.id = d.volunteer_id
    LEFT JOIN users u_vol ON u_vol.id = v.user_id
    WHERE fd.created_at >= $1 AND fd.created_at <= $2
      ${filterHelper.whereSql}
    ORDER BY fd.created_at DESC
    LIMIT 2000
  `;

  const { rows } = await db.query(query, [currentStart, currentEnd, ...filterHelper.params]);

  // Convert to CSV
  const headers = [
    'Donation ID',
    'Title',
    'Category',
    'Quantity',
    'Unit',
    'Weight (KG)',
    'Donation Status',
    'Posted At',
    'Expiry Time',
    'Food Provider',
    'Pickup Address',
    'Shelter NGO',
    'NGO Email',
    'Delivery Status',
    'Pickup Time',
    'Delivery Time',
    'Volunteer'
  ];

  const escapeCSV = (val) => {
    if (val === null || val === undefined) return '""';
    const str = String(val).replace(/"/g, '""');
    return `"${str}"`;
  };

  const csvRows = [headers.join(',')];

  rows.forEach(r => {
    csvRows.push([
      escapeCSV(r.donation_id),
      escapeCSV(r.donation_title),
      escapeCSV(r.category),
      r.quantity || 0,
      escapeCSV(r.unit),
      r.weight_kg || 0,
      escapeCSV(r.donation_status),
      escapeCSV(r.posted_at ? new Date(r.posted_at).toISOString() : ''),
      escapeCSV(r.expiry_time ? new Date(r.expiry_time).toISOString() : ''),
      escapeCSV(r.provider_name),
      escapeCSV(r.pickup_address),
      escapeCSV(r.ngo_name),
      escapeCSV(r.ngo_email),
      escapeCSV(r.delivery_status || 'unclaimed'),
      escapeCSV(r.pickup_time ? new Date(r.pickup_time).toISOString() : ''),
      escapeCSV(r.delivery_time ? new Date(r.delivery_time).toISOString() : ''),
      escapeCSV(r.volunteer_name)
    ].join(','));
  });

  return csvRows.join('\r\n');
}

/**
 * Filter Options helper: list of organizations & regions for dropdowns
 */
async function getFilterOptions() {
  const [providersRes, ngosRes, categoriesRes] = await Promise.all([
    db.query(`SELECT id, business_name FROM food_providers ORDER BY business_name ASC LIMIT 100`),
    db.query(`SELECT id, organization_name FROM ngos ORDER BY organization_name ASC LIMIT 100`),
    db.query(`SELECT DISTINCT category FROM food_donations WHERE category IS NOT NULL ORDER BY category ASC`)
  ]);

  return {
    providers: providersRes.rows.map(r => ({ id: r.id, name: r.business_name })),
    ngos: ngosRes.rows.map(r => ({ id: r.id, name: r.organization_name })),
    categories: categoriesRes.rows.map(r => r.category)
  };
}

module.exports = {
  getKPISummary,
  getDonationHotspots,
  getWastedCategories,
  getNGODemandGaps,
  getDeliveryReliability,
  getInactiveProviders,
  exportFilteredData,
  getFilterOptions
};
