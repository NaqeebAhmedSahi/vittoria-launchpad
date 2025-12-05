// electron/controllers/migrationController.cjs
// IPC handlers for database migrations
// Allows frontend to trigger migrations programmatically

const migrationRunner = require('../services/migrationRunner.cjs');
const { ipcMain } = require('electron');

/**
 * Register migration IPC handlers
 */
function registerMigrationHandlers() {
  console.log('[migrationController] Registering migration IPC handlers');

  /**
   * Run all migrations
   */
  ipcMain.handle('migration:run-all', async (event) => {
    console.log('[migrationController] IPC: migration:run-all');
    try {
      const result = await migrationRunner.runAllMigrations();
      return {
        success: result.success,
        applied: result.applied,
        skipped: result.skipped,
        failed: result.failed,
        message: `Applied: ${result.applied.length}, Skipped: ${result.skipped.length}, Failed: ${result.failed.length}`
      };
    } catch (error) {
      console.error('[migrationController] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Run specific migration
   */
  ipcMain.handle('migration:run-specific', async (event, migrationName) => {
    console.log(`[migrationController] IPC: migration:run-specific (${migrationName})`);
    try {
      const result = await migrationRunner.runMigration(migrationName);
      return {
        success: result.success,
        message: result.message,
        statements: result.statements,
        skipped: result.skipped
      };
    } catch (error) {
      console.error('[migrationController] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Initialize database (run all migrations + setup)
   */
  ipcMain.handle('migration:initialize-db', async (event) => {
    console.log('[migrationController] IPC: migration:initialize-db');
    try {
      const result = await migrationRunner.initializeDatabase();
      return {
        success: result.success,
        details: result.details,
        error: result.error
      };
    } catch (error) {
      console.error('[migrationController] Error:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Check if migration is applied
   */
  ipcMain.handle('migration:is-applied', async (event, migrationName) => {
    console.log(`[migrationController] IPC: migration:is-applied (${migrationName})`);
    try {
      const isApplied = await migrationRunner.isMigrationApplied(migrationName);
      return {
        success: true,
        isApplied
      };
    } catch (error) {
      console.error('[migrationController] Error:', error);
      return {
        success: false,
        error: error.message,
        isApplied: false
      };
    }
  });

  console.log('[migrationController] ✅ Migration IPC handlers registered');
}

module.exports = {
  registerMigrationHandlers
};
