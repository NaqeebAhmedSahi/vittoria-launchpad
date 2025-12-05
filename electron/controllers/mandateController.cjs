const { ipcMain } = require("electron");
const {
  createMandate,
  getMandateById,
  listMandates,
  listMandatesPaged,
  updateMandate,
  deleteMandate,
  addCandidateToMandate,
  removeCandidateFromMandate,
  getMandateCandidates,
} = require("../models/mandateModel.cjs");

/**
 * Register mandate IPC handlers
 */
function registerMandateIpcHandlers() {
  /**
   * List mandates with optional filters
   */
  ipcMain.handle("mandate:list", async (_event, options = {}) => {
    try {
      const mandates = await listMandates(options);
      return { success: true, mandates };
    } catch (error) {
      console.error("[mandateController] Error listing mandates:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * List mandates with pagination and optional filters
   */
  ipcMain.handle("mandate:listPaged", async (_event, options = {}) => {
    try {
      const result = await listMandatesPaged(options);
      return { success: true, mandates: result.rows, total: result.total };
    } catch (error) {
      console.error("[mandateController] Error listing mandates (paged):", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get mandate by ID
   */
  ipcMain.handle("mandate:getById", async (_event, mandateId) => {
    try {
      const mandate = await getMandateById(mandateId);
      if (!mandate) {
        return { success: false, error: "Mandate not found" };
      }
      return { success: true, mandate };
    } catch (error) {
      console.error("[mandateController] Error getting mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Create a new mandate
   */
  ipcMain.handle("mandate:create", async (_event, mandateData) => {
    try {
      const mandateId = await createMandate(mandateData);
      return { success: true, mandateId };
    } catch (error) {
      console.error("[mandateController] Error creating mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Update an existing mandate
   */
  ipcMain.handle("mandate:update", async (_event, { mandateId, updates }) => {
    try {
      await updateMandate(mandateId, updates);
      return { success: true };
    } catch (error) {
      console.error("[mandateController] Error updating mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Delete a mandate
   */
  ipcMain.handle("mandate:delete", async (_event, mandateId) => {
    try {
      await deleteMandate(mandateId);
      return { success: true };
    } catch (error) {
      console.error("[mandateController] Error deleting mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Add a candidate to a mandate
   */
  ipcMain.handle("mandate:addCandidate", async (_event, { mandateId, candidateId }) => {
    try {
      const candidateIds = await addCandidateToMandate(mandateId, candidateId);
      return { success: true, candidateIds };
    } catch (error) {
      console.error("[mandateController] Error adding candidate to mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Remove a candidate from a mandate
   */
  ipcMain.handle("mandate:removeCandidate", async (_event, { mandateId, candidateId }) => {
    try {
      const candidateIds = await removeCandidateFromMandate(mandateId, candidateId);
      return { success: true, candidateIds };
    } catch (error) {
      console.error("[mandateController] Error removing candidate from mandate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get all candidates for a mandate
   */
  ipcMain.handle("mandate:getCandidates", async (_event, mandateId) => {
    try {
      const candidateIds = await getMandateCandidates(mandateId);
      return { success: true, candidateIds };
    } catch (error) {
      console.error("[mandateController] Error getting mandate candidates:", error);
      return { success: false, error: error.message };
    }
  });

  console.log("[mandateController] Mandate IPC handlers registered");
}

module.exports = { registerMandateIpcHandlers };
