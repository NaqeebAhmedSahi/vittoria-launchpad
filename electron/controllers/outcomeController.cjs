const { ipcMain } = require("electron");
const outcomeService = require("../services/outcomeService.cjs");

function registerOutcomeIpcHandlers() {
  ipcMain.handle("outcome:create", async (_event, payload) => {
    try {
      const outcome = await outcomeService.create(payload);
      return { success: true, outcome };
    } catch (error) {
      console.error("[outcomeController] Error creating outcome:", error);
      return { success: false, error: error.message };
    }
  });

  ipcMain.handle("outcome:listByMandate", async (_event, mandateId) => {
    try {
      const data = await outcomeService.listByMandate(mandateId);
      return { success: true, data };
    } catch (error) {
      console.error("[outcomeController] Error listing outcomes:", error);
      return { success: false, error: error.message };
    }
  });
}

module.exports = {
  registerOutcomeIpcHandlers,
};







