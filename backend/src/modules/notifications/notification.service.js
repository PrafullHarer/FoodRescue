const db = require('../../config/db');
const nodemailer = require('nodemailer');
const config = require('../../config');

// Email transporter (lazy init)
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
 * Helper to identify if a notification is a donation/rescue workflow notification.
 * Operational alerts (incidents, complaints, verifications) are NOT donation notifications.
 */
const isDonationRelated = ({ title, body, data }) => {
  let parsedData = data;
  if (typeof parsedData === 'string') {
    try {
      parsedData = JSON.parse(parsedData);
    } catch {
      parsedData = null;
    }
  }

  // Explicit administrative operational alerts are NOT donation notifications
  if (
    parsedData?.incident_id ||
    parsedData?.incidentId ||
    parsedData?.complaint_id ||
    parsedData?.complaintId ||
    parsedData?.verification_id ||
    parsedData?.type?.startsWith?.('complaint') ||
    parsedData?.type?.startsWith?.('incident') ||
    parsedData?.type?.startsWith?.('verification')
  ) {
    return false;
  }

  const titleStr = (title || '').toLowerCase();
  const bodyStr = (body || '').toLowerCase();

  // If title indicates an operational administrative item, keep it allowed for admins
  if (
    titleStr.includes('incident') ||
    titleStr.includes('escalation') ||
    titleStr.includes('complaint') ||
    titleStr.includes('verification')
  ) {
    return false;
  }

  // Check data payload for donation/delivery/claim workflow indicators
  if (parsedData && typeof parsedData === 'object') {
    if (
      parsedData.donation_id ||
      parsedData.donationId ||
      parsedData.delivery_id ||
      parsedData.deliveryId ||
      parsedData.claim_id ||
      parsedData.claimId
    ) {
      return true;
    }

    if ([
      'new_donation',
      'delivery_available',
      'donation_claimed',
      'donation_status',
      'donation_matched',
      'pickup',
      'delivery'
    ].includes(parsedData.type)) {
      return true;
    }
  }

  const combined = `${titleStr} ${bodyStr}`;
  const donationKeywords = [
    'donation',
    'surplus food',
    'pickup mission',
    'food collected',
    'food in transit',
    'food delivered',
    'food delivery confirmed',
    'rescue completed',
    'volunteer assigned to pickup',
    'delivery confirmed'
  ];

  return donationKeywords.some(kw => combined.includes(kw));
};

/**
 * Create an in-app notification.
 */
const createNotification = async ({ userId, title, body, type = 'in_app', data = null }) => {
  // Enforce rule: Admins must NEVER receive donation-related notifications
  try {
    const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRows.length > 0 && userRows[0].role === 'admin') {
      if (isDonationRelated({ title, body, data })) {
        console.log(`[NOTIFY] Suppressed donation-related notification for admin ${userId}: "${title}"`);
        return null;
      }
    }
  } catch (err) {
    console.warn('[NOTIFY] Admin check warning:', err.message);
  }

  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, data ? (typeof data === 'string' ? data : JSON.stringify(data)) : null]
  );

  return rows[0];
};

/**
 * Send push notification via Expo's push service.
 * (Wrapper — actual FCM/APNs call would go through Expo's API)
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
  // If user is admin and notification is donation-related, skip
  try {
    const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
    if (userRows.length > 0 && userRows[0].role === 'admin' && isDonationRelated({ title, body, data })) {
      return null;
    }
  } catch {
    // continue
  }

  // Get device tokens for user
  const { rows: tokens } = await db.query(
    'SELECT token, platform FROM device_tokens WHERE user_id = $1 AND is_active = TRUE',
    [userId]
  );

  if (tokens.length === 0) {
    console.log(`[PUSH] No active device tokens for user ${userId}`);
    return null;
  }

  // In production, this would call Expo's push API:
  // https://exp.host/--/api/v2/push/send
  console.log(`[PUSH] Would send to ${tokens.length} device(s):`, { title, body, data });

  // Also create in-app notification
  await createNotification({ userId, title, body, type: 'push', data });

  return { sent: tokens.length };
};

/**
 * Send email notification.
 */
const sendEmail = async (to, subject, html) => {
  try {
    if (!config.smtp.user) {
      console.log(`[EMAIL] SMTP not configured. Would send to ${to}: ${subject}`);
      return null;
    }

    const info = await getTransporter().sendMail({
      from: `"FoodRescue" <${config.smtp.user}>`,
      to,
      subject,
      html,
    });

    return info;
  } catch (error) {
    console.error('[EMAIL] Send failed:', error.message);
    return null;
  }
};

/**
 * Fan-out notifications on donation status change.
 */
