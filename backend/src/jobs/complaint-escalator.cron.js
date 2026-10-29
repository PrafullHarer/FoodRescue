const cron = require('node-cron');
const db = require('../config/db');
const notificationService = require('../modules/notifications/notification.service');

/**
 * Scan for complaints approaching/exceeding response or resolution SLAs and escalate.
 */
async function runComplaintEscalations() {
  try {
    // 1. Escalate complaints exceeding 24h initial response deadline
    const { rows: overdueResponses } = await db.query(`
      SELECT c.id, c.complaint_reference, COALESCE(c.title, c.subject) AS title, c.priority, c.assigned_admin_user_id
      FROM complaints c
      WHERE c.response_due_at < NOW()
        AND c.status IN ('submitted', 'under_review')
        AND c.escalation_level = 0
    `);

    for (const c of overdueResponses) {
      await db.query(
        `UPDATE complaints 
         SET escalation_level = 1, escalated_at = NOW(), status = 'escalated', updated_at = NOW()
         WHERE id = $1`,
        [c.id]
      );

      await db.query(
        `INSERT INTO complaint_history (
          complaint_id, action_type, previous_value, new_value, reason
        ) VALUES ($1, 'escalated', 'Level 0', 'Level 1', 'Automatic SLA breach: Exceeded 24h response deadline')`,
        [c.id]
      );

      // Alert admins
      const { rows: admins } = await db.query(
        `SELECT id FROM users WHERE role = 'admin' AND status = 'active'`
      );
      for (const admin of admins) {
        await notificationService.createNotification({
          userId: admin.id,
          title: `🚨 Complaint ${c.complaint_reference} Escalated (SLA Response Overdue)`,
          body: `Complaint "${c.title}" has breached initial response SLA. Immediate review required.`,
          type: 'in_app',
          data: { type: 'complaint_escalation', complaint_id: c.id },
        });
      }
    }

    // 2. Escalate complaints exceeding resolution SLA
    const { rows: overdueResolutions } = await db.query(`
      SELECT c.id, c.complaint_reference, COALESCE(c.title, c.subject) AS title, c.priority, c.assigned_admin_user_id
      FROM complaints c
      WHERE c.resolution_due_at < NOW()
        AND c.status NOT IN ('resolved', 'rejected', 'closed')
        AND c.escalation_level < 2
    `);

    for (const c of overdueResolutions) {
      await db.query(
        `UPDATE complaints 
         SET escalation_level = 2, escalated_at = NOW(), status = 'escalated', updated_at = NOW()
         WHERE id = $1`,
        [c.id]
      );

      await db.query(
        `INSERT INTO complaint_history (
          complaint_id, action_type, previous_value, new_value, reason
        ) VALUES ($1, 'escalated', 'Level 1', 'Level 2', 'Automatic SLA breach: Exceeded resolution deadline')`,
        [c.id]
      );

      const targetAdmin = c.assigned_admin_user_id;
      if (targetAdmin) {
        await notificationService.createNotification({
          userId: targetAdmin,
          title: `🔥 URGENT: Complaint ${c.complaint_reference} Past Resolution Deadline`,
          body: `Resolution for "${c.title}" is overdue. Please take action immediately.`,
          type: 'in_app',
          data: { type: 'complaint_escalation', complaint_id: c.id },
        });
      }
    }
  } catch (err) {
    console.error('❌ [CRON] Error during complaint escalation check:', err.message);
  }
}

/**
 * Start the complaint escalation cron scheduler (runs every 10 minutes)
 */
function startComplaintEscalator() {
  console.log('⏰ [CRON] Starting complaint escalation scheduler (every 10 minutes)...');
  // Runs every 10 minutes
  cron.schedule('*/10 * * * *', async () => {
    await runComplaintEscalations();
  });
}

module.exports = {
  startComplaintEscalator,
  runComplaintEscalations,
};
