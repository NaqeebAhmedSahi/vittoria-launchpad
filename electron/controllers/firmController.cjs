const { ipcMain } = require("electron");
const {
  createFirm,
  getFirmById,
  listFirms,
  listFirmsPaged,
  updateFirm,
  deleteFirm,
} = require("../models/firmModel.cjs");

/**
 * Register firm IPC handlers
 */
function registerFirmIpcHandlers() {
  /**
   * List all firms
   */
  ipcMain.handle("firm:list", async () => {
    try {
      const firms = await listFirms();
      return { success: true, firms };
    } catch (error) {
      console.error("[firmController] Error listing firms:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * List firms with pagination
   */
  ipcMain.handle("firm:listPaged", async (_event, options = {}) => {
    try {
      const result = await listFirmsPaged(options || {});
      return { success: true, firms: result.rows, total: result.total };
    } catch (error) {
      console.error("[firmController] Error listing firms (paged):", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get firm by ID
   */
  ipcMain.handle("firm:getById", async (_event, firmId) => {
    try {
      const firm = await getFirmById(firmId);
      if (!firm) {
        return { success: false, error: "Firm not found" };
      }
      return { success: true, firm };
    } catch (error) {
      console.error("[firmController] Error getting firm:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Create a new firm
   */
  ipcMain.handle("firm:create", async (_event, firmData) => {
    try {
      const firmId = await createFirm(firmData);
      return { success: true, firmId };
    } catch (error) {
      console.error("[firmController] Error creating firm:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update an existing firm
   */
  ipcMain.handle("firm:update", async (_event, { firmId, updates }) => {
    try {
      await updateFirm(firmId, updates);
      return { success: true };
    } catch (error) {
      console.error("[firmController] Error updating firm:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete a firm
   */
  ipcMain.handle("firm:delete", async (_event, firmId) => {
    try {
      await deleteFirm(firmId);
      return { success: true };
    } catch (error) {
      console.error("[firmController] Error deleting firm:", error);
      return { success: false, error: error.message };
    }
  });

  console.log("[firmController] Firm IPC handlers registered");
}

module.exports = { registerFirmIpcHandlers };
