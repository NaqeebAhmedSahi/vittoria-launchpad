const { ipcMain } = require("electron");
const {
  getSetting,
  setSetting,
  getCVStoragePath,
  getAllCVPaths,
  setCVStoragePath,
} = require("../models/settingsModel.cjs");
const { ensureModelLoaded } = require("../services/llmAdapter.cjs");

function registerSettingsIpcHandlers() {
  ipcMain.handle("settings:getSetting", async (_event, key) => {
    return getSetting(key);
  });

  ipcMain.handle("settings:setSetting", async (_event, key, value) => {
    return setSetting(key, value);
  });

  ipcMain.handle("settings:getCVStoragePath", async () => {
    return getCVStoragePath();
  });

  ipcMain.handle("settings:getAllCVPaths", async () => {
    return getAllCVPaths();
  });

  ipcMain.handle("settings:setCVStoragePath", async (_event, cvPath) => {
    return setCVStoragePath(cvPath);
  });

  // Active LLM model (read-only selection of best pro model per provider)
  ipcMain.handle("llm:activeModel", async () => {
    try {
      const raw = await getSetting('llm_providers');
      let providerName = null;
      if (raw) {
        const map = typeof raw === 'string' ? JSON.parse(raw) : raw;
        const activeEntry = Object.entries(map || {}).find(([, info]) => info && info.isActive);
        if (activeEntry) providerName = activeEntry[0];
      }
      if (!providerName) {
        // fallback to openai if key present
        const openaiKey = await getSetting('openai_api_key');
        if (openaiKey) providerName = 'openai';
      }
      if (providerName === 'google') return 'gemini-2.5-pro';
      // default / openai
      return 'gpt-4o';
    } catch (e) {
      return 'gpt-4o';
    }
  });

  ipcMain.handle("llm:ensureModelLoaded", async (_event, { provider, model, baseUrl }) => {
    try {
      const result = await ensureModelLoaded(provider, model, baseUrl);
      // Create a completely new plain object for IPC serialization
      // This ensures no SDK objects leak through the promise chain
      const success = result && result.success === true;
      const error = result && result.error ? String(result.error) : null;
      return JSON.parse(JSON.stringify({ success, error }));
    } catch (err) {
      return { success: false, error: err && err.message ? String(err.message) : 'Unknown error' };
    }
  });
}

module.exports = {
  registerSettingsIpcHandlers,
};
