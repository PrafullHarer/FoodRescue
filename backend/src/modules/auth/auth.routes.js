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
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
  sendEmailOtpSchema,
  verifyEmailOtpSchema,
} = require('./auth.schema');

// Public routes
router.get('/google-config', authController.getGoogleConfig);
router.post('/register', validate({ body: registerSchema }), authController.register);
router.post('/login', validate({ body: loginSchema }), authController.login);
router.post('/check-email', authController.checkEmail);
router.post('/send-email-otp', validate({ body: sendEmailOtpSchema }), authController.sendEmailOtp);
router.post('/verify-email-otp', validate({ body: verifyEmailOtpSchema }), authController.verifyEmailOtp);
router.post('/forgot-password', validate({ body: forgotPasswordSchema }), authController.forgotPassword);
router.post('/reset-password', validate({ body: resetPasswordSchema }), authController.resetPassword);
router.post('/google', validate({ body: googleAuthSchema }), authController.googleLogin);
router.post('/refresh', validate({ body: refreshTokenSchema }), authController.refreshToken);
router.post('/logout', authController.logout);
router.get('/verification-status', authController.getVerificationStatus);
router.post('/verification-status', authController.getVerificationStatus);

// Protected routes (exempt from complete-profile restriction so users can check status and complete profile)
router.get('/me', authenticate, authController.getMe);
router.get('/profile-status', authenticate, authController.getProfileStatus);
router.post(
  '/complete-profile',
  authenticate,
  validate({ body: completeProfileSchema }),
  authController.completeProfile
);
router.post(
  '/change-password',
  authenticate,
  validate({ body: changePasswordSchema }),
  authController.changePassword
);

module.exports = router;
