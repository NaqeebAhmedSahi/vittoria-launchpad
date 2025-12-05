const { ipcMain } = require('electron');
const sourceService = require('../services/sourceService.cjs');

function registerSourceIpcHandlers() {
  ipcMain.handle('source:list', async () => {
    try {
      const sources = await sourceService.list();
      return { success: true, sources };
    } catch (error) {
      console.error('[sourceController] Error listing sources:', error);
      return { success: false, error: error.message };
    }
  });

	ipcMain.handle('source:listPaged', async (_event, filters) => {
		try {
			const result = await sourceService.listPaged(filters || {});
			return { success: true, sources: result.rows, total: result.total };
		} catch (error) {
			console.error('[sourceController] Error listing sources (paged):', error);
			return { success: false, error: error.message };
		}
	});

  ipcMain.handle('source:getById', async (_event, id) => {
    try {
      const source = await sourceService.getById(id);
      const pattern = await sourceService.getOrgPattern();
      return { 
        success: true, 
        source,
        org_pattern: pattern
      };
    } catch (error) {
      console.error('[sourceController] Error getting source:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('source:create', async (_event, data) => {
    try {
      const source = await sourceService.create(data);
      return { success: true, source };
    } catch (error) {
      console.error('[sourceController] Error creating source:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('source:getOrgPattern', async () => {
    try {
      const pattern = await sourceService.getOrgPattern();
      return { success: true, pattern };
    } catch (error) {
      console.error('[sourceController] Error getting org pattern:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('source:importHistorical', async (_event, rows) => {
    try {
      const result = await sourceService.importHistoricalData(rows);
      return result;
    } catch (error) {
      console.error('[sourceController] Error importing historical data:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('source:bulkUpdate', async (_event, updates) => {
    try {
      const result = await sourceService.bulkUpdate(updates);
      return result;
    } catch (error) {
      console.error('[sourceController] Error bulk updating sources:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerSourceIpcHandlers,
};
