const express = require('express');
const router = express.Router();
const authController = require('./auth.controller');
const validate = require('../../middleware/validate');
const authenticate = require('../../middleware/auth');
const {
  registerSchema,
  loginSchema,
  refreshTokenSchema,
  googleAuthSchema,
  completeProfileSchema,
} = require('./auth.schema');

// Public routes
router.get('/google-config', authController.getGoogleConfig);
router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/google', validate({ body: googleAuthSchema }), authController.googleLogin);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post('/logout', authController.logout);

// Protected routes (exempt from complete-profile restriction so users can check status and complete profile)
router.get('/me', authenticate, authController.getMe);
router.get('/profile-status', authenticate, authController.getProfileStatus);
router.post(
  '/complete-profile',
  authenticate,
  validate({ body: completeProfileSchema }),
  authController.completeProfile
);

module.exports = router;
