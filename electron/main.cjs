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
    const { setCredentials, hasCredentials } = require('./db/pgConnection.cjs');
    const { getSetting } = require('./models/settingsModel.cjs');
    
    // Try to load credentials - this will work if PostgreSQL is already set up
    try {
      const dbHost = await getSetting('db_host');
      const dbPort = await getSetting('db_port');
      const dbName = await getSetting('db_name');
      const dbUsername = await getSetting('db_username');
      const dbPassword = await getSetting('db_password');
      
      if (dbHost && dbPort && dbName && dbUsername && dbPassword) {
        setCredentials({
          host: dbHost,
          port: dbPort,
          database: dbName,
          username: dbUsername,
          password: dbPassword
        });
        console.log('[main.cjs] PostgreSQL credentials loaded successfully');
      } else {
        console.log('[main.cjs] PostgreSQL credentials not found - setup will be required');
      }
    } catch (error) {
      console.log('[main.cjs] Could not load PostgreSQL credentials (setup required):', error.message);
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