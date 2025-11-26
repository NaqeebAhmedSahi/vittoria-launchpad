// electron/controllers/financeController.cjs
const { ipcMain } = require('electron');
const FinanceService = require('../services/financeService.cjs');

function registerFinanceIpcHandlers() {
  // List transactions
  ipcMain.handle('finance:list', async (_event, filters) => {
    try {
      const transactions = await FinanceService.list(filters || {});
      return { success: true, transactions };
    } catch (error) {
      console.error('[financeController] Error listing transactions:', error);
      return { success: false, error: error.message };
    }
  });

  // Get transaction by ID
  ipcMain.handle('finance:getById', async (_event, id) => {
    try {
      const transaction = await FinanceService.getById(id);
      return { success: true, transaction };
    } catch (error) {
      console.error('[financeController] Error getting transaction:', error);
      return { success: false, error: error.message };
    }
  });

  // Create transaction
  ipcMain.handle('finance:create', async (_event, data) => {
    try {
      const transactionId = await FinanceService.create(data);
      return { success: true, transactionId };
    } catch (error) {
      console.error('[financeController] Error creating transaction:', error);
      return { success: false, error: error.message };
    }
  });

  // Update transaction
  ipcMain.handle('finance:update', async (_event, { id, data }) => {
    try {
      await FinanceService.update(id, data);
      return { success: true };
    } catch (error) {
      console.error('[financeController] Error updating transaction:', error);
      return { success: false, error: error.message };
    }
  });

  // Delete transaction
  ipcMain.handle('finance:delete', async (_event, id) => {
    try {
      await FinanceService.delete(id);
      return { success: true };
    } catch (error) {
      console.error('[financeController] Error deleting transaction:', error);
      return { success: false, error: error.message };
    }
  });

  // Get summary
  ipcMain.handle('finance:getSummary', async (_event, filters) => {
    try {
      const summary = await FinanceService.getSummary(filters || {});
      return { success: true, summary };
    } catch (error) {
      console.error('[financeController] Error getting summary:', error);
      return { success: false, error: error.message };
    }
  });

  // Get categories
  ipcMain.handle('finance:getCategories', async () => {
    try {
      const categories = await FinanceService.getCategories();
      return { success: true, categories };
    } catch (error) {
      console.error('[financeController] Error getting categories:', error);
      return { success: false, error: error.message };
    }
  });

  console.log('[financeController] Finance IPC handlers registered');
}

module.exports = { registerFinanceIpcHandlers };
