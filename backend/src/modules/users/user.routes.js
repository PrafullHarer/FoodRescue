const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// All user routes require authentication
router.use(authenticate);

// Admin-only: list all platform users
router.get('/', roleGuard('admin'), userController.getUsers);

// View user profile (self, admin, or public safe view)
router.get('/:id', userController.getUserById);

// Users can update their own profile; admins can update any
router.put('/:id', userController.updateUser);

// Admin-only: change user status
router.patch('/:id/status', roleGuard('admin'), userController.updateUserStatus);

module.exports = router;