const notifyStatusChange = async (donationId, newStatus) => {
  const donation = await db.query(
    `SELECT fd.*, fp.user_id AS provider_user_id, u.full_name AS provider_name, u.role AS provider_role
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u ON u.id = fp.user_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (donation.rows.length === 0) return;

  const d = donation.rows[0];

  // Admins must not receive donation status notifications
  if (d.provider_role === 'admin') return;

  const messages = {
    matched:            { title: 'Donation Matched!', body: `Your donation "${d.title}" has been matched with NGOs.` },
    claimed:            { title: 'Donation Claimed', body: `An NGO has claimed your donation "${d.title}".` },
    volunteer_assigned: { title: 'Volunteer Assigned', body: `A volunteer has been assigned to pick up "${d.title}".` },
    collected:          { title: 'Food Collected', body: `"${d.title}" has been collected by the volunteer.` },
    delivered:          { title: 'Food Delivered', body: `"${d.title}" has been delivered to the NGO.` },
    completed:          { title: 'Donation Complete', body: `"${d.title}" delivery is complete. Thank you!` },
    expired:            { title: 'Donation Expired', body: `"${d.title}" has expired.` },
    cancelled:          { title: 'Donation Cancelled', body: `"${d.title}" has been cancelled.` },
  };

  const msg = messages[newStatus];
  if (!msg) return;

  // Notify provider via in-app notification
  await createNotification({
    userId: d.provider_user_id,
    title: msg.title,
    body: msg.body,
    type: 'in_app',
    data: {
      donation_id: donationId,
      status: newStatus,
    },
  });

  // Also try push notification if configured
  await sendPushNotification(d.provider_user_id, msg.title, msg.body, {
    donation_id: donationId,
    status: newStatus,
  }).catch(() => {});
};

/**
 * Get user's notifications.
 */
const getUserNotifications = async (userId, { page = 1, limit = 20, unreadOnly = false }) => {
  const offset = (page - 1) * limit;
  const params = [userId];
  let whereClause = 'WHERE user_id = $1';

  // Check if target user is admin. If so, completely exclude any donation-related notifications.
  const { rows: userRows } = await db.query('SELECT role FROM users WHERE id = $1', [userId]);
  const isAdmin = userRows[0]?.role === 'admin';

  if (isAdmin) {
    whereClause += ` AND NOT (
      (
        data IS NOT NULL AND (
          data->>'incident_id' IS NULL AND
          data->>'complaint_id' IS NULL AND
          data->>'verification_id' IS NULL AND
          (data->>'type' IS NULL OR NOT (data->>'type' LIKE 'complaint%' OR data->>'type' LIKE 'incident%'))
        ) AND (
          data->>'donation_id' IS NOT NULL OR
          data->>'donationId' IS NOT NULL OR
          data->>'delivery_id' IS NOT NULL OR
          data->>'deliveryId' IS NOT NULL OR
          data->>'claim_id' IS NOT NULL OR
          data->>'claimId' IS NOT NULL OR
          data->>'type' IN ('new_donation', 'delivery_available', 'donation_claimed', 'donation_status', 'donation_matched', 'pickup', 'delivery')
        )
      )
      OR (
        title NOT ILIKE '%incident%' AND
        title NOT ILIKE '%escalation%' AND
        title NOT ILIKE '%complaint%' AND
        title NOT ILIKE '%verification%' AND
        (
          title ILIKE '%donation%' OR
          title ILIKE '%pickup mission%' OR
          title ILIKE '%food in transit%' OR
          title ILIKE '%rescue completed%' OR
          title ILIKE '%delivery confirmed%' OR
          title ILIKE '%food delivery confirmed%' OR
          body ILIKE '%donation%'
        )
      )
    )`;
  }

  if (unreadOnly) {
    whereClause += ' AND is_read = FALSE';
  }

  const countPromise = db.query(
    `SELECT COUNT(*) FROM notifications ${whereClause}`,
    params
  );

  const dataParams = [...params, limit, offset];
  const dataPromise = db.query(
    `SELECT * FROM notifications ${whereClause}
     ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
    dataParams
  );

  const [countResult, dataResult] = await Promise.all([countPromise, dataPromise]);
  const rows = dataResult.rows;
  const total = parseInt(countResult.rows[0]?.count || 0, 10);

  return {
    notifications: rows,
    pagination: {
      page,
      limit,
      total,
      totalPages: Math.ceil(total / limit) || 1,
    },
  };
};

/**
 * Mark notification as read.
 */
