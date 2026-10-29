/**
 * Middleware to enforce mandatory profile completion.
 * Users who authenticated via OAuth but have not completed all required
 * role fields are blocked from accessing dashboard and operational APIs.
 */
const ensureProfileCompleted = (req, res, next) => {
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
      message: 'Profile completion required. Complete your profile to access your FoodRescue dashboard.',
    });
  }

  next();
};

module.exports = ensureProfileCompleted;
