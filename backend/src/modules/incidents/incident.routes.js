const express = require('express');
const router = express.Router();
const incidentController = require('./incident.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// 1. Manual Incident Reporting (Open to all authenticated participants: NGO, Provider, Volunteer, Admin)
router.post('/', incidentController.reportIncident);

// 2. Admin Management Endpoints
router.get('/summary', roleGuard('admin'), incidentController.getIncidentsSummary);
router.get('/', roleGuard('admin'), incidentController.getIncidents);
router.get('/:id', roleGuard('admin'), incidentController.getIncidentById);

router.post('/:id/assign', roleGuard('admin'), incidentController.assignIncident);
router.post('/:id/acknowledge', roleGuard('admin'), incidentController.acknowledgeIncident);
router.patch('/:id/status', roleGuard('admin'), incidentController.updateStatus);
router.patch('/:id/severity', roleGuard('admin'), incidentController.updateSeverity);
router.post('/:id/notes', roleGuard('admin'), incidentController.addNote);
router.post('/:id/resolve', roleGuard('admin'), incidentController.resolveIncident);
router.post('/:id/close', roleGuard('admin'), incidentController.closeIncident);
router.post('/:id/reopen', roleGuard('admin'), incidentController.reopenIncident);
router.post('/:id/escalate', roleGuard('admin'), incidentController.escalateIncident);

module.exports = router;
