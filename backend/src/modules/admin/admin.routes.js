const express = require('express');
const router = express.Router();
const adminController = require('./admin.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// All admin routes require admin role
router.use(authenticate, roleGuard('admin'));

// Verifications
router.get('/pending-verifications', adminController.getPendingVerifications);
router.post('/verify/:type/:id', adminController.verifyEntity);

// Complaints
router.get('/complaints', adminController.getComplaints);
router.post('/complaints/:id/resolve', adminController.resolveComplaint);

// Audit Logs
router.get('/audit-logs', adminController.getAuditLogs);

module.exports = router;
