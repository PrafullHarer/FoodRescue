/**
 * Role-based access control middleware factory.
 * Usage: roleGuard('admin', 'provider')  — allows only those roles through.
 *
 * Must be used AFTER the `authenticate` middleware (req.user must exist).
 *
 * @param  {...string} allowedRoles - Roles permitted to access the route
 * @returns {Function} Express middleware
 */
const roleGuard = (...allowedRoles) => {
  // Support both roleGuard('admin', 'provider') and roleGuard(['admin', 'provider'])
  const roles = allowedRoles.flat();

  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (req.user.profile_completed === false) {
      return res.status(403).json({
        success: false,
        code: 'PROFILE_INCOMPLETE',
        profile_completed: false,
        message: 'Profile completion required. Please complete your profile to access your FoodRescue dashboard.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: `Access denied. Required role(s): ${roles.join(', ')}.`,
      });
    }

    next();
  };
};

module.exports = roleGuard;
