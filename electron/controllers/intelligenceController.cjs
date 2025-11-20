const { ipcMain } = require("electron");
const intelligenceModel = require("../models/intelligenceModel.cjs");

/**
 * Intelligence Controller - IPC handlers for intelligence/edge/voice features
 */

function registerIntelligenceHandlers() {
  // ============= Firm Archetypes =============
  ipcMain.handle("intelligence:get-archetypes", async () => {
    try {
      const archetypes = await intelligenceModel.getAllArchetypes();
      // Parse JSON strings
      return archetypes.map(a => ({
        ...a,
        key_characteristics: a.key_characteristics ? JSON.parse(a.key_characteristics) : []
      }));
    } catch (error) {
      console.error("Error fetching archetypes:", error);
      throw error;
    }
  });

  // ============= Talent Segments =============
  ipcMain.handle("intelligence:get-talent-segments", async () => {
    try {
      const segments = await intelligenceModel.getAllTalentSegments();
      return segments.map(s => ({
        ...s,
        example_firms: s.example_firms ? JSON.parse(s.example_firms) : []
      }));
    } catch (error) {
      console.error("Error fetching talent segments:", error);
      throw error;
    }
  });

  // ============= Strategic Themes =============
  ipcMain.handle("intelligence:get-themes", async () => {
    try {
      return await intelligenceModel.getAllThemes();
    } catch (error) {
      console.error("Error fetching themes:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:get-candidate-theme-alignments", async () => {
    try {
      return await intelligenceModel.getCandidateThemeAlignments();
    } catch (error) {
      console.error("Error fetching candidate theme alignments:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:upsert-theme-alignment", async (event, data) => {
    try {
      return await intelligenceModel.upsertCandidateThemeAlignment(
        data.candidate_id,
        data.theme_id,
        data.band
      );
    } catch (error) {
      console.error("Error upserting theme alignment:", error);
      throw error;
    }
  });

  // ============= Market Hiring Windows =============
  ipcMain.handle("intelligence:get-hiring-windows", async () => {
    try {
      return await intelligenceModel.getAllHiringWindows();
    } catch (error) {
      console.error("Error fetching hiring windows:", error);
      throw error;
    }
  });

  // ============= Voice Notes =============
  ipcMain.handle("intelligence:get-voice-notes", async (event, filters) => {
    try {
      return await intelligenceModel.getAllVoiceNotes(filters);
    } catch (error) {
      console.error("Error fetching voice notes:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:get-voice-note", async (event, id) => {
    try {
      return await intelligenceModel.getVoiceNoteById(id);
    } catch (error) {
      console.error("Error fetching voice note:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:update-voice-note-status", async (event, { id, status }) => {
    try {
      return await intelligenceModel.updateVoiceNoteStatus(id, status);
    } catch (error) {
      console.error("Error updating voice note status:", error);
      throw error;
    }
  });

  // ============= Edge Export Views =============
  ipcMain.handle("intelligence:get-export-views", async () => {
    try {
      return await intelligenceModel.getAllExportViews();
    } catch (error) {
      console.error("Error fetching export views:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:toggle-export-view", async (event, { id, enabled }) => {
    try {
      return await intelligenceModel.toggleExportView(id, enabled);
    } catch (error) {
      console.error("Error toggling export view:", error);
      throw error;
    }
  });

  // ============= Edge Exports =============
  ipcMain.handle("intelligence:get-edge-exports", async (event, limit) => {
    try {
      return await intelligenceModel.getAllEdgeExports(limit);
    } catch (error) {
      console.error("Error fetching edge exports:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:create-edge-export", async (event, data) => {
    try {
      return await intelligenceModel.createEdgeExport(data);
    } catch (error) {
      console.error("Error creating edge export:", error);
      throw error;
    }
  });

  // ============= Deal Analytics =============
  ipcMain.handle("intelligence:get-deal-heat-index", async () => {
    try {
      return await intelligenceModel.getDealHeatIndex();
    } catch (error) {
      console.error("Error fetching deal heat index:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:get-deal-structure-overview", async () => {
    try {
      return await intelligenceModel.getDealStructureOverview();
    } catch (error) {
      console.error("Error fetching deal structure overview:", error);
      throw error;
    }
  });

  // ============= Intelligence Insights =============
  ipcMain.handle("intelligence:get-top-opportunities", async () => {
    try {
      return await intelligenceModel.getTopOpportunities();
    } catch (error) {
      console.error("Error fetching top opportunities:", error);
      throw error;
    }
  });

  ipcMain.handle("intelligence:get-mandate-risk-alerts", async () => {
    try {
      return await intelligenceModel.getMandateRiskAlerts();
    } catch (error) {
      console.error("Error fetching mandate risk alerts:", error);
      throw error;
    }
  });

  console.log("Intelligence IPC handlers registered");
}

module.exports = { registerIntelligenceHandlers };
