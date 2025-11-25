const feedbackService = require('../services/feedbackService');

module.exports = {
  async list(req, res) {
    try {
      const { mandateId, candidateId } = req.query;
      const feedback = await feedbackService.list({ mandateId, candidateId });
      res.json({ success: true, feedback });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  },
};
