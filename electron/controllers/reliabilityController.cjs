const { ipcMain } = require("electron");
const reliabilityService = require("../services/reliabilityService.cjs");

function registerReliabilityIpcHandlers() {
  ipcMain.handle("reliability:listSources", async () => {
    try {
      const response = await reliabilityService.listSources();
      return { success: true, ...response };
    } catch (error) {
      console.error("[reliabilityController] Error listing sources:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('reliability:getSourceDetail', async (_event, sourceId) => {
    try {
      const detail = await reliabilityService.getSourceDetail(sourceId);
      return { success: true, detail };
    } catch (error) {
      console.error("[reliabilityController] Error fetching source detail:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerReliabilityIpcHandlers,
};





