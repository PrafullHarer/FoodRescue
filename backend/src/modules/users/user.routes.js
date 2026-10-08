const express = require('express');
const router = express.Router();
const userController = require('./user.controller');
const authenticate = require('../../middleware/auth');
const roleGuard = require('../../middleware/roleGuard');

// All user routes require authentication
router.use(authenticate);

// Any authenticated user can list / view users
router.get('/', userController.getUsers);
router.get('/:id', userController.getUserById);

// Users can update their own profile; admins can update any
router.put('/:id', userController.updateUser);

// Admin-only: change user status
router.patch('/:id/status', roleGuard('admin'), userController.updateUserStatus);

module.exports = router;
