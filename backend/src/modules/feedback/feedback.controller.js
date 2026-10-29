const feedbackService = require('./feedback.service');

/**
 * POST /api/feedback
 * Public endpoint to submit feedback without authentication.
 */
async function submitFeedback(req, res, next) {
  try {
    const { name, email, feedback_type, rating, subject, message, is_anonymous, website } = req.body;

    // Honeypot spam defense: bots usually fill hidden input fields named 'website'
    if (website && website.trim() !== '') {
      // Return 200 to fool spam bots without saving junk to DB
      return res.status(200).json({
        success: true,
        message: 'Thank you for helping us improve FoodRescue! Your feedback has been submitted successfully.',
      });
    }

    const userId = req.user?.id || null;

    const result = await feedbackService.submitFeedback({
      userId,
      name,
      email,
      feedback_type,
      rating,
      subject,
      message,
      is_anonymous: Boolean(is_anonymous),
    });

    res.status(201).json({
      success: true,
      message: 'Thank you for helping us improve FoodRescue! Your feedback has been submitted successfully.',
      data: result,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback
 * Admin-only: list submitted feedback with filtering & pagination
 */
async function getFeedbackList(req, res, next) {
  try {
    const data = await feedbackService.getFeedbackList(req.query);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * GET /api/feedback/:id
 * Admin-only: get single feedback details
 */
async function getFeedbackById(req, res, next) {
  try {
    const data = await feedbackService.getFeedbackById(req.params.id);
    res.json({
      success: true,
      data,
    });
  } catch (error) {
    next(error);
  }
}

/**
 * PATCH /api/feedback/:id/status
 * Admin-only: update status & admin notes
 */
async function updateFeedbackStatus(req, res, next) {
  try {
    const data = await feedbackService.updateFeedbackStatus(req.params.id, req.body);
    res.json({
      success: true,
      message: `Feedback status successfully updated to ${req.body.status}.`,
      data,
    });
  } catch (error) {
    next(error);
  }
}

module.exports = {
  submitFeedback,
  getFeedbackList,
  getFeedbackById,
  updateFeedbackStatus,
};
