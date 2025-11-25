const RecommendationModel = require('../models/recommendationModel.cjs');

module.exports = {
  async create(data) {
    return await RecommendationModel.create(data);
  },

  async listByMandate(mandateId) {
    return await RecommendationModel.listByMandate(mandateId);
  },

  async listByCandidate(candidateId, mandateId) {
    return await RecommendationModel.listByCandidate(candidateId, mandateId);
  }
};
