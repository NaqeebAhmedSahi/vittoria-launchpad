const { ipcMain } = require('electron');
const employmentService = require('../services/employmentService.cjs');

function registerEmploymentIpcHandlers() {
  ipcMain.handle('employment:list', async (_event, filters) => {
    try {
      const employments = await employmentService.list(filters || {});
      return { success: true, employments };
    } catch (error) {
      console.error('[employmentController] Error listing employments:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employment:getById', async (_event, id) => {
    try {
      const employment = await employmentService.getById(id);
      return { success: true, employment };
    } catch (error) {
      console.error('[employmentController] Error getting employment:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employment:create', async (_event, data) => {
    try {
      const employment = await employmentService.create(data);
      return { success: true, employment };
    } catch (error) {
      console.error('[employmentController] Error creating employment:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employment:update', async (_event, id, data) => {
    try {
      const employment = await employmentService.update(id, data);
      return { success: true, employment };
    } catch (error) {
      console.error('[employmentController] Error updating employment:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('employment:delete', async (_event, id) => {
    try {
      await employmentService.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[employmentController] Error deleting employment:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[employmentController] Employment IPC handlers registered');
}

module.exports = {
  registerEmploymentIpcHandlers
};