const markAsRead = async (notificationId, userId) => {
  const { rows } = await db.query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE id = $1 AND user_id = $2 RETURNING *`,
    [notificationId, userId]
  );

  return rows[0];
};

/**
 * Mark all notifications as read.
 */
const markAllAsRead = async (userId) => {
  await db.query(
    `UPDATE notifications SET is_read = TRUE, read_at = NOW()
     WHERE user_id = $1 AND is_read = FALSE`,
    [userId]
  );
};

/**
 * Register device token for push notifications.
 */
const registerDeviceToken = async (userId, token, platform) => {
  const { rows } = await db.query(
    `INSERT INTO device_tokens (user_id, token, platform)
     VALUES ($1, $2, $3)
     ON CONFLICT (user_id, token) DO UPDATE SET is_active = TRUE, updated_at = NOW()
     RETURNING *`,
    [userId, token, platform]
  );

  return rows[0];
};

/**
 * Notify all active NGOs about a new donation.
 * Creates an in-app notification for every NGO user so they can claim it.
 */
const notifyNgosOfNewDonation = async (donation) => {
  try {
    // Find all active NGO users (explicitly exclude admins)
    const { rows: ngoUsers } = await db.query(
      `SELECT id AS user_id
       FROM users
       WHERE role = 'ngo' AND role != 'admin' AND (status IS NULL OR status = 'active')`
    );

    if (ngoUsers.length === 0) {
      console.log('[NOTIFY] No active NGO users found to notify.');
      return;
    }

    const title = '🍽️ New Donation Available!';
    const body = `"${donation.title}" — ${donation.quantity} ${donation.unit || 'servings'} of ${(donation.category || 'food').replace(/_/g, ' ')} just posted. Claim it before it's gone!`;
    const data = JSON.stringify({
      type: 'new_donation',
      donation_id: donation.id,
      category: donation.category,
    });

    // Bulk insert notifications for all NGOs
    const valuePlaceholders = ngoUsers.map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');

    const values = ngoUsers.flatMap(ngo => [
      ngo.user_id, 'in_app', title, body, data,
    ]);

    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ${valuePlaceholders}`,
      values
    );

    console.log(`[NOTIFY] Sent new-donation notification to ${ngoUsers.length} NGO(s) for "${donation.title}"`);
  } catch (error) {
    console.error('[NOTIFY] Failed to notify NGOs:', error.message);
  }
};

/**
 * Automatically mark donation notifications as read for all NGOs once the donation is claimed.
 * If other NGOs received the alert, it automatically moves to their read section.
 */
const markDonationNotificationsReadOnClaim = async (donationId) => {
  try {
    await db.query(
      `UPDATE notifications
       SET is_read = TRUE,
           read_at = NOW()
       WHERE (data->>'donation_id' = $1 OR data::text LIKE '%"' || $1 || '"%')
         AND is_read = FALSE`,
      [donationId]
    );
    console.log(`[NOTIFY] Auto-marked new_donation notifications as read for claimed donation ${donationId}`);
  } catch (error) {
    console.error('[NOTIFY] Failed to auto-mark donation notifications read:', error.message);
  }
};

/**
 * Notify all active volunteers when a claimed donation needs a pickup mission.
 */
const notifyVolunteersOfPickupMission = async (donation, deliveryId) => {
  try {
    const { rows: volunteerUsers } = await db.query(
      `SELECT u.id AS user_id
       FROM volunteers v
       JOIN users u ON u.id = v.user_id
       WHERE u.role != 'admin' AND (u.status IS NULL OR u.status = 'active')`
    );

    if (volunteerUsers.length === 0) return;

    const title = '🚚 Volunteer Pickup Mission Available!';
    const body = `"${donation.title}" has been claimed by a shelter. Claim the pickup route to deliver ${donation.quantity} ${donation.unit || 'servings'} of food!`;
    const data = JSON.stringify({
      type: 'delivery_available',
      donation_id: donation.id,
      delivery_id: deliveryId,
    });

    const valuePlaceholders = volunteerUsers.map((_, i) => {
      const base = i * 5;
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    }).join(', ');

    const values = volunteerUsers.flatMap(v => [
      v.user_id, 'in_app', title, body, data,
    ]);

    await db.query(
      `INSERT INTO notifications (user_id, type, title, body, data)
       VALUES ${valuePlaceholders}`,
      values
    );

    console.log(`[NOTIFY] Sent pickup mission notification to ${volunteerUsers.length} volunteer(s) for "${donation.title}"`);
  } catch (error) {
    console.error('[NOTIFY] Failed to notify volunteers:', error.message);
  }
};

module.exports = {
  createNotification,
  sendPushNotification,
  sendEmail,
  notifyStatusChange,
  notifyNgosOfNewDonation,
  notifyVolunteersOfPickupMission,
  markDonationNotificationsReadOnClaim,
  getUserNotifications,
  markAsRead,
  markAllAsRead,
  registerDeviceToken,
};

