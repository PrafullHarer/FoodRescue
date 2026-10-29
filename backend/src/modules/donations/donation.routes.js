const express = require('express');
const router = express.Router();
const donationController = require('./donation.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');
const validate = require('../../middleware/validate');
const { createDonationSchema, updateDonationSchema } = require('./donation.schema');

// List donations (optional auth for role-specific isolation)
router.get('/', authenticate.optional, donationController.getDonations);

// Protected: Food Provider's own donations
router.get('/my', authenticate, roleGuard('provider'), donationController.getMyDonations);

// Protected: NGO's own claimed donations
router.get('/my-claims', authenticate, roleGuard('ngo'), donationController.getMyClaims);

// Detail view (optional auth: strictly verifies ownership so users only see authorized listings)
router.get('/:id', authenticate.optional, donationController.getDonationById);

// Protected: create / update / delete / cancel (provider only)
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

router.delete(
  '/:id',
  authenticate,
  roleGuard('provider'),
  donationController.deleteDonation
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
