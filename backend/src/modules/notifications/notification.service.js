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
 * Create an in-app notification.
 */
const createNotification = async ({ userId, title, body, type = 'in_app', data = null }) => {
  const { rows } = await db.query(
    `INSERT INTO notifications (user_id, type, title, body, data)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING *`,
    [userId, type, title, body, data ? JSON.stringify(data) : null]
  );

  return rows[0];
};

/**
 * Send push notification via Expo's push service.
 * (Wrapper — actual FCM/APNs call would go through Expo's API)
 */
const sendPushNotification = async (userId, title, body, data = {}) => {
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
    `SELECT fd.*, fp.user_id AS provider_user_id, u.full_name AS provider_name
     FROM food_donations fd
     JOIN food_providers fp ON fp.id = fd.provider_id
     JOIN users u ON u.id = fp.user_id
     WHERE fd.id = $1`,
    [donationId]
  );

  if (donation.rows.length === 0) return;

  const d = donation.rows[0];

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
    // Find all active NGO users
    const { rows: ngoUsers } = await db.query(
      `SELECT id AS user_id
       FROM users
       WHERE role = 'ngo' AND (status IS NULL OR status = 'active')`
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
       WHERE (u.status IS NULL OR u.status = 'active')`
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

