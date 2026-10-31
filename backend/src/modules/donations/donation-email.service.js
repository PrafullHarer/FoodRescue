/**
 * Donation Completion Email & Timeline Service
 * FoodRescue — System of Record
 * 
 * Handles automated completion confirmation emails for Food Providers and NGOs,
 * structured donation lifecycle event history, and idempotent email dispatch.
 */

const nodemailer = require('nodemailer');
const db = require('../../config/db');
const config = require('../../config');

// Reusable Transporter (lazy initialization)
let transporter = null;
const getTransporter = () => {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: config.smtp.host,
      port: config.smtp.port,
      secure: config.smtp.port === 465,
      auth: {
        user: config.smtp.user,
        pass: config.smtp.pass,
      },
    });
  }
  return transporter;
};

/**
 * HTML Escaping helper to prevent content/HTML injection.
 */
const escapeHtml = (str) => {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
};

/**
 * Format timestamp into readable human format.
 */
const formatDateTime = (dateVal) => {
  if (!dateVal) return '';
  const d = new Date(dateVal);
  if (isNaN(d.getTime())) return String(dateVal);
  return d.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

/**
 * Map event type to professional display label.
 */
const getEventLabel = (type) => {
  switch (type) {
    case 'DONATION_CREATED': return 'Donation Created';
    case 'DONATION_APPROVED': return 'Donation Approved';
    case 'DONATION_CLAIMED': return 'Donation Claimed by NGO';
    case 'VOLUNTEER_ASSIGNED': return 'Volunteer Assigned';
    case 'PICKUP_CONFIRMED': return 'Pickup Confirmed';
    case 'DELIVERY_STARTED': return 'Delivery Started';
    case 'FOOD_RECEIVED': return 'Food Received and Verified';
    case 'DONATION_COMPLETED': return 'Donation Completed';
    default: return type.replace(/_/g, ' ');
  }
};

/**
 * Record a structured lifecycle event in donation_timeline_events.
 */
const recordTimelineEvent = async (donationId, eventType, actorId = null, metadata = {}) => {
  try {
    const { rows } = await db.query(
      `INSERT INTO donation_timeline_events (donation_id, event_type, actor_id, metadata, event_timestamp)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [donationId, eventType, actorId, JSON.stringify(metadata || {})]
    );
    return rows[0];
  } catch (err) {
    console.warn(`[TIMELINE] Could not record event ${eventType} for donation ${donationId}:`, err.message);
    return null;
  }
};

/**
 * Build complete donation timeline from database records.
 * Only returns events that actually occurred with valid timestamps.
 */
const buildDonationTimeline = async (donationId) => {
  // 1. Fetch recorded timeline events
  const { rows: eventRows } = await db.query(
    `SELECT event_type, event_timestamp, metadata
     FROM donation_timeline_events
     WHERE donation_id = $1
     ORDER BY event_timestamp ASC`,
    [donationId]
  );

  const recordedTypes = new Set(eventRows.map((e) => e.event_type));
  const timeline = [];

  // Add recorded events
  for (const row of eventRows) {
    timeline.push({
      type: row.event_type,
      label: getEventLabel(row.event_type),
      timestamp: formatDateTime(row.event_timestamp),
      rawTimestamp: row.event_timestamp,
      metadata: row.metadata,
    });
  }

  // 2. Synthesize missing events from related tables if not recorded in timeline table
  const { rows: donRows } = await db.query(
    `SELECT fd.created_at, fd.status,
            c.claimed_at, c.created_at AS claim_created,
            d.created_at AS delivery_created, d.pickup_time, d.delivery_time, d.volunteer_id
     FROM food_donations fd
     LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
     LEFT JOIN deliveries d ON d.donation_id = fd.id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (donRows.length > 0) {
    const d = donRows[0];

    if (!recordedTypes.has('DONATION_CREATED') && d.created_at) {
      timeline.push({
        type: 'DONATION_CREATED',
        label: 'Donation Created',
        timestamp: formatDateTime(d.created_at),
        rawTimestamp: d.created_at,
      });
    }

    const claimTime = d.claimed_at || d.claim_created;
    if (!recordedTypes.has('DONATION_CLAIMED') && claimTime) {
      timeline.push({
        type: 'DONATION_CLAIMED',
        label: 'Donation Claimed by NGO',
        timestamp: formatDateTime(claimTime),
        rawTimestamp: claimTime,
      });
    }

    if (!recordedTypes.has('VOLUNTEER_ASSIGNED') && d.volunteer_id && d.delivery_created) {
      timeline.push({
        type: 'VOLUNTEER_ASSIGNED',
        label: 'Volunteer Assigned',
        timestamp: formatDateTime(d.delivery_created),
        rawTimestamp: d.delivery_created,
      });
    }

    if (!recordedTypes.has('PICKUP_CONFIRMED') && d.pickup_time) {
      timeline.push({
        type: 'PICKUP_CONFIRMED',
        label: 'Pickup Confirmed',
        timestamp: formatDateTime(d.pickup_time),
        rawTimestamp: d.pickup_time,
      });
    }

    if (!recordedTypes.has('DELIVERY_STARTED') && d.pickup_time && d.volunteer_id) {
      timeline.push({
        type: 'DELIVERY_STARTED',
        label: 'Delivery Started',
        timestamp: formatDateTime(d.pickup_time),
        rawTimestamp: d.pickup_time,
      });
    }

    if (!recordedTypes.has('FOOD_RECEIVED') && d.delivery_time) {
      timeline.push({
        type: 'FOOD_RECEIVED',
        label: 'Food Received and Verified',
        timestamp: formatDateTime(d.delivery_time),
        rawTimestamp: d.delivery_time,
      });
    }

    if (!recordedTypes.has('DONATION_COMPLETED') && (d.delivery_time || d.status === 'completed' || d.status === 'delivered')) {
      timeline.push({
        type: 'DONATION_COMPLETED',
        label: 'Donation Completed',
        timestamp: formatDateTime(d.delivery_time || new Date()),
        rawTimestamp: d.delivery_time || new Date(),
      });
    }
  }

  // Sort by rawTimestamp ascending
  timeline.sort((a, b) => new Date(a.rawTimestamp).getTime() - new Date(b.rawTimestamp).getTime());

  // Filter out any duplicate types that have identical timestamps
  const uniqueTimeline = [];
  const seenTypes = new Set();
  for (const item of timeline) {
    if (!seenTypes.has(item.type)) {
      seenTypes.add(item.type);
      uniqueTimeline.push(item);
    }
  }

  return uniqueTimeline;
};

/**
 * Build responsive HTML template for Food Provider.
 */
const buildProviderEmailHtml = ({
  providerName,
  donationId,
  foodName,
  foodCategory,
  quantity,
  pickupLocation,
  createdAt,
  ngoName,
  ngoContact,
  completedAt,
  timeline = [],
}) => {
  const safeProvider = escapeHtml(providerName);
  const safeDonationId = escapeHtml(donationId);
  const safeFoodName = escapeHtml(foodName);
  const safeCategory = escapeHtml(foodCategory);
  const safeQuantity = escapeHtml(quantity);
  const safePickup = escapeHtml(pickupLocation);
  const safeCreatedAt = escapeHtml(createdAt);
  const safeNgoName = escapeHtml(ngoName);
  const safeNgoContact = escapeHtml(ngoContact || 'Shelter Coordinator');
  const safeCompletedAt = escapeHtml(completedAt);

  // Build timeline items HTML
  const timelineHtml = timeline
    .map(
      (step, idx) => `
      <tr>
        <td style="vertical-align: top; width: 36px; padding-bottom: 16px;">
          <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #84CC16; color: #0F1F14; text-align: center; line-height: 24px; font-weight: bold; font-size: 11px;">
            ${idx + 1}
          </div>
          ${idx < timeline.length - 1 ? '<div style="width: 2px; height: 100%; min-height: 20px; background-color: #A3E635; margin: 4px auto 0 auto;"></div>' : ''}
        </td>
        <td style="vertical-align: top; padding-bottom: 16px; padding-left: 8px;">
          <div style="font-size: 13px; font-weight: 700; color: #0F1F14;">${escapeHtml(step.label)}</div>
          <div style="font-size: 11px; color: #4B5563; margin-top: 2px;">${escapeHtml(step.timestamp)}</div>
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Your Food Donation Has Been Successfully Completed – FoodRescue</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F1F14; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 31, 20, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0F1F14; padding: 28px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <!-- Brand Badge -->
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(132, 204, 22, 0.15); border: 1px solid rgba(132, 204, 22, 0.35); border-radius: 100px; margin-bottom: 12px;">
                      <span style="color: #A3E635; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">FOODRESCUE CONFIRMATION</span>
                    </div>
                    <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                      Donation Successfully Completed
                    </h1>
                    <p style="color: #A3E635; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">
                      Food Delivered &amp; Verified by Shelter
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="font-size: 16px; font-weight: 700; color: #0F1F14; margin: 0 0 16px 0;">
                Dear ${safeProvider},
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 12px 0;">
                Thank you for choosing FoodRescue and trusting our platform to make a difference.
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                We are delighted to inform you that your food donation has been successfully delivered and received by the NGO.
              </p>

              <!-- Donation Details Structured Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; border: 1px solid #E5E7EB; border-radius: 14px; padding: 20px; margin-bottom: 28px;">
                <tr>
                  <td colspan="2" style="border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: 800; color: #0F1F14; text-transform: uppercase; letter-spacing: 1px;">
                      Donation Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280; width: 40%;">Donation ID:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14; word-break: break-all;">${safeDonationId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Food Name:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeFoodName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Food Category:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0F1F14; text-transform: capitalize;">${safeCategory}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Quantity:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeQuantity}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Pickup Location:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #0F1F14;">${safePickup}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Donation Created:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #0F1F14;">${safeCreatedAt}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">NGO Name:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeNgoName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">NGO Contact:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #0F1F14;">${safeNgoContact}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Completion Date:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #15803D;">${safeCompletedAt}</td>
                </tr>
              </table>

              <!-- Donation Timeline Section -->
              <div style="margin-bottom: 28px;">
                <h3 style="font-size: 14px; font-weight: 800; color: #0F1F14; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0; border-bottom: 2px solid #84CC16; padding-bottom: 6px; display: inline-block;">
                  Complete Donation Timeline
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
                  ${timelineHtml}
                </table>
              </div>

              <!-- Thank You Section -->
              <div style="background-color: #0F1F14; border-radius: 14px; padding: 22px; margin-bottom: 24px; color: #FAF7F0;">
                <p style="font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
                  "Your generosity has helped turn surplus food into meaningful meals for people who need them."
                </p>
                <p style="font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
                  At FoodRescue, we believe that every meal saved matters. Thank you for trusting us with your donation and being part of our mission to reduce food waste and support communities.
                </p>
                <p style="font-size: 13px; line-height: 1.6; margin: 0;">
                  We look forward to helping you make an even greater impact in the future.
                </p>
              </div>

              <!-- Signature Block -->
              <p style="font-size: 13px; color: #374151; margin: 0 0 4px 0;">Warm regards,</p>
              <p style="font-size: 14px; font-weight: 800; color: #0F1F14; margin: 0 0 4px 0;">Team FoodRescue</p>
              <p style="font-size: 11px; font-weight: 600; color: #65A30D; margin: 0;">
                Reduce Waste &bull; Feed People &bull; Build Communities
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F0; border-top: 1px solid #E5E7EB; padding: 18px 32px; text-align: center;">
              <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
                This automated confirmation was generated by FoodRescue System of Record.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Build responsive HTML template for NGO.
 */
const buildNgoEmailHtml = ({
  ngoName,
  donationId,
  foodName,
  foodCategory,
  quantity,
  providerName,
  pickupLocation,
  completedAt,
  timeline = [],
}) => {
  const safeNgoName = escapeHtml(ngoName);
  const safeDonationId = escapeHtml(donationId);
  const safeFoodName = escapeHtml(foodName);
  const safeCategory = escapeHtml(foodCategory);
  const safeQuantity = escapeHtml(quantity);
  const safeProvider = escapeHtml(providerName);
  const safePickup = escapeHtml(pickupLocation);
  const safeCompletedAt = escapeHtml(completedAt);

  const timelineHtml = timeline
    .map(
      (step, idx) => `
      <tr>
        <td style="vertical-align: top; width: 36px; padding-bottom: 16px;">
          <div style="width: 24px; height: 24px; border-radius: 50%; background-color: #84CC16; color: #0F1F14; text-align: center; line-height: 24px; font-weight: bold; font-size: 11px;">
            ${idx + 1}
          </div>
          ${idx < timeline.length - 1 ? '<div style="width: 2px; height: 100%; min-height: 20px; background-color: #A3E635; margin: 4px auto 0 auto;"></div>' : ''}
        </td>
        <td style="vertical-align: top; padding-bottom: 16px; padding-left: 8px;">
          <div style="font-size: 13px; font-weight: 700; color: #0F1F14;">${escapeHtml(step.label)}</div>
          <div style="font-size: 11px; color: #4B5563; margin-top: 2px;">${escapeHtml(step.timestamp)}</div>
        </td>
      </tr>
    `
    )
    .join('');

  return `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Food Donation Successfully Received – FoodRescue</title>
</head>
<body style="margin: 0; padding: 0; background-color: #FAF7F0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #0F1F14; -webkit-font-smoothing: antialiased;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; padding: 24px 12px;">
    <tr>
      <td align="center">
        <!-- Main Card Container -->
        <table role="presentation" width="100%" style="max-width: 600px; background-color: #FFFFFF; border-radius: 20px; border: 1px solid #E5E7EB; overflow: hidden; box-shadow: 0 4px 16px rgba(15, 31, 20, 0.06);">
          
          <!-- Header Banner -->
          <tr>
            <td style="background-color: #0F1F14; padding: 28px 32px; text-align: center;">
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                <tr>
                  <td align="center">
                    <div style="display: inline-block; padding: 6px 14px; background-color: rgba(132, 204, 22, 0.15); border: 1px solid rgba(132, 204, 22, 0.35); border-radius: 100px; margin-bottom: 12px;">
                      <span style="color: #A3E635; font-size: 11px; font-weight: 800; letter-spacing: 1.5px; text-transform: uppercase;">NGO RECEIPT CONFIRMATION</span>
                    </div>
                    <h1 style="color: #FFFFFF; font-size: 22px; font-weight: 800; margin: 0; letter-spacing: -0.5px;">
                      Food Donation Received
                    </h1>
                    <p style="color: #A3E635; font-size: 13px; margin: 6px 0 0 0; font-weight: 500;">
                      Delivery Marked as Completed
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Main Content Body -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              <p style="font-size: 16px; font-weight: 700; color: #0F1F14; margin: 0 0 16px 0;">
                Dear ${safeNgoName},
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 12px 0;">
                Great news! Your claimed food donation has been successfully completed.
              </p>

              <p style="font-size: 14px; line-height: 1.6; color: #374151; margin: 0 0 24px 0;">
                We are happy to confirm that the donated food has been received and the delivery has been marked as completed.
              </p>

              <!-- Received Details Structured Card -->
              <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #FAF7F0; border: 1px solid #E5E7EB; border-radius: 14px; padding: 20px; margin-bottom: 28px;">
                <tr>
                  <td colspan="2" style="border-bottom: 1px solid #E5E7EB; padding-bottom: 12px; margin-bottom: 12px;">
                    <span style="font-size: 11px; font-weight: 800; color: #0F1F14; text-transform: uppercase; letter-spacing: 1px;">
                      Received Donation Details
                    </span>
                  </td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280; width: 40%;">Donation ID:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14; word-break: break-all;">${safeDonationId}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Food Name:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeFoodName}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Food Category:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 600; color: #0F1F14; text-transform: capitalize;">${safeCategory}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Quantity Received:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeQuantity}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Donated By:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #0F1F14;">${safeProvider}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Pickup Location:</td>
                  <td style="padding: 8px 0; font-size: 13px; color: #0F1F14;">${safePickup}</td>
                </tr>
                <tr>
                  <td style="padding: 8px 0; font-size: 13px; color: #6B7280;">Received Date &amp; Time:</td>
                  <td style="padding: 8px 0; font-size: 13px; font-weight: 700; color: #15803D;">${safeCompletedAt}</td>
                </tr>
              </table>

              <!-- Donation Timeline Section -->
              <div style="margin-bottom: 28px;">
                <h3 style="font-size: 14px; font-weight: 800; color: #0F1F14; text-transform: uppercase; letter-spacing: 0.5px; margin: 0 0 16px 0; border-bottom: 2px solid #84CC16; padding-bottom: 6px; display: inline-block;">
                  Donation Timeline
                </h3>
                <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="margin-top: 8px;">
                  ${timelineHtml}
                </table>
              </div>

              <!-- Thank You Section -->
              <div style="background-color: #0F1F14; border-radius: 14px; padding: 22px; margin-bottom: 24px; color: #FAF7F0;">
                <p style="font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
                  "Thank you for being a valuable part of FoodRescue."
                </p>
                <p style="font-size: 13px; line-height: 1.6; margin: 0 0 12px 0;">
                  Your efforts help ensure that rescued food reaches the people and communities who need it most.
                </p>
                <p style="font-size: 13px; line-height: 1.6; margin: 0;">
                  Together, we are reducing food waste, supporting communities, and creating a meaningful impact.
                </p>
              </div>

              <!-- Signature Block -->
              <p style="font-size: 13px; color: #374151; margin: 0 0 4px 0;">Warm regards,</p>
              <p style="font-size: 14px; font-weight: 800; color: #0F1F14; margin: 0 0 4px 0;">Team FoodRescue</p>
              <p style="font-size: 11px; font-weight: 600; color: #65A30D; margin: 0;">
                Reduce Waste &bull; Feed People &bull; Build Communities
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color: #FAF7F0; border-top: 1px solid #E5E7EB; padding: 18px 32px; text-align: center;">
              <p style="font-size: 11px; color: #9CA3AF; margin: 0;">
                This automated confirmation was generated by FoodRescue System of Record.
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>
`;
};

/**
 * Generate plain-text fallback string for provider email.
 */
const buildProviderPlainText = ({ providerName, donationId, foodName, quantity, ngoName, completedAt, timeline }) => {
  const steps = (timeline || []).map((t, i) => `${i + 1}. ${t.label} — ${t.timestamp}`).join('\n');
  return `Dear ${providerName},

Thank you for choosing FoodRescue and trusting our platform to make a difference.
We are delighted to inform you that your food donation has been successfully delivered and received by the NGO.

DONATION DETAILS:
- Donation ID: ${donationId}
- Food Name: ${foodName}
- Quantity: ${quantity}
- NGO Name: ${ngoName}
- Completion Date: ${completedAt}

TIMELINE:
${steps}

Your generosity has helped turn surplus food into meaningful meals for people who need them.
At FoodRescue, we believe that every meal saved matters.

Warm regards,
Team FoodRescue
Reduce Waste • Feed People • Build Communities`;
};

/**
 * Generate plain-text fallback string for NGO email.
 */
const buildNgoPlainText = ({ ngoName, donationId, foodName, quantity, providerName, completedAt, timeline }) => {
  const steps = (timeline || []).map((t, i) => `${i + 1}. ${t.label} — ${t.timestamp}`).join('\n');
  return `Dear ${ngoName},

Great news! Your claimed food donation has been successfully completed.
We are happy to confirm that the donated food has been received and the delivery has been marked as completed.

RECEIVED DONATION DETAILS:
- Donation ID: ${donationId}
- Food Name: ${foodName}
- Quantity Received: ${quantity}
- Donated By: ${providerName}
- Received Date & Time: ${completedAt}

TIMELINE:
${steps}

Thank you for being a valuable part of FoodRescue.
Your efforts help ensure that rescued food reaches the people and communities who need it most.

Warm regards,
Team FoodRescue
Reduce Waste • Feed People • Build Communities`;
};

/**
 * Fetch verified donation details from database for email generation.
 */
const getCompletedDonationEmailContext = async (donationId) => {
  const { rows } = await db.query(
    `SELECT 
       fd.id AS donation_id,
       fd.title AS food_name,
       fd.category AS food_category,
       fd.quantity,
       fd.unit,
       fd.pickup_address,
       fd.created_at,
       fd.status AS donation_status,
       fp.business_name AS provider_name,
       u_prov.email AS provider_email,
       u_prov.full_name AS provider_contact_name,
       ngo.organization_name AS ngo_name,
       u_ngo.email AS ngo_email,
       u_ngo.full_name AS ngo_contact_name,
       u_ngo.phone AS ngo_contact_phone,
       del.delivery_time AS completed_at
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u_prov ON u_prov.id = fp.user_id
     LEFT JOIN donation_claims c ON c.donation_id = fd.id AND c.status = 'accepted'
     LEFT JOIN ngos ngo ON ngo.id = c.ngo_id
     LEFT JOIN users u_ngo ON u_ngo.id = ngo.user_id
     LEFT JOIN deliveries del ON del.donation_id = fd.id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (rows.length === 0) return null;
  return rows[0];
};

/**
 * Send confirmation email to Food Provider. Idempotent & non-blocking.
 */
const sendProviderDonationCompletedEmail = async (donationId) => {
  const ctx = await getCompletedDonationEmailContext(donationId);
  if (!ctx || !ctx.provider_email) {
    console.warn(`[EMAIL] Cannot send provider completion email: no provider email for donation ${donationId}`);
    return { success: false, reason: 'provider_not_found' };
  }

  const recipientType = 'provider';
  const recipientEmail = ctx.provider_email.toLowerCase().trim();
  const recipientName = ctx.provider_name || ctx.provider_contact_name || 'Food Provider';
  const subject = 'Your Food Donation Has Been Successfully Completed – FoodRescue';

  // 1. Idempotency Check & Lock using donation_completion_emails
  const insertRes = await db.query(
    `INSERT INTO donation_completion_emails 
       (donation_id, recipient_type, recipient_email, recipient_name, subject, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     ON CONFLICT (donation_id, recipient_type) 
     DO UPDATE SET 
       last_attempt_at = NOW(),
       retry_count = donation_completion_emails.retry_count + 1
     RETURNING id, status`,
    [donationId, recipientType, recipientEmail, recipientName, subject]
  );

  const emailRecord = insertRes.rows[0];
  if (emailRecord.status === 'SENT') {
    // Already successfully sent, prevent duplicate
    return { success: true, duplicate: true, message: 'Email already sent to provider.' };
  }

  // 2. Build Timeline & Templates
  const timeline = await buildDonationTimeline(donationId);
  const completedDateStr = formatDateTime(ctx.completed_at || new Date());
  const quantityStr = `${ctx.quantity} ${ctx.unit || 'portions'}`;

  const html = buildProviderEmailHtml({
    providerName: recipientName,
    donationId: ctx.donation_id,
    foodName: ctx.food_name,
    foodCategory: ctx.food_category,
    quantity: quantityStr,
    pickupLocation: ctx.pickup_address,
    createdAt: formatDateTime(ctx.created_at),
    ngoName: ctx.ngo_name || 'Partner Community Shelter',
    ngoContact: ctx.ngo_contact_name || ctx.ngo_contact_phone || 'Shelter Coordinator',
    completedAt: completedDateStr,
    timeline,
  });

  const text = buildProviderPlainText({
    providerName: recipientName,
    donationId: ctx.donation_id,
    foodName: ctx.food_name,
    quantity: quantityStr,
    ngoName: ctx.ngo_name || 'Partner Community Shelter',
    completedAt: completedDateStr,
    timeline,
  });

  // 3. Dispatch Email
  const fromAddress = config.smtp.from || `FoodRescue <${config.smtp.user || 'no-reply@foodrescue.org'}>`;

  try {
    if (!config.smtp.user) {
      console.log(`[EMAIL] SMTP not configured. Would send to ${recipientEmail}: ${subject}`);
      await db.query(
        `UPDATE donation_completion_emails
         SET status = 'SENT', sent_at = NOW(), last_attempt_at = NOW(), failure_reason = NULL, updated_at = NOW()
         WHERE id = $1`,
        [emailRecord.id]
      );
      return { success: true, mocked: true };
    }

    await getTransporter().sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text,
      html,
    });

    await db.query(
      `UPDATE donation_completion_emails
       SET status = 'SENT', sent_at = NOW(), last_attempt_at = NOW(), failure_reason = NULL, updated_at = NOW()
       WHERE id = $1`,
      [emailRecord.id]
    );

    return { success: true };
  } catch (err) {
    console.error(`[EMAIL] Failed to send provider email for donation ${donationId}:`, err.message);
    await db.query(
      `UPDATE donation_completion_emails
       SET status = 'FAILED', last_attempt_at = NOW(), failure_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [err.message, emailRecord.id]
    );
    return { success: false, error: err.message };
  }
};

/**
 * Send confirmation email to NGO. Idempotent & non-blocking.
 */
const sendNgoDonationReceivedEmail = async (donationId) => {
  const ctx = await getCompletedDonationEmailContext(donationId);
  if (!ctx || !ctx.ngo_email) {
    console.warn(`[EMAIL] Cannot send NGO receipt email: no NGO email for donation ${donationId}`);
    return { success: false, reason: 'ngo_not_found' };
  }

  const recipientType = 'ngo';
  const recipientEmail = ctx.ngo_email.toLowerCase().trim();
  const recipientName = ctx.ngo_name || ctx.ngo_contact_name || 'Shelter Partner';
  const subject = 'Food Donation Successfully Received – FoodRescue';

  // 1. Idempotency Check & Lock
  const insertRes = await db.query(
    `INSERT INTO donation_completion_emails 
       (donation_id, recipient_type, recipient_email, recipient_name, subject, status)
     VALUES ($1, $2, $3, $4, $5, 'PENDING')
     ON CONFLICT (donation_id, recipient_type) 
     DO UPDATE SET 
       last_attempt_at = NOW(),
       retry_count = donation_completion_emails.retry_count + 1
     RETURNING id, status`,
    [donationId, recipientType, recipientEmail, recipientName, subject]
  );

  const emailRecord = insertRes.rows[0];
  if (emailRecord.status === 'SENT') {
    return { success: true, duplicate: true, message: 'Email already sent to NGO.' };
  }

  // 2. Build Timeline & Templates
  const timeline = await buildDonationTimeline(donationId);
  const completedDateStr = formatDateTime(ctx.completed_at || new Date());
  const quantityStr = `${ctx.quantity} ${ctx.unit || 'portions'}`;

  const html = buildNgoEmailHtml({
    ngoName: recipientName,
    donationId: ctx.donation_id,
    foodName: ctx.food_name,
    foodCategory: ctx.food_category,
    quantity: quantityStr,
    providerName: ctx.provider_name || 'Community Donor',
    pickupLocation: ctx.pickup_address,
    completedAt: completedDateStr,
    timeline,
  });

  const text = buildNgoPlainText({
    ngoName: recipientName,
    donationId: ctx.donation_id,
    foodName: ctx.food_name,
    quantity: quantityStr,
    providerName: ctx.provider_name || 'Community Donor',
    completedAt: completedDateStr,
    timeline,
  });

  // 3. Dispatch Email
  const fromAddress = config.smtp.from || `FoodRescue <${config.smtp.user || 'no-reply@foodrescue.org'}>`;

  try {
    if (!config.smtp.user) {
      console.log(`[EMAIL] SMTP not configured. Would send to ${recipientEmail}: ${subject}`);
      await db.query(
        `UPDATE donation_completion_emails
         SET status = 'SENT', sent_at = NOW(), last_attempt_at = NOW(), failure_reason = NULL, updated_at = NOW()
         WHERE id = $1`,
        [emailRecord.id]
      );
      return { success: true, mocked: true };
    }

    await getTransporter().sendMail({
      from: fromAddress,
      to: recipientEmail,
      subject,
      text,
      html,
    });

    await db.query(
      `UPDATE donation_completion_emails
       SET status = 'SENT', sent_at = NOW(), last_attempt_at = NOW(), failure_reason = NULL, updated_at = NOW()
       WHERE id = $1`,
      [emailRecord.id]
    );

    return { success: true };
  } catch (err) {
    console.error(`[EMAIL] Failed to send NGO email for donation ${donationId}:`, err.message);
    await db.query(
      `UPDATE donation_completion_emails
       SET status = 'FAILED', last_attempt_at = NOW(), failure_reason = $1, updated_at = NOW()
       WHERE id = $2`,
      [err.message, emailRecord.id]
    );
    return { success: false, error: err.message };
  }
};

/**
 * Trigger both completion emails asynchronously after transaction commit.
 * Guaranteed not to throw or block the calling workflow.
 */
const triggerDonationCompletionEmails = async (donationId) => {
  if (!donationId) return;

  // Use setImmediate / background dispatch so callers return immediately
  setImmediate(async () => {
    try {
      // Record completion timeline event if not already recorded
      await recordTimelineEvent(donationId, 'DONATION_COMPLETED');

      // Dispatch provider & NGO emails in parallel
      const results = await Promise.allSettled([
        sendProviderDonationCompletedEmail(donationId),
        sendNgoDonationReceivedEmail(donationId),
      ]);

      const pRes = results[0]?.status === 'fulfilled' ? results[0].value : { error: results[0]?.reason };
      const nRes = results[1]?.status === 'fulfilled' ? results[1].value : { error: results[1]?.reason };
      console.log(`[EMAIL] Completed automated donation dispatch for ${donationId}:`, { provider: pRes, ngo: nRes });
    } catch (err) {
      console.error(`[EMAIL] Unexpected error during completion email dispatch for ${donationId}:`, err);
    }
  });
};

/**
 * Get email notification delivery status for a donation (Admin visibility).
 */
const getDonationEmailStatus = async (donationId) => {
  const { rows } = await db.query(
    `SELECT id, recipient_type, recipient_email, recipient_name, status, subject, sent_at, last_attempt_at, retry_count, failure_reason, created_at
     FROM donation_completion_emails
     WHERE donation_id = $1
     ORDER BY created_at ASC`,
    [donationId]
  );
  return rows;
};

/**
 * Retry failed emails for a donation without duplicating successful ones.
 */
const retryFailedCompletionEmails = async (donationId) => {
  const { rows } = await db.query(
    `SELECT recipient_type, status FROM donation_completion_emails
     WHERE donation_id = $1 AND status = 'FAILED'`,
    [donationId]
  );

  const results = [];
  for (const row of rows) {
    if (row.recipient_type === 'provider') {
      const res = await sendProviderDonationCompletedEmail(donationId);
      results.push({ type: 'provider', res });
    } else if (row.recipient_type === 'ngo') {
      const res = await sendNgoDonationReceivedEmail(donationId);
      results.push({ type: 'ngo', res });
    }
  }
  return results;
};

module.exports = {
  recordTimelineEvent,
  buildDonationTimeline,
  buildProviderEmailHtml,
  buildNgoEmailHtml,
  sendProviderDonationCompletedEmail,
  sendNgoDonationReceivedEmail,
  triggerDonationCompletionEmails,
  getDonationEmailStatus,
  retryFailedCompletionEmails,
};

