const express = require('express');
const router = express.Router();
const volunteerController = require('./volunteer.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

router.use(authenticate);

// Volunteer routes
router.patch('/availability', roleGuard('volunteer'), volunteerController.updateAvailability);
router.patch('/location', roleGuard('volunteer'), volunteerController.updateLocation);
router.get('/my-deliveries', roleGuard('volunteer'), volunteerController.getMyDeliveries);
router.get('/available-missions', roleGuard('volunteer', 'admin'), volunteerController.getAvailableMissions);
router.post('/claim-mission/:deliveryId', roleGuard('volunteer'), volunteerController.claimMission);

// Ranked volunteers for a donation (admin / system use)
router.get('/ranked/:donationId', roleGuard('admin', 'ngo'), volunteerController.getRankedVolunteers);

module.exports = router;

