const express = require('express');
const router = express.Router();
const donationController = require('./donation.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createDonationSchema, updateDonationSchema } = require('./donation.schema');

// Public: list and view donations
router.get('/', donationController.getDonations);
router.get('/:id', donationController.getDonationById);

// Protected: create / update / cancel (provider only)
router.post(
  '/',
  authenticate,
  roleGuard('provider'),
  validate({ body: createDonationSchema }),
  donationController.createDonation
);

router.put(
  '/:id',
  authenticate,
  roleGuard('provider'),
  validate({ body: updateDonationSchema }),
  donationController.updateDonation
);

router.post(
  '/:id/cancel',
  authenticate,
  roleGuard('provider'),
  donationController.cancelDonation
);

// Protected: claim & update pickup type (NGO only)
router.post(
  '/:id/claim',
  authenticate,
  roleGuard('ngo'),
  donationController.claimDonation
);

router.patch(
  '/:id/pickup-type',
  authenticate,
  roleGuard('ngo'),
  donationController.updatePickupType
);

module.exports = router;
