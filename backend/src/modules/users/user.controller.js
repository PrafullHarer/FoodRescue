const userService = require('./user.service');

/**
 * GET /api/users
 */
const getUsers = async (req, res, next) => {
  try {
    const { page, limit, role, status } = req.query;
    const result = await userService.getUsers({
      page: page ? parseInt(page, 10) : 1,
      limit: limit ? parseInt(limit, 10) : 20,
      role,
      status,
    });

    res.json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/users/:id
 */
const getUserById = async (req, res, next) => {
  try {
    const user = await userService.getUserById(req.params.id);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * PUT /api/users/:id
 */
const updateUser = async (req, res, next) => {
  try {
    // Users can only update their own profile (unless admin)
    if (req.user.role !== 'admin' && req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'You can only update your own profile.',
      });
    }

    const user = await userService.updateUser(req.params.id, req.body);
    res.json({ success: true, data: user });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/users/:id/status
 */
const updateUserStatus = async (req, res, next) => {
  try {
    const user = await userService.updateUserStatus(req.params.id, req.body.status);
    res.json({ success: true, data: user, message: `User status updated to ${req.body.status}.` });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getUsers,
  getUserById,
  updateUser,
  updateUserStatus,
};
