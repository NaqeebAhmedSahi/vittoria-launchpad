const { ipcMain } = require("electron");
const {
  listIntakeFiles,
  listIntakeFilesPaged,
  createIntakeFiles,
  updateIntakeStatus,
  updateParsedJson,
  previewIntakeFile,
  handleCvUpload,
  createCandidateFromIntake,
} = require("../models/intakeModel.cjs");

function registerIntakeIpcHandlers() {
  ipcMain.handle("intake:list", async () => {
    return listIntakeFiles();
  });

  ipcMain.handle("intake:listPaged", async (_event, options) => {
    return listIntakeFilesPaged(options || {});
  });

  ipcMain.handle("intake:addFiles", async (_event, files) => {
    return createIntakeFiles(files);
  });

  ipcMain.handle("intake:updateStatus", async (_event, payload) => {
    const { id, status } = payload;
    return updateIntakeStatus(id, status);
  });

  ipcMain.handle("intake:updateParsedJson", async (_event, { intakeId, updatedJson, reScore }) => {
    return updateParsedJson(intakeId, updatedJson, reScore);
  });

  ipcMain.handle("intake:preview", async (_event, id) => {
    return previewIntakeFile(id);
  });

  ipcMain.handle("intake:parseAndGenerate", async (_event, id) => {
    // Lazy require to avoid circular issues
    const { parseAndGenerateJson } = require("../models/intakeModel.cjs");
    return parseAndGenerateJson(id);
  });

    // Full CV upload pipeline: parse, score, create candidate, compute fit
    ipcMain.handle("intake:processCV", async (_event, intakeId) => {
      return handleCvUpload(intakeId);
    });

    // Manually create candidate from intake file
    ipcMain.handle("intake:createCandidate", async (_event, intakeId) => {
      return createCandidateFromIntake(intakeId);
    });
}

module.exports = {
  registerIntakeIpcHandlers,
};
