// electron/models/auditModel.cjs
const db = require('../db/pgConnection.cjs');

const AuditModel = {
  /**
   * List audit logs with optional filters
   * @param {Object} filters - { entity_type, entity_id, performed_by, action, start_date, end_date }
   * @returns {Promise<Array>}
   */
  async list(filters = {}) {
    let query = `
      SELECT 
        al.*,
        p.first_name || ' ' || p.last_name as performer_name
      FROM audit_log al
      LEFT JOIN people p ON al.performed_by = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (filters.entity_type) {
      query += ` AND al.entity_type = $${paramCount++}`;
      params.push(filters.entity_type);
    }

    if (filters.entity_id) {
      query += ` AND al.entity_id = $${paramCount++}`;
      params.push(filters.entity_id);
    }

    if (filters.performed_by) {
      query += ` AND al.performed_by = $${paramCount++}`;
      params.push(filters.performed_by);
    }

    if (filters.action) {
      query += ` AND al.action = $${paramCount++}`;
      params.push(filters.action);
    }

    if (filters.start_date) {
      query += ` AND al.timestamp >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND al.timestamp <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    query += ' ORDER BY al.timestamp DESC LIMIT 1000';

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get audit log by ID
   * @param {number} id
   * @returns {Promise<Object|null>}
   */
  async getById(id) {
    const result = await db.query(
      `SELECT 
        al.*,
        p.first_name || ' ' || p.last_name as performer_name
      FROM audit_log al
      LEFT JOIN people p ON al.performed_by = p.id
      WHERE al.id = $1`,
      [id]
    );
    return result.rows[0] || null;
  },

  /**
   * Create audit log entry
   * @param {Object} data
   * @returns {Promise<number>} - New log ID
   */
  async create(data) {
    const result = await db.query(
      `INSERT INTO audit_log (
        entity_type, entity_id, action, performed_by,
        changes, ip_address, user_agent
      ) VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id`,
      [
        data.entity_type,
        data.entity_id,
        data.action,
        data.performed_by || null,
        data.changes ? JSON.stringify(data.changes) : null,
        data.ip_address || null,
        data.user_agent || null
      ]
    );
    return result.rows[0].id;
  },

  /**
   * Get audit logs for a specific entity
   * @param {string} entityType
   * @param {number} entityId
   * @returns {Promise<Array>}
   */
  async getByEntity(entityType, entityId) {
    const result = await db.query(
      `SELECT 
        al.*,
        p.first_name || ' ' || p.last_name as performer_name
      FROM audit_log al
      LEFT JOIN people p ON al.performed_by = p.id
      WHERE al.entity_type = $1 AND al.entity_id = $2
      ORDER BY al.timestamp DESC`,
      [entityType, entityId]
    );
    return result.rows;
  },

  /**
   * Get activity summary by user
   * @param {number} userId
   * @param {Object} filters - { start_date, end_date }
   * @returns {Promise<Array>}
   */
  async getUserActivity(userId, filters = {}) {
    let query = `
      SELECT 
        action,
        entity_type,
        COUNT(*) as count
      FROM audit_log
      WHERE performed_by = $1
    `;
    const params = [userId];
    let paramCount = 2;

    if (filters.start_date) {
      query += ` AND timestamp >= $${paramCount++}`;
      params.push(filters.start_date);
    }

    if (filters.end_date) {
      query += ` AND timestamp <= $${paramCount++}`;
      params.push(filters.end_date);
    }

    query += ' GROUP BY action, entity_type ORDER BY count DESC';

    const result = await db.query(query, params);
    return result.rows;
  },

  /**
   * Get recent activity across all entities
   * @param {number} limit
   * @returns {Promise<Array>}
   */
  async getRecentActivity(limit = 50) {
    const result = await db.query(
      `SELECT 
        al.*,
        p.first_name || ' ' || p.last_name as performer_name
      FROM audit_log al
      LEFT JOIN people p ON al.performed_by = p.id
      ORDER BY al.timestamp DESC
      LIMIT $1`,
      [limit]
    );
    return result.rows;
  },

  /**
   * Delete old audit logs (data retention)
   * @param {Date} beforeDate
   * @returns {Promise<number>} - Number of deleted records
   */
  async deleteOldLogs(beforeDate) {
    const result = await db.query(
      'DELETE FROM audit_log WHERE timestamp < $1',
      [beforeDate]
    );
    return result.rowCount;
  }
};

module.exports = AuditModel;
