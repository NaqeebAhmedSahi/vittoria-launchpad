// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query } = require("../db/pgConnection.cjs");
const path = require("path");
const fs = require("fs");
const { app } = require("electron");

/**
 * Get settings by key (PostgreSQL)
 */
async function getSetting(key) {
  try {
    const result = await query(
      "SELECT value FROM settings WHERE key = $1",
      [key]
    );
    return result.rows.length > 0 ? result.rows[0].value : null;
  } catch (error) {
    console.log('[settingsModel] getSetting error:', error.message);
    return null;
  }
}

/**
 * Set settings by key (PostgreSQL)
 */
async function setSetting(key, value) {
  try {
    await query(
      `INSERT INTO settings (key, value, created_at, updated_at) 
       VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
       ON CONFLICT (key) 
       DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
      [key, value]
    );
    return value;
  } catch (error) {
    console.error('[settingsModel] setSetting error:', error.message);
    throw error;
  }
}

// ============================================================
// POSTGRESQL VERSION (COMMENTED OUT - FOR FUTURE MIGRATION)
// After setup is complete, settings could be moved to PostgreSQL
// ============================================================
// const { query } = require("../db/pgConnection.cjs");
//
// async function getSetting(key) {
//   try {
//     const result = await query(
//       "SELECT value FROM settings WHERE key = $1",
//       [key]
//     );
//     return result.rows.length > 0 ? result.rows[0].value : null;
//   } catch (error) {
//     console.log('[settingsModel] getSetting error:', error.message);
//     return null;
//   }
// }
//
// async function setSetting(key, value) {
//   await query(
//     `INSERT INTO settings (key, value, created_at, updated_at) 
//      VALUES ($1, $2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)
//      ON CONFLICT (key) 
//      DO UPDATE SET value = $2, updated_at = CURRENT_TIMESTAMP`,
//     [key, value]
//   );
//   return value;
// }
// ============================================================
//   return value;
// }
// ============================================================

/**
 * Get active CV storage path from settings table (PostgreSQL)
 */
async function getCVStoragePath() {
  try {
    // Try to get CV path from settings
    const cvPath = await getSetting('cv_storage_path');
    
    if (cvPath && fs.existsSync(cvPath)) {
      return cvPath;
    }
  } catch (error) {
    console.log('[settingsModel] No CV path in settings, using default');
  }

  // Fallback to default if no path found or doesn't exist
  const defaultPath = path.join(app.getPath("userData"), "cv_storage");

  // Ensure directory exists
  if (!fs.existsSync(defaultPath)) {
    fs.mkdirSync(defaultPath, { recursive: true });
    console.log("Created CV storage directory:", defaultPath);
  }

  // Save the default path to settings for future use
  try {
    await setSetting('cv_storage_path', defaultPath);
  } catch (error) {
    console.error('[settingsModel] Failed to save CV path:', error.message);
  }

  return defaultPath;
}

/**
 * Get all CV paths (PostgreSQL)
 * Note: For PostgreSQL, we only store one path in settings table
 * This function returns it in array format for compatibility
 */
async function getAllCVPaths() {
  try {
    const currentPath = await getSetting('cv_storage_path');
    if (currentPath) {
      return [{ id: 1, path: currentPath, is_active: true }];
    }
  } catch (error) {
    console.log('[settingsModel] No CV path found');
  }
  return [];
}

/**
 * Set CV storage path and create directory if needed (PostgreSQL)
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

  // Store path in settings table
  await setSetting('cv_storage_path', expandedPath);

  return expandedPath;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getCVStoragePath() {
//   const db = await initDatabase();
//   const row = await db.get(
//     "SELECT path FROM cv_paths WHERE is_active = 1 LIMIT 1"
//   );
//   let cvPath = row ? row.path : null;
//   if (!cvPath) {
//     cvPath = path.join(app.getPath("userData"), "cv_storage");
//   }
//   if (!fs.existsSync(cvPath)) {
//     fs.mkdirSync(cvPath, { recursive: true });
//   }
//   return cvPath;
// }
//
// async function getAllCVPaths() {
//   const db = await initDatabase();
//   return db.all("SELECT id, path, is_active FROM cv_paths ORDER BY created_at DESC");
// }
//
// async function setCVStoragePath(cvPath) {
//   const expandedPath = cvPath.startsWith("~")
//     ? cvPath.replace("~", app.getPath("home"))
//     : cvPath;
//   if (!fs.existsSync(expandedPath)) {
//     fs.mkdirSync(expandedPath, { recursive: true });
//   }
//   const db = await initDatabase();
//   await db.run("UPDATE cv_paths SET is_active = 0");
//   await db.run(
//     "INSERT INTO cv_paths (path, is_active, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
//     expandedPath
//   );
//   return expandedPath;
// }
// ============================================================

module.exports = {
  getSetting,
  setSetting,
  getCVStoragePath,
  getAllCVPaths,
  setCVStoragePath,
};
