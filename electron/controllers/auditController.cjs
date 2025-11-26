// electron/controllers/auditController.cjs
const { ipcMain } = require('electron');
const AuditService = require('../services/auditService.cjs');

function registerAuditIpcHandlers() {
  // List audit logs
  ipcMain.handle('audit:list', async (_event, filters) => {
    try {
      const logs = await AuditService.list(filters || {});
      return { success: true, logs };
    } catch (error) {
      console.error('[auditController] Error listing audit logs:', error);
      return { success: false, error: error.message };
    }
  });

  // Get audit log by ID
  ipcMain.handle('audit:getById', async (_event, id) => {
    try {
      const log = await AuditService.getById(id);
      return { success: true, log };
    } catch (error) {
      console.error('[auditController] Error getting audit log:', error);
      return { success: false, error: error.message };
    }
  });

  // Create audit log
  ipcMain.handle('audit:create', async (_event, data) => {
    try {
      const logId = await AuditService.create(data);
      return { success: true, logId };
    } catch (error) {
      console.error('[auditController] Error creating audit log:', error);
      return { success: false, error: error.message };
    }
  });

  // Log action (convenience method)
  ipcMain.handle('audit:log', async (_event, { entityType, entityId, action, performedBy, changes }) => {
    try {
      const logId = await AuditService.log(entityType, entityId, action, performedBy, changes);
      return { success: true, logId };
    } catch (error) {
      console.error('[auditController] Error logging action:', error);
      return { success: false, error: error.message };
    }
  });

  // Get logs by entity
  ipcMain.handle('audit:getByEntity', async (_event, { entityType, entityId }) => {
    try {
      const logs = await AuditService.getByEntity(entityType, entityId);
      return { success: true, logs };
    } catch (error) {
      console.error('[auditController] Error getting logs by entity:', error);
      return { success: false, error: error.message };
    }
  });

  // Get user activity
  ipcMain.handle('audit:getUserActivity', async (_event, { userId, filters }) => {
    try {
      const activity = await AuditService.getUserActivity(userId, filters || {});
      return { success: true, activity };
    } catch (error) {
      console.error('[auditController] Error getting user activity:', error);
      return { success: false, error: error.message };
    }
  });

  // Get recent activity
  ipcMain.handle('audit:getRecentActivity', async (_event, limit) => {
    try {
      const activity = await AuditService.getRecentActivity(limit || 50);
      return { success: true, activity };
    } catch (error) {
      console.error('[auditController] Error getting recent activity:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete old logs
  ipcMain.handle('audit:deleteOldLogs', async (_event, beforeDate) => {
    try {
      const deletedCount = await AuditService.deleteOldLogs(beforeDate);
      return { success: true, deletedCount };
    } catch (error) {
      console.error('[auditController] Error deleting old logs:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[auditController] Audit IPC handlers registered');
}

module.exports = { registerAuditIpcHandlers };
