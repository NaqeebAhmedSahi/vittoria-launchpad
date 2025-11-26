const { ipcMain } = require("electron");
const {
  listCandidates,
  getCandidateById,
  updateCandidate,
  approveCandidate,
  rejectCandidate,
  deferCandidate,
  searchCandidates,
  deleteCandidate,
  createCandidate,
  addMandateToCandidate,
  removeMandateFromCandidate,
  getCandidateMandates,
} = require("../models/candidateModel.cjs");

function registerCandidateIpcHandlers() {
  ipcMain.handle("candidate:list", async (_event, status = null) => {
    return listCandidates(status);
  });

  ipcMain.handle("candidate:getById", async (_event, candidateId) => {
    return getCandidateById(candidateId);
  });

  ipcMain.handle("candidate:update", async (_event, { candidateId, updates }) => {
    return updateCandidate(candidateId, updates);
  });

  ipcMain.handle("candidate:approve", async (_event, candidateId) => {
    return approveCandidate(candidateId);
  });

  ipcMain.handle("candidate:reject", async (_event, candidateId) => {
    return rejectCandidate(candidateId);
  });

  ipcMain.handle("candidate:defer", async (_event, { candidateId, reason, reminderDate }) => {
    return deferCandidate(candidateId, reason, reminderDate);
  });

  ipcMain.handle("candidate:search", async (_event, searchTerm) => {
    return searchCandidates(searchTerm);
  });

  ipcMain.handle("candidate:delete", async (_event, candidateId) => {
    return deleteCandidate(candidateId);
  });

  // NEW: create candidate from manual form
  ipcMain.handle("candidate:create", async (_event, candidateData) => {
    return createCandidate(candidateData);
  });

  // NEW: manage candidate-mandate associations
  ipcMain.handle("candidate:addMandate", async (_event, { candidateId, mandateId }) => {
    try {
      const mandateIds = await addMandateToCandidate(candidateId, mandateId);
      return { success: true, mandateIds };
    } catch (error) {
      console.error("[candidateController] Error adding mandate:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("candidate:removeMandate", async (_event, { candidateId, mandateId }) => {
    try {
      const mandateIds = await removeMandateFromCandidate(candidateId, mandateId);
      return { success: true, mandateIds };
    } catch (error) {
      console.error("[candidateController] Error removing mandate:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("candidate:getMandates", async (_event, candidateId) => {
    try {
      const mandateIds = await getCandidateMandates(candidateId);
      return { success: true, mandateIds };
    } catch (error) {
      console.error("[candidateController] Error getting mandates:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerCandidateIpcHandlers,
};
