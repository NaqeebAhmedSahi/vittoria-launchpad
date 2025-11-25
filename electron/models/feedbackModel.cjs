// Feedback attribution model
// sourceId, candidateId, mandateId, strength, comment, created_at

const db = require('../db/pgConnection.cjs');

const FeedbackModel = {
  async list({ mandateId, candidateId }) {
    let query = 'SELECT * FROM feedback_attribution WHERE 1=1';
    const params = [];
    if (mandateId) {
      query += ' AND mandate_id = $1';
      params.push(mandateId);
    }
    if (candidateId) {
      query += ' AND candidate_id = $2';
      params.push(candidateId);
    }
    const { rows } = await db.query(query, params);
    return rows;
  },
};

module.exports = FeedbackModel;
