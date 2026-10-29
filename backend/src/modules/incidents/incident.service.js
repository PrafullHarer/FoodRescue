const crypto = require('crypto');
const db = require('../../config/db');
const { createNotification } = require('../notifications/notification.service');

// Valid state machine transitions
const VALID_TRANSITIONS = {
  open: ['acknowledged', 'investigating', 'closed'],
  acknowledged: ['investigating', 'awaiting_response', 'resolved', 'closed'],
  investigating: ['awaiting_response', 'resolved', 'closed'],
  awaiting_response: ['investigating', 'resolved', 'closed'],
  resolved: ['closed', 'reopened'],
  closed: ['reopened'],
  reopened: ['investigating', 'resolved', 'closed'],
};

/**
 * Generate a unique human-readable incident reference code.
 * Format: INC-YYYY-XXXX (e.g. INC-2026-A8F2)
 */
function generateIncidentReference() {
  const year = new Date().getFullYear();
  const hex = crypto.randomBytes(3).toString('hex').toUpperCase();
  return `INC-${year}-${hex}`;
}

/**
 * Record an append-only audit event for an incident.
 */
async function recordAuditLog(clientOrDb, {
  incidentId,
  actorId = null,
  actorType = 'user',
  action,
  previousValue = null,
  newValue = null,
  notes = null
}) {
  await clientOrDb.query(
    `INSERT INTO incident_audit_logs (
      incident_id, actor_id, actor_type, action, previous_value, new_value, notes, created_at
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, NOW())`,
    [
      incidentId,
      actorId,
      actorType,
      action,
      previousValue ? JSON.stringify(previousValue) : null,
      newValue ? JSON.stringify(newValue) : null,
      notes
    ]
  );
}

/**
 * Create a new Incident (manual or automatic).
 * Implements deduplication to prevent repeated incidents for the same underlying issue.
 */
