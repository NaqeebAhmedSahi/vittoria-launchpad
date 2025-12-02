// People model for managing individuals associated with firms and teams
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

const PeopleModel = {
  async list(filters = {}) {
    let query = 'SELECT * FROM people WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (filters.firm_id) {
      query += ` AND firm_id = $${paramIndex++}`;
      params.push(filters.firm_id);
    }
    
    if (filters.team_id) {
      query += ` AND team_id = $${paramIndex++}`;
      params.push(filters.team_id);
    }
    
    if (filters.search) {
      query += ` AND (first_name ILIKE $${paramIndex} OR last_name ILIKE $${paramIndex} OR email ILIKE $${paramIndex})`;
      params.push(`%${filters.search}%`);
      paramIndex++;
    }
    
    query += ' ORDER BY last_name, first_name';
    const { rows } = await db.query(query, params);
    return rows;
  },
  
  async getById(id) {
    const { rows } = await db.query('SELECT * FROM people WHERE id = $1', [id]);
    return rows[0] || null;
  },
  
  async create(data) {
    const query = `
      INSERT INTO people (first_name, last_name, email, phone, firm_id, team_id, role, linkedin_url)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;
    const params = [
      data.first_name,
      data.last_name,
      data.email || null,
      data.phone || null,
      data.firm_id || null,
      data.team_id || null,
      data.role || null,
      data.linkedin_url || null
    ];
    const { rows } = await db.query(query, params);
    const person = rows[0];

    // Generate and persist embedding
    try {
      const personSummary = [
        `${data.first_name || ''} ${data.last_name || ''}`.trim(),
        data.email || '',
        data.phone || '',
        data.role || '',
        data.linkedin_url || '',
      ]
        .filter(Boolean)
        .join(' | ');

      await embeddingClient.generateAndPersistEmbedding(
        'people',
        person.id,
        personSummary,
        { source: 'person_profile' }
      );
      console.log(`[peopleModel] ✅ Generated embedding for person ${person.id}`);
    } catch (error) {
      console.error(`[peopleModel] ⚠️ Failed to generate embedding for person ${person.id}:`, error.message);
    }

    return person;
  },
  
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.first_name !== undefined) {
      fields.push(`first_name = $${paramIndex++}`);
      values.push(data.first_name);
    }
    
    if (data.last_name !== undefined) {
      fields.push(`last_name = $${paramIndex++}`);
      values.push(data.last_name);
    }
    
    if (data.email !== undefined) {
      fields.push(`email = $${paramIndex++}`);
      values.push(data.email);
    }
    
    if (data.phone !== undefined) {
      fields.push(`phone = $${paramIndex++}`);
      values.push(data.phone);
    }
    
    if (data.firm_id !== undefined) {
      fields.push(`firm_id = $${paramIndex++}`);
      values.push(data.firm_id);
    }
    
    if (data.team_id !== undefined) {
      fields.push(`team_id = $${paramIndex++}`);
      values.push(data.team_id);
    }
    
    if (data.role !== undefined) {
      fields.push(`role = $${paramIndex++}`);
      values.push(data.role);
    }
    
    if (data.linkedin_url !== undefined) {
      fields.push(`linkedin_url = $${paramIndex++}`);
      values.push(data.linkedin_url);
    }
    
    if (fields.length === 0) {
      return await this.getById(id);
    }
    
    values.push(id);
    const query = `UPDATE people SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await db.query(query, values);
    const person = rows[0];

    // Update embedding if profile fields changed
    const profileFieldsChanged = data.name !== undefined || data.email !== undefined;
    if (profileFieldsChanged) {
      try {
        const vectorStore = require('../services/vectorStore.cjs');
        const embeddingClient = require('../services/embeddingClient.cjs');
        const summary = [
          person.name,
          person.email || '',
          person.phone || '',
          person.role || '',
          person.linkedin_url || ''
        ].filter(Boolean).join(' | ');

        await embeddingClient.generateAndPersistEmbedding(
          'people',
          id,
          summary,
          { source: 'people_update' }
        );
        console.log(`✅ Updated embedding for person ${id}`);
      } catch (error) {
        console.error(`⚠️ Failed to update embedding:`, error.message);
      }
    }

    return person;
  },
  
  async delete(id) {
    try {
      const vectorStore = require('../services/vectorStore.cjs');
      // Delete embedding first
      await vectorStore.deleteEmbedding('people', id);
      console.log(`✅ Deleted embedding for person ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to delete embedding:`, error.message);
    }

    await db.query('DELETE FROM people WHERE id = $1', [id]);
    return true;
  },
  
  async getEmploymentHistory(personId) {
    const { rows } = await db.query(
      `SELECT e.*, f.name as firm_name, t.name as team_name 
       FROM employments e
       LEFT JOIN firms f ON e.firm_id = f.id
       LEFT JOIN teams t ON e.team_id = t.id
       WHERE e.person_id = $1
       ORDER BY e.start_date DESC`,
      [personId]
    );
    return rows;
  }
};

module.exports = PeopleModel;
