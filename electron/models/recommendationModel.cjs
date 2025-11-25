// Recommendation events model
const db = require('../db/pgConnection.cjs');

const RecommendationModel = {
  async create(data) {
    const query = `
      INSERT INTO recommendation_events (source_id, candidate_id, mandate_id, strength, comment)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const params = [
      data.source_id,
      data.candidate_id,
      data.mandate_id,
      data.strength,
      data.comment || null
    ];
    
    const { rows } = await db.query(query, params);
    return rows[0];
  },

  async listByMandate(mandateId) {
    const query = `
      SELECT re.*, s.name as source_name, c.name as candidate_name
      FROM recommendation_events re
      JOIN sources s ON re.source_id = s.id
      JOIN candidates c ON re.candidate_id = c.id
      WHERE re.mandate_id = $1
      ORDER BY re.created_at DESC
    `;
    
    const { rows } = await db.query(query, [mandateId]);
    return rows;
  },

  async listByCandidate(candidateId, mandateId) {
    const query = `
      SELECT re.*, s.name as source_name
      FROM recommendation_events re
      JOIN sources s ON re.source_id = s.id
      WHERE re.candidate_id = $1 AND re.mandate_id = $2
      ORDER BY re.created_at DESC
    `;
    
    const { rows } = await db.query(query, [candidateId, mandateId]);
    return rows;
  }
};

module.exports = RecommendationModel;
