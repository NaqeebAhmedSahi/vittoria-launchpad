const { ipcMain } = require('electron');
const peopleService = require('../services/peopleService.cjs');

function registerPeopleIpcHandlers() {
  ipcMain.handle('people:list', async (_event, filters) => {
    try {
      const people = await peopleService.list(filters || {});
      return { success: true, people };
    } catch (error) {
      console.error('[peopleController] Error listing people:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('people:getById', async (_event, id) => {
    try {
      const person = await peopleService.getById(id);
      return { success: true, person };
    } catch (error) {
      console.error('[peopleController] Error getting person:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('people:create', async (_event, data) => {
    try {
      const person = await peopleService.create(data);
      return { success: true, person };
    } catch (error) {
      console.error('[peopleController] Error creating person:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('people:update', async (_event, params) => {
    try {
      console.log('[peopleController] Update params:', JSON.stringify(params));
      const { id, data } = params;
      console.log('[peopleController] Destructured - id:', id, 'data:', JSON.stringify(data));
      const person = await peopleService.update(id, data);
      return { success: true, person };
    } catch (error) {
      console.error('[peopleController] Error updating person:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('people:delete', async (_event, id) => {
    try {
      await peopleService.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[peopleController] Error deleting person:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('people:getEmploymentHistory', async (_event, personId) => {
    try {
      const history = await peopleService.getEmploymentHistory(personId);
      return { success: true, history };
    } catch (error) {
      console.error('[peopleController] Error getting employment history:', error);
      return { success: false, error: error.message };
    }
  });
  
  console.log('[peopleController] People IPC handlers registered');
}

module.exports = {
  registerPeopleIpcHandlers
};
