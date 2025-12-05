// Employment model for managing employment history
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

const EmploymentModel = {
  async list(filters = {}) {
    let query = 'SELECT e.*, p.first_name, p.last_name, f.name as firm_name, t.name as team_name FROM employments e LEFT JOIN people p ON e.person_id = p.id LEFT JOIN firms f ON e.firm_id = f.id LEFT JOIN teams t ON e.team_id = t.id WHERE 1=1';
    const params = [];
    let paramIndex = 1;
    
    if (filters.person_id) {
      query += ` AND e.person_id = $${paramIndex++}`;
      params.push(filters.person_id);
    }
    
    if (filters.firm_id) {
      query += ` AND e.firm_id = $${paramIndex++}`;
      params.push(filters.firm_id);
    }
    
    if (filters.team_id) {
      query += ` AND e.team_id = $${paramIndex++}`;
      params.push(filters.team_id);
    }
    
    if (filters.status) {
      query += ` AND e.status = $${paramIndex++}`;
      params.push(filters.status);
    }
    
    query += ' ORDER BY e.start_date DESC';
    const { rows } = await db.query(query, params);
    return rows;
  },
  
  async getById(id) {
    const query = `
      SELECT e.*, p.first_name, p.last_name, f.name as firm_name, t.name as team_name 
      FROM employments e
      LEFT JOIN people p ON e.person_id = p.id
      LEFT JOIN firms f ON e.firm_id = f.id
      LEFT JOIN teams t ON e.team_id = t.id
      WHERE e.id = $1
    `;
    const { rows } = await db.query(query, [id]);
    return rows[0] || null;
  },
  
  async create(data) {
    const query = `
      INSERT INTO employments (person_id, firm_id, team_id, job_title, start_date, end_date, status)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    const params = [
      data.person_id,
      data.firm_id || null,
      data.team_id || null,
      data.job_title || null,
      data.start_date || null,
      data.end_date || null,
      data.status || 'Active'
    ];
    const { rows } = await db.query(query, params);
    const employment = rows[0];

    // Generate and persist embedding
    try {
      const employmentSummary = [
        data.job_title || '',
        data.start_date || '',
        data.end_date || '',
        data.status || 'Active',
      ]
        .filter(Boolean)
        .join(' | ');

      await embeddingClient.generateAndPersistEmbedding(
        'employments',
        employment.id,
        employmentSummary,
        { source: 'employment_record' }
      );
      console.log(`[employmentModel] ✅ Generated embedding for employment ${employment.id}`);
    } catch (error) {
      console.error(`[employmentModel] ⚠️ Failed to generate embedding for employment ${employment.id}:`, error.message);
    }

    return employment;
  },
  
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramIndex = 1;
    
    if (data.person_id !== undefined) {
      fields.push(`person_id = $${paramIndex++}`);
      values.push(data.person_id);
    }
    
    if (data.firm_id !== undefined) {
      fields.push(`firm_id = $${paramIndex++}`);
      values.push(data.firm_id);
    }
    
    if (data.team_id !== undefined) {
      fields.push(`team_id = $${paramIndex++}`);
      values.push(data.team_id);
    }
    
    if (data.job_title !== undefined) {
      fields.push(`job_title = $${paramIndex++}`);
      values.push(data.job_title);
    }
    
    if (data.start_date !== undefined) {
      fields.push(`start_date = $${paramIndex++}`);
      values.push(data.start_date);
    }
    
    if (data.end_date !== undefined) {
      fields.push(`end_date = $${paramIndex++}`);
      values.push(data.end_date);
    }
    
    if (data.status !== undefined) {
      fields.push(`status = $${paramIndex++}`);
      values.push(data.status);
    }
    
    if (fields.length === 0) {
      return await this.getById(id);
    }
    
    values.push(id);
    const query = `UPDATE employments SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
    const { rows } = await db.query(query, values);
    const employment = rows[0];

    // Update embedding if employment details changed
    const detailsChanged = data.job_title !== undefined || data.status !== undefined;
    if (detailsChanged) {
      try {
        const vectorStore = require('../services/vectorStore.cjs');
        const embeddingClient = require('../services/embeddingClient.cjs');
        const summary = [
          employment.job_title || '',
          employment.start_date ? `from ${employment.start_date}` : '',
          employment.end_date ? `to ${employment.end_date}` : '',
          employment.status || ''
        ].filter(Boolean).join(' | ');

        await embeddingClient.generateAndPersistEmbedding(
          'employments',
          id,
          summary,
          { source: 'employment_update' }
        );
        console.log(`✅ Updated embedding for employment ${id}`);
      } catch (error) {
        console.error(`⚠️ Failed to update embedding:`, error.message);
      }
    }

    return employment;
  },
  
  async delete(id) {
    try {
      const vectorStore = require('../services/vectorStore.cjs');
      // Delete embedding first
      await vectorStore.deleteEmbedding('employments', id);
      console.log(`✅ Deleted embedding for employment ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to delete embedding:`, error.message);
    }

    await db.query('DELETE FROM employments WHERE id = $1', [id]);
    return true;
  }
};

module.exports = EmploymentModel;
