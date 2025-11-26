// electron/services/auditService.cjs
const AuditModel = require('../models/auditModel.cjs');

const AuditService = {
  async list(filters) {
    return await AuditModel.list(filters);
  },

  async getById(id) {
    return await AuditModel.getById(id);
  },

  async create(data) {
    return await AuditModel.create(data);
  },

  async getByEntity(entityType, entityId) {
    return await AuditModel.getByEntity(entityType, entityId);
  },

  async getUserActivity(userId, filters) {
    return await AuditModel.getUserActivity(userId, filters);
  },

  async getRecentActivity(limit) {
    return await AuditModel.getRecentActivity(limit);
  },

  async deleteOldLogs(beforeDate) {
    return await AuditModel.deleteOldLogs(beforeDate);
  },

  /**
   * Log an action (convenience method)
   * @param {string} entityType
   * @param {number} entityId
   * @param {string} action - 'CREATE', 'UPDATE', 'DELETE', 'VIEW'
   * @param {number} performedBy
   * @param {Object} changes
   * @returns {Promise<number>}
   */
  async log(entityType, entityId, action, performedBy, changes = null) {
    return await AuditModel.create({
      entity_type: entityType,
      entity_id: entityId,
      action,
      performed_by: performedBy,
      changes
    });
  }
};

module.exports = AuditService;
