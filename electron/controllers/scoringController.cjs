const { ipcMain } = require("electron");
const {
  runFitForCandidateAgainstMandate,
  runFitForCandidateAgainstAllMandates,
  listMatchScoresForCandidate,
  listMatchScoresForMandate,
} = require("../models/scoringModel.cjs");

/**
 * Register scoring IPC handlers
 */
function registerScoringIpcHandlers() {
  /**
   * Run fit scoring for a candidate against a specific mandate
   */
  ipcMain.handle("scoring:runFitAgainstMandate", async (_event, { candidateId, mandateId }) => {
    try {
      const result = await runFitForCandidateAgainstMandate(candidateId, mandateId);
      return { success: true, result };
    } catch (error) {
      console.error("[scoringController] Error running fit scoring:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Run fit scoring for a candidate against all OPEN mandates
   */
  ipcMain.handle("scoring:runFitAgainstAllMandates", async (_event, candidateId) => {
    try {
      const results = await runFitForCandidateAgainstAllMandates(candidateId);
      return { success: true, results };
    } catch (error) {
      console.error("[scoringController] Error running fit scoring against all mandates:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get match scores for a candidate
   */
  ipcMain.handle("scoring:listMatchScoresForCandidate", async (_event, candidateId) => {
    try {
      const scores = await listMatchScoresForCandidate(candidateId);
      return { success: true, scores };
    } catch (error) {
      console.error("[scoringController] Error listing match scores for candidate:", error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Get match scores for a mandate
   */
  ipcMain.handle("scoring:listMatchScoresForMandate", async (_event, mandateId) => {
    try {
      const scores = await listMatchScoresForMandate(mandateId);
      return { success: true, scores };
    } catch (error) {
      console.error("[scoringController] Error listing match scores for mandate:", error);
      return { success: false, error: error.message };
    }
  });

  console.log("[scoringController] Scoring IPC handlers registered");
}

module.exports = { registerScoringIpcHandlers };
