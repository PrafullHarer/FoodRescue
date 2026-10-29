const incidentService = require('./incident.service');
const {
  createManualIncidentSchema,
  updateStatusSchema,
  updateSeveritySchema,
  assignIncidentSchema,
  addNoteSchema,
  resolveIncidentSchema,
  reopenIncidentSchema,
} = require('./incident.schema');

/**
 * POST /api/incidents
 * Authenticated users can report an operational incident.
 */
const reportIncident = async (req, res, next) => {
  try {
    const validatedData = createManualIncidentSchema.parse(req.body);

    const incident = await incidentService.createIncident({
      ...validatedData,
      source: 'manual',
      reporter_user_id: req.user.id,
      actorId: req.user.id,
      actorType: 'user'
    });

    res.status(201).json({
      success: true,
      message: `Incident ${incident.incident_reference} submitted successfully.`,
      data: incident
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/summary
 * Admin KPI summary metrics.
 */
const getIncidentsSummary = async (req, res, next) => {
  try {
    const summary = await incidentService.getIncidentsSummary();
    res.json({ success: true, data: summary });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents
 * Admin paginated, filterable incident listing.
 */
const getIncidents = async (req, res, next) => {
  try {
    const result = await incidentService.getIncidents(req.query);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/incidents/:id
 * Get complete incident details, audit timeline, notes.
 */
const getIncidentById = async (req, res, next) => {
  try {
    const incident = await incidentService.getIncidentById(req.params.id);
    res.json({ success: true, data: incident });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/assign
 * Assign an administrator.
 */
const assignIncident = async (req, res, next) => {
  try {
    const { admin_user_id, notes } = assignIncidentSchema.parse(req.body);
    const result = await incidentService.assignIncident(req.params.id, admin_user_id, req.user.id, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/acknowledge
 * Admin acknowledges incident.
 */
const acknowledgeIncident = async (req, res, next) => {
  try {
    const result = await incidentService.acknowledgeIncident(req.params.id, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/incidents/:id/status
 * Transition incident status.
 */
const updateStatus = async (req, res, next) => {
  try {
    const { status, notes } = updateStatusSchema.parse(req.body);
    const result = await incidentService.updateStatus(req.params.id, status, req.user.id, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/incidents/:id/severity
 * Update severity with recorded reason.
 */
const updateSeverity = async (req, res, next) => {
  try {
    const { severity, reason } = updateSeveritySchema.parse(req.body);
    const result = await incidentService.updateSeverity(req.params.id, severity, reason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/notes
 * Add internal investigation note.
 */
const addNote = async (req, res, next) => {
  try {
    const { note, is_internal } = addNoteSchema.parse(req.body);
    const result = await incidentService.addNote(req.params.id, note, is_internal, req.user.id);
    res.status(201).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/resolve
 * Resolve incident.
 */
const resolveIncident = async (req, res, next) => {
  try {
    const { resolution_summary, notes } = resolveIncidentSchema.parse(req.body);
    const result = await incidentService.resolveIncident(req.params.id, resolution_summary, req.user.id, notes);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/close
 * Close resolved incident.
 */
const closeIncident = async (req, res, next) => {
  try {
    const result = await incidentService.closeIncident(req.params.id, req.user.id, req.body.notes);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/reopen
 * Reopen a resolved or closed incident.
 */
const reopenIncident = async (req, res, next) => {
  try {
    const { reason } = reopenIncidentSchema.parse(req.body);
    const result = await incidentService.reopenIncident(req.params.id, reason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/incidents/:id/escalate
 * Trigger manual escalation.
 */
const escalateIncident = async (req, res, next) => {
  try {
    const reason = req.body.reason || 'Manual escalation by administrator';
    const result = await incidentService.escalateIncident(req.params.id, reason, req.user.id);
    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  reportIncident,
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
