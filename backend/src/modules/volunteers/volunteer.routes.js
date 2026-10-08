const express = require('express');
const router = express.Router();
const volunteerController = require('./volunteer.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Volunteer-only routes
router.patch('/availability', roleGuard('volunteer'), volunteerController.updateAvailability);
router.patch('/location', roleGuard('volunteer'), volunteerController.updateLocation);
router.get('/my-deliveries', roleGuard('volunteer'), volunteerController.getMyDeliveries);

// Ranked volunteers for a donation (admin / system use)
router.get('/ranked/:donationId', roleGuard('admin', 'ngo'), volunteerController.getRankedVolunteers);

module.exports = router;
