// Team model for managing teams within firms
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');
const vectorStore = require('../services/vectorStore.cjs');

const TeamModel = {
  async list(firmId = null) {
    let query = 'SELECT * FROM teams';
    let params = [];
    
    if (firmId) {
      query += ' WHERE firm_id = $1';
      params.push(firmId);
    }
    
    query += ' ORDER BY name ASC';
    const { rows } = await db.query(query, params);
    return rows;
  },
  
  async getById(id) {
    const { rows } = await db.query('SELECT * FROM teams WHERE id = $1', [id]);
    return rows[0] || null;
  },
  
  async create(data) {
    const query = `
      INSERT INTO teams (name, firm_id, description)
      VALUES ($1, $2, $3)
      RETURNING *
    `;
    const params = [data.name, data.firm_id, data.description || null];
    const { rows } = await db.query(query, params);
    const team = rows[0];

    // Generate embedding for team
    const teamId = team.id;
    try {
      const summary = [
        team.name,
        team.description || ''
      ].filter(Boolean).join(' | ');

      await embeddingClient.generateAndPersistEmbedding(
        'teams',
        teamId,
        summary,
        { source: 'team_profile' }
      );
      console.log(`✅ Generated embedding for team ${teamId}`);
    } catch (error) {
      console.error(`⚠️ Failed to generate embedding for team:`, error.message);
    }

    return team;
  },
  
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.name !== undefined) {
      fields.push(`name = $${paramIndex++}`);
      values.push(data.name);
    }
    
    if (data.firm_id !== undefined) {
      fields.push(`firm_id = $${paramIndex++}`);
      values.push(data.firm_id);
    }
    
    if (data.description !== undefined) {
      fields.push(`description = $${paramIndex++}`);
      values.push(data.description);
    }
    
    if (fields.length === 0) {
      return await this.getById(id);
    }
    
    values.push(id);
    const query = `UPDATE teams SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await db.query(query, values);
    const team = rows[0];

    // Update embedding if profile fields changed
    const profileFieldsChanged = data.name !== undefined || data.description !== undefined;
    if (profileFieldsChanged) {
      try {
        const summary = [
          team.name,
          team.description || ''
        ].filter(Boolean).join(' | ');

        await embeddingClient.generateAndPersistEmbedding(
          'teams',
          id,
          summary,
          { source: 'team_update' }
        );
        console.log(`✅ Updated embedding for team ${id}`);
      } catch (error) {
        console.error(`⚠️ Failed to update embedding:`, error.message);
      }
    }

    return team;
  },
  
  async delete(id) {
    try {
      // Delete embedding first
      await vectorStore.deleteEmbedding('teams', id);
      console.log(`✅ Deleted embedding for team ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to delete embedding:`, error.message);
    }

    await db.query('DELETE FROM teams WHERE id = $1', [id]);
    return true;
  },
  
  async getTeamMembers(teamId) {
    const { rows } = await db.query(
      'SELECT * FROM people WHERE team_id = $1 ORDER BY last_name, first_name',
      [teamId]
    );
    return rows;
  }
};

module.exports = TeamModel;
