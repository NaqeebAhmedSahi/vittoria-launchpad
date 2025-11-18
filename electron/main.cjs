// electron/main.cjs
const { app, BrowserWindow } = require("electron");
const path = require("path");

// Load environment variables from .env.local (ENCRYPTION_KEY, etc.)
require("dotenv").config({ path: path.join(__dirname, "../.env.local") });

const { registerIntakeIpcHandlers } = require("./controllers/intakeController.cjs");
const { registerSettingsIpcHandlers } = require("./controllers/settingsController.cjs");
const { registerCandidateIpcHandlers } = require("./controllers/candidateController.cjs");
const { registerAuthIpcHandlers } = require("./controllers/authController.cjs");
const { registerFirmIpcHandlers } = require("./controllers/firmController.cjs");
const { registerMandateIpcHandlers } = require("./controllers/mandateController.cjs");
const { registerScoringIpcHandlers } = require("./controllers/scoringController.cjs");

const isDev = process.env.NODE_ENV === "development";

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, "preload.cjs"),
    },
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    win.webContents.openDevTools();
  } else {
    win.loadFile(path.join(__dirname, "../dist/index.html"));
  }
}

app.whenReady().then(() => {
  // register IPC handlers before window loads
  registerAuthIpcHandlers();
  registerFirmIpcHandlers();
  registerMandateIpcHandlers();
  registerIntakeIpcHandlers();
  registerSettingsIpcHandlers();
  registerCandidateIpcHandlers();
  registerScoringIpcHandlers();
  createWindow();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});