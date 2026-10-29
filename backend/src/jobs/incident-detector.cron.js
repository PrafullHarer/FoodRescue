const cron = require('node-cron');
const db = require('../config/db');
const incidentService = require('../modules/incidents/incident.service');

let isRunning = false;

/**
 * Incident Detector Cron Job
 * Runs every 5 minutes to automatically detect operational exceptions and enforce escalation rules.
 */
const startIncidentDetector = () => {
  // Run every 5 minutes
  const job = cron.schedule('*/5 * * * *', async () => {
    if (isRunning) return;
    isRunning = true;

    try {
      await detectLateDeliveries();
      await detectMissedPickups();
      await detectStuckInTransit();
      await detectRepeatedQRFailures();
      await processAutoEscalations();
    } catch (error) {
      console.error('[CRON] Incident detector job error:', error.message);
    } finally {
      isRunning = false;
    }
  });

  console.log('[CRON] Incident detector and escalation engine started (runs every 5 minutes)');
  return job;
};

/**
 * 1. Late Delivery Detection
 * Identifies active deliveries past donation expiry time.
 */
async function detectLateDeliveries() {
  const query = `
    SELECT
      d.id AS delivery_id,
      d.donation_id,
      d.volunteer_id,
      d.ngo_id,
      fd.title AS donation_title,
      fd.expiry_time,
      ROUND(EXTRACT(EPOCH FROM (NOW() - fd.expiry_time)) / 3600)::integer AS hours_overdue
    FROM deliveries d
    JOIN food_donations fd ON fd.id = d.donation_id
    WHERE d.status IN ('in_transit', 'accepted')
      AND fd.expiry_time < NOW()
      AND NOT EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.delivery_id = d.id
          AND i.incident_type = 'late_delivery'
          AND i.status IN ('open', 'acknowledged', 'investigating', 'awaiting_response')
      )
    LIMIT 20
  `;

  const { rows } = await db.query(query);

  for (const del of rows) {
    const severity = del.hours_overdue >= 2 ? 'critical' : 'high';
    await incidentService.createIncident({
      incident_type: 'late_delivery',
      title: `Overdue Delivery: "${del.donation_title}"`,
      description: `Delivery has exceeded the donation expiry deadline by ${del.hours_overdue} hour(s) and remains uncompleted.`,
      severity,
      source: 'automatic',
      donation_id: del.donation_id,
      delivery_id: del.delivery_id,
      actorType: 'system'
    });
    console.log(`[CRON] Auto-detected late delivery: ${del.delivery_id} (${del.donation_title})`);
  }
}

/**
 * 2. Missed Pickup Detection
 * Identifies scheduled deliveries where pickup window ended over 30 mins ago with no pickup scan.
 */
async function detectMissedPickups() {
  const query = `
    SELECT
      d.id AS delivery_id,
      d.donation_id,
      d.volunteer_id,
      fd.title AS donation_title,
      fd.pickup_window_end,
      ROUND(EXTRACT(EPOCH FROM (NOW() - fd.pickup_window_end)) / 60)::integer AS mins_overdue
    FROM deliveries d
    JOIN food_donations fd ON fd.id = d.donation_id
    WHERE d.status IN ('pending', 'accepted')
      AND d.pickup_time IS NULL
      AND fd.pickup_window_end IS NOT NULL
      AND fd.pickup_window_end < NOW() - INTERVAL '30 minutes'
      AND NOT EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.delivery_id = d.id
          AND i.incident_type = 'missed_pickup'
          AND i.status IN ('open', 'acknowledged', 'investigating', 'awaiting_response')
      )
    LIMIT 20
  `;

  const { rows } = await db.query(query);

  for (const p of rows) {
    await incidentService.createIncident({
      incident_type: 'missed_pickup',
      title: `Missed Pickup: "${p.donation_title}"`,
      description: `Scheduled pickup window ended ${p.mins_overdue} minutes ago and courier pickup has not been verified.`,
      severity: 'medium',
      source: 'automatic',
      donation_id: p.donation_id,
      delivery_id: p.delivery_id,
      actorType: 'system'
    });
    console.log(`[CRON] Auto-detected missed pickup: ${p.delivery_id} (${p.donation_title})`);
  }
}

/**
 * 3. Delivery Stuck in Transit Detection
 * Deliveries that have been in transit for more than 4 hours without reaching the NGO.
 */
