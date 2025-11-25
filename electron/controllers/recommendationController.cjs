const { ipcMain } = require('electron');
const recommendationService = require('../services/recommendationService.cjs');

function registerRecommendationIpcHandlers() {
  ipcMain.handle('recommendation:create', async (_event, data) => {
    try {
      const recommendation = await recommendationService.create(data);
      return { success: true, recommendation };
    } catch (error) {
      console.error('[recommendationController] Error creating recommendation:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('recommendation:listByMandate', async (_event, mandateId) => {
    try {
      const recommendations = await recommendationService.listByMandate(mandateId);
      return { success: true, recommendations };
    } catch (error) {
      console.error('[recommendationController] Error listing recommendations:', error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle('recommendation:listByCandidate', async (_event, candidateId, mandateId) => {
    try {
      const recommendations = await recommendationService.listByCandidate(candidateId, mandateId);
      return { success: true, recommendations };
    } catch (error) {
      console.error('[recommendationController] Error listing candidate recommendations:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerRecommendationIpcHandlers
};
