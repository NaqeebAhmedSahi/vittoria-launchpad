// electron/controllers/operationsSettingsController.cjs
const { ipcMain } = require('electron');
const operationsSettingsModel = require('../models/operationsSettingsModel.cjs');

function setupOperationsSettingsHandlers() {
  // Get all mailboxes
  ipcMain.handle('operationsSettings:getAllMailboxes', async (event) => {
    try {
      const mailboxes = await operationsSettingsModel.getAllMailboxes();
      return { success: true, mailboxes };
    } catch (error) {
      console.error('[operationsSettingsController] Error getting mailboxes:', error);
      return { success: false, error: error.message };
    }
  });

  // Update mailbox access
  ipcMain.handle('operationsSettings:updateMailboxAccess', async (event, { email, access }) => {
    try {
      const mailbox = await operationsSettingsModel.updateMailboxAccess(email, access);
      return { success: true, mailbox };
    } catch (error) {
      console.error('[operationsSettingsController] Error updating mailbox access:', error);
      return { success: false, error: error.message };
    }
  });

  // Get all integrations
  ipcMain.handle('operationsSettings:getAllIntegrations', async (event) => {
    try {
      const integrations = await operationsSettingsModel.getAllIntegrations();
      return { success: true, integrations };
    } catch (error) {
      console.error('[operationsSettingsController] Error getting integrations:', error);
      return { success: false, error: error.message };
    }
  });

  // Update integration status
  ipcMain.handle('operationsSettings:updateIntegrationStatus', async (event, { name, status }) => {
    try {
      const integration = await operationsSettingsModel.updateIntegrationStatus(name, status);
      return { success: true, integration };
    } catch (error) {
      console.error('[operationsSettingsController] Error updating integration status:', error);
      return { success: false, error: error.message };
    }
  });

  // Get user preferences
  ipcMain.handle('operationsSettings:getPreferences', async (event) => {
    try {
      const preferences = await operationsSettingsModel.getUserPreferences();
      return { success: true, preferences };
    } catch (error) {
      console.error('[operationsSettingsController] Error getting preferences:', error);
      return { success: false, error: error.message };
    }
  });

  // Update user preferences
  ipcMain.handle('operationsSettings:updatePreferences', async (event, preferences) => {
    try {
      const updatedPreferences = await operationsSettingsModel.updateUserPreferences(preferences);
      return { success: true, preferences: updatedPreferences };
    } catch (error) {
      console.error('[operationsSettingsController] Error updating preferences:', error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = { setupOperationsSettingsHandlers };
