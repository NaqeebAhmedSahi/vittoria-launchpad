const { ipcMain } = require('electron');
const teamService = require('../services/teamService.cjs');

function registerTeamIpcHandlers() {
  ipcMain.handle('team:list', async (_event, firmId) => {
    try {
      const teams = await teamService.list(firmId);
      return { success: true, teams };
    } catch (error) {
      console.error('[teamController] Error listing teams:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:listPaged', async (_event, filters) => {
    try {
      const result = await teamService.listPaged(filters || {});
      return { success: true, teams: result.rows, total: result.total };
    } catch (error) {
      console.error('[teamController] Error listing teams (paged):', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:getById', async (_event, id) => {
    try {
      const team = await teamService.getById(id);
      return { success: true, team };
    } catch (error) {
      console.error('[teamController] Error getting team:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:create', async (_event, data) => {
    try {
      const team = await teamService.create(data);
      return { success: true, team };
    } catch (error) {
      console.error('[teamController] Error creating team:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:update', async (_event, params) => {
    try {
      console.log('[teamController] Update params:', JSON.stringify(params));
      const { id, data } = params;
      console.log('[teamController] Destructured - id:', id, 'data:', JSON.stringify(data));
      const team = await teamService.update(id, data);
      return { success: true, team };
    } catch (error) {
      console.error('[teamController] Error updating team:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:delete', async (_event, id) => {
    try {
      await teamService.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[teamController] Error deleting team:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('team:getMembers', async (_event, teamId) => {
    try {
      const members = await teamService.getTeamMembers(teamId);
      return { success: true, members };
    } catch (error) {
      console.error('[teamController] Error getting team members:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[teamController] Team IPC handlers registered');
}

module.exports = {
  registerTeamIpcHandlers
};
