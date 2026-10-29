const express = require('express');
const router = express.Router();
const complaintController = require('./complaint.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// All complaint routes require authentication
router.use(authenticate);

// ─── USER / PARTICIPANT ENDPOINTS ──────────────────────────────
// Submit a new complaint
router.post('/', complaintController.createComplaint);

// Get my complaints (both /me and / are supported)
router.get('/me', complaintController.getMyComplaints);
router.get('/', complaintController.getMyComplaints);

// ─── ADMIN SPECIFIC SUB-ROUTES ────────────────────────────────
// Admin stats, list, export
router.get('/admin/stats', roleGuard('admin'), complaintController.getAdminComplaintStats);
router.get('/admin/export', roleGuard('admin'), complaintController.exportComplaintsCSV);
router.get('/admin/list', roleGuard('admin'), complaintController.getAdminComplaints);

// ─── DETAIL & THREAD ENDPOINTS ────────────────────────────────
// Get a specific complaint (authorized user or admin)
router.get('/:id', complaintController.getComplaintById);

// Communication thread
router.get('/:id/messages', complaintController.getComplaintMessages);
router.post('/:id/messages', complaintController.addComplaintMessage);

// Audit history
router.get('/:id/history', complaintController.getComplaintHistory);

// Reopen complaint (complainant or admin)
router.post('/:id/reopen', complaintController.reopenComplaint);

// ─── ADMIN ACTION ENDPOINTS (under /api/complaints) ───────────
router.post('/:id/assign', roleGuard('admin'), complaintController.assignComplaint);
router.patch('/:id/status', roleGuard('admin'), complaintController.updateComplaintStatus);
router.post('/:id/resolve', roleGuard('admin'), complaintController.resolveComplaint);
router.post('/:id/reject', roleGuard('admin'), complaintController.rejectComplaint);
router.patch('/:id/priority', roleGuard('admin'), complaintController.updatePriority);

module.exports = router;
