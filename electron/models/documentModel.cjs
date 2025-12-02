// electron/models/documentModel.cjs
const db = require('../db/pgConnection.cjs');
const embeddingClient = require('../services/embeddingClient.cjs');

const DocumentModel = {
  /**
   * List all documents with optional filters
   * @param {Object} filters - { firm_id, mandate_id, candidate_id, category, uploaded_by, search }
   * @returns {Promise<Array>}
   */
  async list(filters = {}) {
    let query = `
      SELECT 
        d.*,
        p.first_name || ' ' || p.last_name as uploader_name,
        f.name as firm_name,
        m.name as mandate_name,
        c.name as candidate_name
      FROM documents d
      LEFT JOIN people p ON d.uploaded_by = p.id
      LEFT JOIN firms f ON d.firm_id = f.id
      LEFT JOIN mandates m ON d.mandate_id = m.id
      LEFT JOIN candidates c ON d.candidate_id = c.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.firm_id) {
      query += ` AND d.firm_id = $${paramCount++}`;
      params.push(filters.firm_id);
    }

    if (filters.mandate_id) {
      query += ` AND d.mandate_id = $${paramCount++}`;
      params.push(filters.mandate_id);
    }

    if (filters.candidate_id) {
      query += ` AND d.candidate_id = $${paramCount++}`;
      params.push(filters.candidate_id);
    }

    if (filters.category) {
      query += ` AND d.category = $${paramCount++}`;
      params.push(filters.category);
    }

    if (filters.uploaded_by) {
      query += ` AND d.uploaded_by = $${paramCount++}`;
      params.push(filters.uploaded_by);
    }

    if (filters.search) {
      query += ` AND (d.name ILIKE $${paramCount} OR d.description ILIKE $${paramCount})`;
      params.push(`%${filters.search}%`);
      paramCount++;
    }

    if (filters.related_entity_type && filters.related_entity_id) {
      query += ` AND d.related_entity_type = $${paramCount++} AND d.related_entity_id = $${paramCount++}`;
      params.push(filters.related_entity_type, filters.related_entity_id);
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get document by ID with related entity information
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const result = await db.query(
      `SELECT 
        d.*,
        p.first_name || ' ' || p.last_name as uploader_name,
        f.name as firm_name,
        m.name as mandate_name,
        c.name as candidate_name
      FROM documents d
      LEFT JOIN people p ON d.uploaded_by = p.id
      LEFT JOIN firms f ON d.firm_id = f.id
      LEFT JOIN mandates m ON d.mandate_id = m.id
      LEFT JOIN candidates c ON d.candidate_id = c.id
      WHERE d.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create a new document
   * @param {Object} data - Document data
   * @returns {Promise<number>} - New document ID
   */
  async create(data) {
    const result = await db.query(
      `INSERT INTO documents (
        name, description, file_path, file_type, file_size,
        category, tags, uploaded_by, related_entity_type, related_entity_id,
        firm_id, mandate_id, candidate_id, is_confidential
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING id`,
      [
        data.name,
        data.description || null,
        data.file_path,
        data.file_type || null,
        data.file_size || null,
        data.category || null,
        data.tags || null,
        data.uploaded_by || null,
        data.related_entity_type || null,
        data.related_entity_id || null,
        data.firm_id || null,
        data.mandate_id || null,
        data.candidate_id || null,
        data.is_confidential || false
      ]
    );
    const documentId = result.rows[0].id;

    // Generate and persist embedding
    try {
      const documentSummary = [
        data.name || '',
        data.description || '',
        data.category || '',
        data.file_type || '',
        Array.isArray(data.tags) ? data.tags.join(' ') : (data.tags || ''),
      ]
        .filter(Boolean)
        .join(' | ');

      await embeddingClient.generateAndPersistEmbedding(
        'documents',
        documentId,
        documentSummary,
        { source: 'document' }
      );
      console.log(`[documentModel] ✅ Generated embedding for document ${documentId}`);
    } catch (error) {
      console.error(`[documentModel] ⚠️ Failed to generate embedding for document ${documentId}:`, error.message);
    }

    return documentId;
  },

  /**
   * Update document metadata (not the file itself)
   * @param {number} id
   * @param {Object} data
   * @returns {Promise<void>}
   */
  async update(id, data) {
    const fields = [];
    const values = [];
    let paramCount = 1;

    if (data.name !== undefined) {
      fields.push(`name = $${paramCount++}`);
      values.push(data.name);
    }
    if (data.description !== undefined) {
      fields.push(`description = $${paramCount++}`);
      values.push(data.description);
    }
    if (data.category !== undefined) {
      fields.push(`category = $${paramCount++}`);
      values.push(data.category);
    }
    if (data.tags !== undefined) {
      fields.push(`tags = $${paramCount++}`);
      values.push(data.tags);
    }
    if (data.related_entity_type !== undefined) {
      fields.push(`related_entity_type = $${paramCount++}`);
      values.push(data.related_entity_type);
    }
    if (data.related_entity_id !== undefined) {
      fields.push(`related_entity_id = $${paramCount++}`);
      values.push(data.related_entity_id);
    }
    if (data.firm_id !== undefined) {
      fields.push(`firm_id = $${paramCount++}`);
      values.push(data.firm_id);
    }
    if (data.mandate_id !== undefined) {
      fields.push(`mandate_id = $${paramCount++}`);
      values.push(data.mandate_id);
    }
    if (data.candidate_id !== undefined) {
      fields.push(`candidate_id = $${paramCount++}`);
      values.push(data.candidate_id);
    }
    if (data.is_confidential !== undefined) {
      fields.push(`is_confidential = $${paramCount++}`);
      values.push(data.is_confidential);
    }

    if (fields.length === 0) return;

    values.push(id);
    await db.query(
      `UPDATE documents SET ${fields.join(', ')} WHERE id = $${paramCount}`,
      values
    );
  },

  /**
   * Delete a document (metadata only, actual file deletion should be handled separately)
   * @param {number} id
   * @returns {Promise<void>}
   */
  async delete(id) {
    try {
      const vectorStore = require('../services/vectorStore.cjs');
      // Delete embedding first
      await vectorStore.deleteEmbedding('documents', id);
      console.log(`✅ Deleted embedding for document ${id}`);
    } catch (error) {
      console.error(`⚠️ Failed to delete embedding:`, error.message);
    }

    await db.query('DELETE FROM documents WHERE id = $1', [id]);
  },

  /**
   * Get documents by entity (firm, mandate, or candidate)
   * @param {string} entityType - 'firm', 'mandate', or 'candidate'
   * @param {number} entityId
   * @returns {Promise<Array>}
   */
  async getByEntity(entityType, entityId) {
    let query = `
      SELECT 
        d.*,
        p.first_name || ' ' || p.last_name as uploader_name
      FROM documents d
      LEFT JOIN people p ON d.uploaded_by = p.id
      WHERE 
    `;

    switch (entityType) {
      case 'firm':
        query += 'd.firm_id = $1';
        break;
      case 'mandate':
        query += 'd.mandate_id = $1';
        break;
      case 'candidate':
        query += 'd.candidate_id = $1';
        break;
      default:
        throw new Error('Invalid entity type');
    }

    query += ' ORDER BY d.created_at DESC';

    const result = await db.query(query, [entityId]);
    return result.rows;
  },

  /**
   * Get document categories (distinct values)
   * @returns {Promise<Array<string>>}
   */
  async getCategories() {
    const result = await db.query(
      'SELECT DISTINCT category FROM documents WHERE category IS NOT NULL ORDER BY category'
    );
    return result.rows.map(row => row.category);
  }
};

module.exports = DocumentModel;
