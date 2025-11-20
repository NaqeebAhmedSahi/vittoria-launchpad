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
const { registerSetupIpcHandlers } = require("./setup/setupController.cjs");
const { registerIntelligenceHandlers } = require("./controllers/intelligenceController.cjs");

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

app.whenReady().then(async () => {
  console.log('[main.cjs] ===== APP READY - STARTING INITIALIZATION =====');
  
  // Initialize PostgreSQL connection with stored credentials (if they exist)
  console.log('[main.cjs] Step 0: Initializing PostgreSQL connection...');
  try {
    const { setCredentials } = require('./db/pgConnection.cjs');
    const fs = require('fs');
    const path = require('path');
    
    // Try to load credentials from local file
    const credentialsPath = path.join(app.getPath('userData'), 'pg-credentials.json');
    
    if (fs.existsSync(credentialsPath)) {
      try {
        const data = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(data);
        
        if (credentials.host && credentials.database && credentials.username) {
          setCredentials(credentials);
          console.log('[main.cjs] PostgreSQL credentials loaded from local file');
        } else {
          console.log('[main.cjs] Invalid credentials file - setup will be required');
        }
      } catch (error) {
        console.log('[main.cjs] Error reading credentials file:', error.message);
      }
    } else {
      console.log('[main.cjs] No credentials file found - setup will be required');
    }
  } catch (error) {
    console.error('[main.cjs] Error initializing PostgreSQL:', error);
  }
  
  // register IPC handlers before window loads
  console.log('[main.cjs] Step 1: Registering Setup IPC handlers...');
  registerSetupIpcHandlers();
  
  console.log('[main.cjs] Step 2: Registering Auth IPC handlers...');
  registerAuthIpcHandlers();
  
  console.log('[main.cjs] Step 3: Registering Firm IPC handlers...');
  registerFirmIpcHandlers();
  
  console.log('[main.cjs] Step 4: Registering Mandate IPC handlers...');
  registerMandateIpcHandlers();
  
  console.log('[main.cjs] Step 5: Registering Intake IPC handlers...');
  registerIntakeIpcHandlers();
  
  console.log('[main.cjs] Step 6: Registering Settings IPC handlers...');
  registerSettingsIpcHandlers();
  
  console.log('[main.cjs] Step 7: Registering Candidate IPC handlers...');
  registerCandidateIpcHandlers();
  
  console.log('[main.cjs] Step 8: Registering Scoring IPC handlers...');
  registerScoringIpcHandlers();
  
  console.log('[main.cjs] Step 9: Creating main window...');
  createWindow();
  
  console.log('[main.cjs] ===== INITIALIZATION COMPLETE =====');

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});