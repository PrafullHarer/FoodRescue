const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const complaintController = require('../complaints/complaint.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// All admin routes require admin role
router.use(authenticate, roleGuard('admin'));

// Verifications
router.get('/pending-verifications', adminController.getPendingVerifications);
router.post('/verify/:type/:id', adminController.verifyEntity);

// Advanced Complaints Management
router.get('/complaints/stats', complaintController.getAdminComplaintStats);
router.get('/complaints/export', complaintController.exportComplaintsCSV);
router.get('/complaints', complaintController.getAdminComplaints);
router.get('/complaints/:id', complaintController.getComplaintById);
router.get('/complaints/:id/messages', complaintController.getComplaintMessages);
router.post('/complaints/:id/messages', complaintController.addComplaintMessage);
router.get('/complaints/:id/history', complaintController.getComplaintHistory);
router.post('/complaints/:id/assign', complaintController.assignComplaint);
router.patch('/complaints/:id/status', complaintController.updateComplaintStatus);
router.post('/complaints/:id/resolve', complaintController.resolveComplaint);
router.post('/complaints/:id/reject', complaintController.rejectComplaint);
router.post('/complaints/:id/reopen', complaintController.reopenComplaint);
router.patch('/complaints/:id/priority', complaintController.updatePriority);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
