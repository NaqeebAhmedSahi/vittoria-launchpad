const initDatabase = require("../db/connection.cjs");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

/**
 * Get settings by key
 */
async function getSetting(key) {
  const db = await initDatabase();
  const row = await db.get(
    "SELECT value FROM settings WHERE key = ?",
    key
  );
  return row ? row.value : null;
}

/**
 * Set settings by key
 */
async function setSetting(key, value) {
  const db = await initDatabase();
  
  // Check if setting exists
  const existing = await db.get(
    "SELECT id FROM settings WHERE key = ?",
    key
  );

  if (existing) {
    await db.run(
      "UPDATE settings SET value = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?",
      value,
      key
    );
  } else {
    await db.run(
      "INSERT INTO settings (key, value, created_at, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      key,
      value
    );
  }

  return value;
}

/**
 * Get active CV storage path from cv_paths table
 */
async function getCVStoragePath() {
  const db = await initDatabase();
  
  // Get the active CV path
  const row = await db.get(
    "SELECT path FROM cv_paths WHERE is_active = 1 LIMIT 1"
  );

  let cvPath = row ? row.path : null;

  if (!cvPath) {
    // Fallback to default if no active path found
    cvPath = path.join(app.getPath("userData"), "cv_storage");
  }

  // Ensure directory exists
  if (!fs.existsSync(cvPath)) {
    fs.mkdirSync(cvPath, { recursive: true });
    console.log("Created CV storage directory:", cvPath);
  }

  return cvPath;
}

/**
 * Get all CV paths
 */
async function getAllCVPaths() {
  const db = await initDatabase();
  return db.all("SELECT id, path, is_active FROM cv_paths ORDER BY created_at DESC");
}

/**
 * Set CV storage path and create directory if needed
 */
async function setCVStoragePath(cvPath) {
  // Validate path
  if (!cvPath || typeof cvPath !== "string") {
    throw new Error("Invalid CV storage path");
  }

  // Expand tilde if present
  const expandedPath = cvPath.startsWith("~")
    ? cvPath.replace("~", app.getPath("home"))
    : cvPath;

  // Create directory if it doesn't exist
  if (!fs.existsSync(expandedPath)) {
    fs.mkdirSync(expandedPath, { recursive: true });
    console.log("Created CV storage directory:", expandedPath);
  }

  // Update cv_paths table: deactivate old paths and add new one
  const db = await initDatabase();
  await db.run("UPDATE cv_paths SET is_active = 0");
  await db.run(
    "INSERT INTO cv_paths (path, is_active, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
    expandedPath
  );

  return expandedPath;
}

module.exports = {
  getSetting,
  setSetting,
  getCVStoragePath,
  getAllCVPaths,
  setCVStoragePath,
};