async function detectStuckInTransit() {
  const query = `
    SELECT
      d.id AS delivery_id,
      d.donation_id,
      d.volunteer_id,
      fd.title AS donation_title,
      d.pickup_time,
      ROUND(EXTRACT(EPOCH FROM (NOW() - d.pickup_time)) / 3600)::integer AS hours_in_transit
    FROM deliveries d
    JOIN food_donations fd ON fd.id = d.donation_id
    WHERE d.status = 'in_transit'
      AND d.pickup_time < NOW() - INTERVAL '4 hours'
      AND NOT EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.delivery_id = d.id
          AND i.incident_type = 'stuck_in_transit'
          AND i.status IN ('open', 'acknowledged', 'investigating', 'awaiting_response')
      )
    LIMIT 10
  `;

  const { rows } = await db.query(query);

  for (const t of rows) {
    await incidentService.createIncident({
      incident_type: 'stuck_in_transit',
      title: `Courier In-Transit Delay: "${t.donation_title}"`,
      description: `Delivery has been marked in_transit for over ${t.hours_in_transit} hours without shelter dropoff scan. Possible courier delay or emergency.`,
      severity: 'high',
      source: 'automatic',
      donation_id: t.donation_id,
      delivery_id: t.delivery_id,
      actorType: 'system'
    });
    console.log(`[CRON] Auto-detected stuck in transit: ${t.delivery_id}`);
  }
}

/**
 * 4. Repeated Failed QR Scans Detection
 * Detects 3+ failed scan attempts on the same delivery within the last 30 minutes.
 */
async function detectRepeatedQRFailures() {
  const query = `
    SELECT
      q.delivery_id,
      COUNT(q.id) AS failure_count,
      d.donation_id,
      fd.title AS donation_title
    FROM qr_scan_attempts q
    JOIN deliveries d ON d.id = q.delivery_id
    JOIN food_donations fd ON fd.id = d.donation_id
    WHERE q.attempted_at >= NOW() - INTERVAL '30 minutes'
      AND q.delivery_id IS NOT NULL
      AND NOT EXISTS (
        SELECT 1 FROM incidents i
        WHERE i.delivery_id = q.delivery_id
          AND i.incident_type = 'failed_qr_scan'
          AND i.created_at >= NOW() - INTERVAL '2 hours'
      )
    GROUP BY q.delivery_id, d.donation_id, fd.title
    HAVING COUNT(q.id) >= 3
    LIMIT 5
  `;

  const { rows } = await db.query(query);

  for (const f of rows) {
    await incidentService.createIncident({
      incident_type: 'failed_qr_scan',
      title: `Repeated QR Scan Failures on "${f.donation_title}"`,
      description: `${f.failure_count} verification failures recorded in the past 30 minutes for delivery ${f.delivery_id}. Review for potential scanning difficulties or tampering.`,
      severity: 'medium',
      source: 'automatic',
      donation_id: f.donation_id,
      delivery_id: f.delivery_id,
      actorType: 'system'
    });
    console.log(`[CRON] Auto-detected repeated QR scan failures: ${f.delivery_id}`);
  }
}

/**
 * 5. Automated Escalation Rules
 * Escalates critical incidents unacknowledged > 2h and high incidents unacknowledged > 4h.
 */
async function processAutoEscalations() {
  const query = `
    SELECT id, incident_reference, title, severity, escalation_level, created_at
    FROM incidents
    WHERE status IN ('open', 'acknowledged')
      AND escalation_level < 2
      AND (
        (severity = 'critical' AND created_at < NOW() - INTERVAL '2 hours')
        OR (severity = 'high' AND created_at < NOW() - INTERVAL '4 hours')
      )
    LIMIT 10
  `;

  const { rows } = await db.query(query);

  for (const inc of rows) {
    const reason = `Automated Escalation Rule: ${inc.severity.toUpperCase()} incident unresolved beyond threshold time.`;
    await incidentService.escalateIncident(inc.id, reason, null);
    console.log(`[CRON] Auto-escalated incident: ${inc.incident_reference}`);
  }
}

module.exports = {
  startIncidentDetector,
  detectLateDeliveries,
  detectMissedPickups,
  detectStuckInTransit,
  detectRepeatedQRFailures,
  processAutoEscalations
};