async function createIncident({
  incident_type,
  title,
  description,
  severity = 'medium',
  source = 'manual',
  reporter_user_id = null,
  donation_id = null,
  delivery_id = null,
  related_qr_code = null,
  related_organization_id = null,
  evidence_urls = [],
  actorId = null,
  actorType = 'user'
}) {
  // Deduplication check: if an open/acknowledged incident already exists for this exact type and delivery/donation
  if (delivery_id && incident_type) {
    const existing = await db.query(
      `SELECT id, incident_reference FROM incidents
       WHERE delivery_id = $1 AND incident_type = $2 AND status IN ('open', 'acknowledged', 'investigating')
       LIMIT 1`,
      [delivery_id, incident_type]
    );
    if (existing.rows.length > 0) {
      console.log(`[INCIDENT] Deduplication prevented duplicate incident for delivery ${delivery_id} (${incident_type}).`);
      return existing.rows[0];
    }
  }

  // Generate unique reference
  let reference = generateIncidentReference();
  let collisionCheck = await db.query('SELECT 1 FROM incidents WHERE incident_reference = $1', [reference]);
  while (collisionCheck.rows.length > 0) {
    reference = generateIncidentReference();
    collisionCheck = await db.query('SELECT 1 FROM incidents WHERE incident_reference = $1', [reference]);
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const detectedAt = source === 'automatic' ? new Date() : null;

    const { rows } = await client.query(
      `INSERT INTO incidents (
        incident_reference, incident_type, title, description,
        severity, status, source, reporter_user_id, donation_id, delivery_id,
        related_qr_code, related_organization_id, evidence_urls, detected_at, reported_at
      ) VALUES ($1, $2, $3, $4, $5, 'open', $6, $7, $8, $9, $10, $11, $12, $13, NOW())
      RETURNING *`,
      [
        reference,
        incident_type,
        title,
        description,
        severity,
        source,
        reporter_user_id,
        donation_id,
        delivery_id,
        related_qr_code,
        related_organization_id,
        evidence_urls,
        detectedAt
      ]
    );

    const incident = rows[0];

    // Audit log entry
    await recordAuditLog(client, {
      incidentId: incident.id,
      actorId: actorId || reporter_user_id,
      actorType: source === 'automatic' ? 'system' : actorType,
      action: 'created',
      newValue: {
        incident_reference: incident.incident_reference,
        incident_type: incident.incident_type,
        severity: incident.severity,
        status: incident.status,
        source: incident.source
      },
      notes: `Incident ${reference} reported via ${source}`
    });

    await client.query('COMMIT');

    // Notify admins if high or critical
    if (severity === 'critical' || severity === 'high') {
      try {
        const adminUsers = await db.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
        for (const admin of adminUsers.rows) {
          createNotification({
            userId: admin.id,
            title: `🚨 ${severity.toUpperCase()} Incident: ${reference}`,
            body: `${title} (${incident_type.replace(/_/g, ' ')})`,
            type: 'in_app',
            data: { incident_id: incident.id, reference, severity }
          }).catch(() => {});
        }
      } catch (notifErr) {
        console.warn('[INCIDENT] Admin notification warning:', notifErr.message);
      }
    }

    return incident;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Get incident metrics summary for dashboard cards.
 */
async function getIncidentsSummary() {
  const query = `
    SELECT
      COUNT(*) AS total_incidents,
      COUNT(*) FILTER (WHERE status IN ('open', 'acknowledged', 'investigating', 'awaiting_response')) AS open_incidents,
      COUNT(*) FILTER (WHERE severity = 'critical' AND status NOT IN ('resolved', 'closed')) AS critical_incidents,
      COUNT(*) FILTER (WHERE status NOT IN ('resolved', 'closed') AND created_at < NOW() - INTERVAL '24 hours') AS overdue_incidents,
      COUNT(*) FILTER (WHERE assigned_admin_user_id IS NULL AND status NOT IN ('resolved', 'closed')) AS unassigned_incidents,
      COUNT(*) FILTER (WHERE status = 'resolved' AND resolved_at >= DATE_TRUNC('day', NOW())) AS resolved_today,
      -- Average resolution time in hours
      ROUND(AVG(
        CASE WHEN resolved_at IS NOT NULL
        THEN EXTRACT(EPOCH FROM (resolved_at - reported_at)) / 3600
        ELSE NULL END
      )::numeric, 1) AS avg_resolution_hours
    FROM incidents
  `;

  const { rows } = await db.query(query);
  const s = rows[0];

  return {
    open_incidents: parseInt(s.open_incidents, 10) || 0,
    critical_incidents: parseInt(s.critical_incidents, 10) || 0,
    overdue_incidents: parseInt(s.overdue_incidents, 10) || 0,
    unassigned_incidents: parseInt(s.unassigned_incidents, 10) || 0,
    resolved_today: parseInt(s.resolved_today, 10) || 0,
    avg_resolution_hours: parseFloat(s.avg_resolution_hours) || 0,
    total_incidents: parseInt(s.total_incidents, 10) || 0
  };
}

/**
 * List incidents with search, filters, sorting, and pagination.
 */
async function getIncidents({
  page = 1,
  limit = 20,
  status,
  severity,
  incident_type,
  source,
  assigned_admin_user_id,
  search,
  sortBy = 'created_at',
  sortOrder = 'DESC'
} = {}) {
  const offset = (Math.max(parseInt(page, 10) || 1, 1) - 1) * limit;
  const conditions = [];
  const params = [];
  let index = 1;

  if (status && status !== 'all') {
    params.push(status);
    conditions.push(`i.status = $${index++}`);
  }

  if (severity && severity !== 'all') {
    params.push(severity);
    conditions.push(`i.severity = $${index++}`);
  }

  if (incident_type && incident_type !== 'all') {
    params.push(incident_type);
    conditions.push(`i.incident_type = $${index++}`);
  }

  if (source && source !== 'all') {
    params.push(source);
    conditions.push(`i.source = $${index++}`);
  }

  if (assigned_admin_user_id) {
    if (assigned_admin_user_id === 'unassigned') {
      conditions.push(`i.assigned_admin_user_id IS NULL`);
    } else {
      params.push(assigned_admin_user_id);
      conditions.push(`i.assigned_admin_user_id = $${index++}`);
    }
  }

  if (search && search.trim()) {
    params.push(`%${search.trim().toLowerCase()}%`);
    conditions.push(`(
      LOWER(i.incident_reference) LIKE $${index}
      OR LOWER(i.title) LIKE $${index}
      OR LOWER(i.description) LIKE $${index}
      OR LOWER(COALESCE(fp.business_name, '')) LIKE $${index}
      OR LOWER(COALESCE(ngo.organization_name, '')) LIKE $${index}
    )`);
    index++;
  }

  const whereSql = conditions.length > 0 ? 'WHERE ' + conditions.join(' AND ') : '';

  // Safe sorting columns
  const allowedSortCols = {
    created_at: 'i.created_at',
    severity: 'i.severity',
    status: 'i.status',
    incident_reference: 'i.incident_reference',
    escalation_level: 'i.escalation_level'
  };
  const sortCol = allowedSortCols[sortBy] || 'i.created_at';
  const orderDir = sortOrder?.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const countQuery = `
    SELECT COUNT(i.id) AS total
    FROM incidents i
    LEFT JOIN food_donations fd ON fd.id = i.donation_id
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.id = i.delivery_id
    LEFT JOIN ngos ngo ON ngo.id = d.ngo_id
    ${whereSql}
  `;

  const listQuery = `
    SELECT
      i.*,
      u_rep.full_name AS reporter_name,
      u_rep.email AS reporter_email,
      u_rep.role AS reporter_role,
      u_adm.full_name AS assigned_admin_name,
      u_adm.email AS assigned_admin_email,
      fd.title AS donation_title,
      fp.business_name AS provider_name,
      ngo.organization_name AS ngo_name,
      d.status AS delivery_status
    FROM incidents i
    LEFT JOIN users u_rep ON u_rep.id = i.reporter_user_id
    LEFT JOIN users u_adm ON u_adm.id = i.assigned_admin_user_id
    LEFT JOIN food_donations fd ON fd.id = i.donation_id
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.id = i.delivery_id
    LEFT JOIN ngos ngo ON ngo.id = d.ngo_id
    ${whereSql}
    ORDER BY ${sortCol} ${orderDir}
    LIMIT $${index} OFFSET $${index + 1}
  `;

  params.push(limit, offset);

  const [countRes, listRes] = await Promise.all([
    db.query(countQuery, params.slice(0, index - 1)),
    db.query(listQuery, params)
  ]);

  const total = parseInt(countRes.rows[0]?.total, 10) || 0;

  return {
    pagination: {
      total,
      page: parseInt(page, 10) || 1,
      limit: parseInt(limit, 10),
      totalPages: Math.ceil(total / limit)
    },
    incidents: listRes.rows
  };
}

/**
 * Get incident by ID with complete detail, audit timeline, notes, and related delivery.
 */
async function getIncidentById(id) {
  const query = `
    SELECT
      i.*,
      u_rep.full_name AS reporter_name,
      u_rep.email AS reporter_email,
      u_rep.role AS reporter_role,
      u_adm.full_name AS assigned_admin_name,
      u_adm.email AS assigned_admin_email,
      fd.title AS donation_title,
      fd.category AS donation_category,
      fd.quantity AS donation_quantity,
      fd.unit AS donation_unit,
      fd.pickup_address,
      fd.expiry_time AS donation_expiry,
      fp.id AS provider_id,
      fp.business_name AS provider_name,
      fp.address AS provider_address,
      ngo.id AS ngo_id,
      ngo.organization_name AS ngo_name,
      ngo.address AS ngo_address,
      u_vol.full_name AS volunteer_name,
      u_vol.phone AS volunteer_phone,
      d.status AS delivery_status,
      d.pickup_time,
      d.delivery_time,
      d.quality_checklist
    FROM incidents i
    LEFT JOIN users u_rep ON u_rep.id = i.reporter_user_id
    LEFT JOIN users u_adm ON u_adm.id = i.assigned_admin_user_id
    LEFT JOIN food_donations fd ON fd.id = i.donation_id
    LEFT JOIN food_providers fp ON fp.id = fd.provider_id
    LEFT JOIN deliveries d ON d.id = i.delivery_id
    LEFT JOIN ngos ngo ON ngo.id = d.ngo_id
    LEFT JOIN volunteers v ON v.id = d.volunteer_id
    LEFT JOIN users u_vol ON u_vol.id = v.user_id
    WHERE i.id = $1
  `;

  const { rows } = await db.query(query, [id]);
  if (rows.length === 0) {
    const err = new Error('Incident not found.');
    err.statusCode = 404;
    throw err;
  }

  const incident = rows[0];

  // Fetch audit log
  const auditRes = await db.query(
    `SELECT
       a.*,
       u.full_name AS actor_name,
       u.role AS actor_role
     FROM incident_audit_logs a
     LEFT JOIN users u ON u.id = a.actor_id
     WHERE a.incident_id = $1
     ORDER BY a.created_at ASC`,
    [id]
  );

  // Fetch internal notes
  const notesRes = await db.query(
    `SELECT
       n.*,
       u.full_name AS author_name,
       u.email AS author_email
     FROM incident_notes n
     JOIN users u ON u.id = n.author_id
     WHERE n.incident_id = $1
     ORDER BY n.created_at ASC`,
    [id]
  );

  // Fetch related QR verification failures if applicable
  let qrAttempts = [];
  if (incident.delivery_id) {
    const qrRes = await db.query(
      `SELECT id, code_prefix, failure_reason, attempted_at
       FROM qr_scan_attempts
       WHERE delivery_id = $1
       ORDER BY attempted_at DESC
       LIMIT 10`,
      [incident.delivery_id]
    );
    qrAttempts = qrRes.rows;
  }

  return {
    ...incident,
    audit_logs: auditRes.rows,
    notes: notesRes.rows,
    qr_scan_attempts: qrAttempts
  };
}

/**
 * Assign administrator to incident.
 */
async function assignIncident(id, adminUserId, actorId, notes = null) {
  const incident = await getIncidentById(id);

  // Check admin user exists
  const adminRes = await db.query("SELECT id, full_name, email FROM users WHERE id = $1 AND role = 'admin'", [adminUserId]);
  if (adminRes.rows.length === 0) {
    const err = new Error('Selected user is not an administrator.');
    err.statusCode = 400;
    throw err;
  }
  const assignedAdmin = adminRes.rows[0];

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const prevAdminId = incident.assigned_admin_user_id;

    await client.query(
      `UPDATE incidents
       SET assigned_admin_user_id = $1, assigned_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [adminUserId, id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'assigned',
      previousValue: { assigned_admin_user_id: prevAdminId },
      newValue: { assigned_admin_user_id: adminUserId, assigned_admin_name: assignedAdmin.full_name },
      notes: notes || `Assigned to ${assignedAdmin.full_name}`
    });

    await client.query('COMMIT');

    // Send notification to assigned administrator
    createNotification({
      userId: adminUserId,
      title: `Incident Assigned: ${incident.incident_reference}`,
      body: `You have been assigned to handle incident "${incident.title}".`,
      type: 'in_app',
      data: { incident_id: id, reference: incident.incident_reference }
    }).catch(() => {});

    return { success: true, message: `Incident assigned to ${assignedAdmin.full_name}` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Acknowledge incident.
 */
async function acknowledgeIncident(id, actorId) {
  const incident = await getIncidentById(id);

  if (incident.status !== 'open' && incident.status !== 'reopened') {
    const err = new Error(`Incident is already in status "${incident.status}".`);
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents
       SET status = 'acknowledged', acknowledged_at = NOW(), updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'acknowledged',
      previousValue: { status: incident.status },
      newValue: { status: 'acknowledged' },
      notes: 'Incident acknowledged by administrator'
    });

    await client.query('COMMIT');
    return { success: true, message: 'Incident acknowledged.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Update incident status through valid state transitions.
 */
async function updateStatus(id, newStatus, actorId, notes = null) {
  const incident = await getIncidentById(id);
  const currentStatus = incident.status;

  const allowed = VALID_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(newStatus)) {
    const err = new Error(
      `Invalid state transition: Cannot change status from "${currentStatus}" to "${newStatus}". Valid transitions: ${allowed.join(', ') || 'none'}`
    );
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const updates = ['status = $1', 'updated_at = NOW()'];
    const params = [newStatus, id];

    if (newStatus === 'acknowledged') updates.push('acknowledged_at = NOW()');
    if (newStatus === 'resolved') updates.push('resolved_at = NOW()');
    if (newStatus === 'closed') updates.push('closed_at = NOW()');

    await client.query(
      `UPDATE incidents SET ${updates.join(', ')} WHERE id = $2`,
      params
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'status_change',
      previousValue: { status: currentStatus },
      newValue: { status: newStatus },
      notes: notes || `Status changed from ${currentStatus} to ${newStatus}`
    });

    await client.query('COMMIT');

    // Notify reporter if status changed to resolved or closed
    if ((newStatus === 'resolved' || newStatus === 'closed') && incident.reporter_user_id) {
      createNotification({
        userId: incident.reporter_user_id,
        title: `Incident ${incident.incident_reference} Update`,
        body: `Your reported incident has been updated to "${newStatus}".`,
        type: 'in_app',
        data: { incident_id: id, status: newStatus }
      }).catch(() => {});
    }

    return { success: true, status: newStatus, message: `Status updated to ${newStatus}` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Change severity with recorded reason.
 */
async function updateSeverity(id, newSeverity, reason, actorId) {
  const incident = await getIncidentById(id);
  const prevSeverity = incident.severity;

  if (prevSeverity === newSeverity) {
    return { success: true, message: 'Severity unchanged.' };
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents SET severity = $1, updated_at = NOW() WHERE id = $2`,
      [newSeverity, id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'severity_change',
      previousValue: { severity: prevSeverity },
      newValue: { severity: newSeverity },
      notes: `Severity changed from ${prevSeverity} to ${newSeverity}. Reason: ${reason}`
    });

    await client.query('COMMIT');
    return { success: true, message: `Severity updated to ${newSeverity}` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Add an internal investigation note.
 */
async function addNote(id, noteText, isInternal = true, authorId) {
  // Ensure incident exists
  await getIncidentById(id);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    const { rows } = await client.query(
      `INSERT INTO incident_notes (incident_id, author_id, is_internal, note, created_at)
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, authorId, isInternal, noteText]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId: authorId,
      action: 'note_added',
      notes: `Internal investigation note added (${noteText.slice(0, 60)}...)`
    });

    await client.query('COMMIT');
    return rows[0];
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Resolve an incident with resolution summary.
 */
async function resolveIncident(id, resolutionSummary, actorId, notes = null) {
  const incident = await getIncidentById(id);

  if (incident.status === 'resolved' || incident.status === 'closed') {
    const err = new Error(`Incident is already ${incident.status}.`);
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents
       SET status = 'resolved', resolution_summary = $1, resolved_at = NOW(), updated_at = NOW()
       WHERE id = $2`,
      [resolutionSummary, id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'resolved',
      previousValue: { status: incident.status },
      newValue: { status: 'resolved', resolution_summary: resolutionSummary },
      notes: notes || `Resolved: ${resolutionSummary}`
    });

    await client.query('COMMIT');

    if (incident.reporter_user_id) {
      createNotification({
        userId: incident.reporter_user_id,
        title: `Incident Resolved: ${incident.incident_reference}`,
        body: `Resolution: ${resolutionSummary}`,
        type: 'in_app',
        data: { incident_id: id, status: 'resolved' }
      }).catch(() => {});
    }

    return { success: true, message: 'Incident resolved successfully.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Close a resolved incident.
 */
async function closeIncident(id, actorId, notes = null) {
  const incident = await getIncidentById(id);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents SET status = 'closed', closed_at = NOW(), updated_at = NOW() WHERE id = $1`,
      [id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'closed',
      previousValue: { status: incident.status },
      newValue: { status: 'closed' },
      notes: notes || 'Incident closed by administrator'
    });

    await client.query('COMMIT');
    return { success: true, message: 'Incident closed.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Reopen a resolved or closed incident.
 */
async function reopenIncident(id, reason, actorId) {
  const incident = await getIncidentById(id);

  if (!['resolved', 'closed'].includes(incident.status)) {
    const err = new Error('Only resolved or closed incidents can be reopened.');
    err.statusCode = 400;
    throw err;
  }

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents
       SET status = 'reopened', resolved_at = NULL, closed_at = NULL, updated_at = NOW()
       WHERE id = $1`,
      [id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      action: 'reopened',
      previousValue: { status: incident.status },
      newValue: { status: 'reopened' },
      notes: `Incident reopened. Reason: ${reason}`
    });

    await client.query('COMMIT');
    return { success: true, message: 'Incident reopened for investigation.' };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

/**
 * Escalate an incident (Manual or Automatic).
 */
async function escalateIncident(id, reason, actorId = null) {
  const incident = await getIncidentById(id);

  const nextLevel = Math.min((incident.escalation_level || 0) + 1, 3);

  const client = await db.getClient();
  try {
    await client.query('BEGIN');

    await client.query(
      `UPDATE incidents
       SET escalation_level = $1, escalated_at = NOW(), escalation_reason = $2, updated_at = NOW()
       WHERE id = $3`,
      [nextLevel, reason, id]
    );

    await recordAuditLog(client, {
      incidentId: id,
      actorId,
      actorType: actorId ? 'user' : 'system',
      action: 'escalated',
      previousValue: { escalation_level: incident.escalation_level },
      newValue: { escalation_level: nextLevel, escalation_reason: reason },
      notes: `Escalation triggered (Level ${nextLevel}): ${reason}`
    });

    await client.query('COMMIT');

    // Notify all active admins of escalation
    try {
      const adminUsers = await db.query("SELECT id FROM users WHERE role = 'admin' AND status = 'active'");
      for (const admin of adminUsers.rows) {
        createNotification({
          userId: admin.id,
          title: `⚠️ ESCALATION: ${incident.incident_reference} (Level ${nextLevel})`,
          body: `${incident.title} — ${reason}`,
          type: 'in_app',
          data: { incident_id: id, escalation_level: nextLevel }
        }).catch(() => {});
      }
    } catch {}

    return { success: true, escalation_level: nextLevel, message: `Incident escalated to Level ${nextLevel}` };
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  createIncident,
  getIncidentsSummary,
  getIncidents,
  getIncidentById,
  assignIncident,
  acknowledgeIncident,
  updateStatus,
  updateSeverity,
  addNote,
  resolveIncident,
  closeIncident,
  reopenIncident,
  escalateIncident,
};
