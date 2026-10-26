const express = require('express');
const router = express.Router();
const complaintController = require('./complaint.controller');
const authenticate = require('../../middleware/auth');

// All complaint routes require authentication
router.use(authenticate);

// Submit a new complaint
router.post('/', complaintController.createComplaint);

// Get my complaints
router.get('/', complaintController.getMyComplaints);

// Get a specific complaint (ownership enforced in service)
router.get('/:id', complaintController.getComplaintById);

module.exports = router;
