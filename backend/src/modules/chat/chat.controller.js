const chatService = require('./chat.service');
const fs = require('fs');
const path = require('path');

const handleMessage = async (req, res, next) => {
  try {
    const { message, history } = req.body;
    if (!message || typeof message !== 'string' || !message.trim()) {
      return res.status(400).json({
        success: false,
        message: 'A valid non-empty message string is required.'
      });
    }

    const result = await chatService.processMessage({
      message,
      user: req.user || null,
      conversationHistory: Array.isArray(history) ? history : []
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

const handleFeedback = async (req, res, next) => {
  try {
    const { messageId, feedback, comment } = req.body;
    if (!feedback || !['up', 'down'].includes(feedback)) {
      return res.status(400).json({
        success: false,
        message: 'Feedback must be either "up" or "down".'
      });
    }

    const result = chatService.recordFeedback({
      userId: req.user?.id || null,
      messageId: messageId || 'msg_' + Date.now(),
      feedback,
      comment
    });

    return res.json(result);
  } catch (err) {
    next(err);
  }
};

const getKnowledge = async (req, res, next) => {
  try {
    const knowledgePath = path.resolve(__dirname, 'navigation-knowledge.json');
    const data = JSON.parse(fs.readFileSync(knowledgePath, 'utf8'));
    return res.json({
      success: true,
      data
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  handleMessage,
  handleFeedback,
  getKnowledge
};
