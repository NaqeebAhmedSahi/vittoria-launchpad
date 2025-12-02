// Recommendation events model
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');
const vectorStore = require('../services/vectorStore.cjs');

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
    const recommendation = rows[0];
    
    // Generate embedding for recommendation
    const recommendationId = recommendation.id;
    try {
      const summary = [
        `strength: ${recommendation.strength}`,
        recommendation.comment || ''
      ].filter(Boolean).join(' | ');
      
      await embeddingClient.generateAndPersistEmbedding(
        'recommendation_events',
        recommendationId,
        summary,
        { source: 'recommendation' }
      );
      console.log(`✅ Generated embedding for recommendation ${recommendationId}`);
    } catch (error) {
      console.error(`⚠️ Failed to generate embedding for recommendation:`, error.message);
    }
    
    return recommendation;
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
  },

  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    if (data.strength !== undefined) {
      fields.push(`strength = $${paramIndex++}`);
      values.push(data.strength);
    }

    if (data.comment !== undefined) {
      fields.push(`comment = $${paramIndex++}`);
      values.push(data.comment);
    }

    if (fields.length === 0) {
      return await db.query('SELECT * FROM recommendation_events WHERE id = $1', [id]).then(r => r.rows[0]);
    }

    values.push(id);
    const query = `UPDATE recommendation_events SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await db.query(query, values);
    const recommendation = rows[0];

    // Update embedding on change
    try {
      const summary = [
        `strength: ${recommendation.strength}`,
        recommendation.comment || ''
      ].filter(Boolean).join(' | ');

      await embeddingClient.generateAndPersistEmbedding(
        'recommendation_events',
        id,
        summary,
        { source: 'recommendation_update' }
      );
      console.log(`✅ Updated embedding for recommendation ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to update embedding:`, error.message);
    }

    return recommendation;
  },

  async delete(id) {
    try {
      // Delete embedding first
      await vectorStore.deleteEmbedding('recommendation_events', id);
      console.log(`✅ Deleted embedding for recommendation ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to delete embedding:`, error.message);
    }

    await db.query('DELETE FROM recommendation_events WHERE id = $1', [id]);
    return true;
  }
};

module.exports = RecommendationModel;
