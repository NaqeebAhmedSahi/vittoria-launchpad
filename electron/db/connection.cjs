const path = require("path");
const { app } = require("electron");
const sqlite3 = require("sqlite3").verbose();
const { open } = require("sqlite");

let dbPromise = null;

async function initDatabase() {
  // Re-use the same promise if already initialised
  if (dbPromise) return dbPromise;

  const dbPath = path.join(app.getPath("userData"), "vittoria.db");
  console.log("VITTORIA DB PATH =", dbPath);

  dbPromise = open({
    filename: dbPath,
    driver: sqlite3.Database,
  });

  const db = await dbPromise;

  //
  // 1) SETTINGS TABLE
  //
  await db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      key TEXT UNIQUE NOT NULL,
      value TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  //
  // 2) CV PATHS TABLE
  //
  await db.exec(`
    CREATE TABLE IF NOT EXISTS cv_paths (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      path TEXT NOT NULL,
      is_active INTEGER DEFAULT 1,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);

  // Insert default path if cv_paths table is empty
  const existingPaths = await db.get(
    "SELECT COUNT(*) as count FROM cv_paths"
  );

  if (existingPaths && existingPaths.count === 0) {
    const defaultPath = path.join(app.getPath("userData"), "cv_storage");
    await db.run(
      "INSERT INTO cv_paths (path, is_active, created_at, updated_at) VALUES (?, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)",
      defaultPath
    );
    console.log("Inserted default CV path:", defaultPath);
  }

  //
  // 3) INTAKE_FILES TABLE (ensure schema exists / is up to date)
  //
  const pragma = await db.all(`PRAGMA table_info(intake_files)`);

  const hasTable = pragma.length > 0;

  if (!hasTable) {
    // Table doesn't exist — create new schema
    await db.exec(`
      CREATE TABLE intake_files (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        file_name TEXT NOT NULL,
        file_path TEXT,
        candidate TEXT,
        type TEXT,
        source TEXT,
        uploaded_by TEXT,
        uploaded_at TEXT,
        status TEXT,
        variant TEXT,
        parsed_json TEXT,
        parsed_at TEXT,
        is_encrypted INTEGER DEFAULT 1,
        encryption_version TEXT DEFAULT 'aes-256-gcm-v1',
        created_at TEXT,
        updated_at TEXT
      );
    `);
  } else {
    // Table exists — ensure all columns are present
    const hasFilePath = pragma.some((col) => col.name === "file_path");
    if (!hasFilePath) {
      await db.exec(`ALTER TABLE intake_files ADD COLUMN file_path TEXT;`);
    }

    const hasParsedJson = pragma.some((col) => col.name === "parsed_json");
    if (!hasParsedJson) {
      await db.exec(`ALTER TABLE intake_files ADD COLUMN parsed_json TEXT;`);
    }

    const hasParsedAt = pragma.some((col) => col.name === "parsed_at");
    if (!hasParsedAt) {
      await db.exec(`ALTER TABLE intake_files ADD COLUMN parsed_at TEXT;`);
    }

    const hasIsEncrypted = pragma.some((col) => col.name === "is_encrypted");
    if (!hasIsEncrypted) {
      await db.exec(
        `ALTER TABLE intake_files ADD COLUMN is_encrypted INTEGER DEFAULT 1;`
      );
    }

    const hasEncryptionVersion = pragma.some(
      (col) => col.name === "encryption_version"
    );
    if (!hasEncryptionVersion) {
      await db.exec(
        `ALTER TABLE intake_files ADD COLUMN encryption_version TEXT DEFAULT 'aes-256-gcm-v1';`
      );
    }

    const hasCreatedAt = pragma.some((col) => col.name === "created_at");
    if (!hasCreatedAt) {
      // SQLite doesn't support CURRENT_TIMESTAMP in ALTER TABLE, use NULL default
      await db.exec(`ALTER TABLE intake_files ADD COLUMN created_at TEXT;`);
    }

    const hasUpdatedAt = pragma.some((col) => col.name === "updated_at");
    if (!hasUpdatedAt) {
      // SQLite doesn't support CURRENT_TIMESTAMP in ALTER TABLE, use NULL default
      await db.exec(`ALTER TABLE intake_files ADD COLUMN updated_at TEXT;`);
    }
  }

  //
  // 4) INITIALISE OTHER TABLES FOR CV PIPELINE (INTAKE / CANDIDATES / SCORING / AUTH)
  //    These functions should be idempotent (CREATE TABLE IF NOT EXISTS ...)
  //
  const { initIntakeFilesTable } = require("../models/intakeModel.cjs");
  const { initCandidatesTable } = require("../models/candidateModel.cjs");
  const { initMatchScoresTable } = require("../models/scoringModel.cjs");
  const { initUsersTable } = require("../models/authModel.cjs");
  const { initFirmsTable } = require("../models/firmModel.cjs");
  const { initMandatesTable } = require("../models/mandateModel.cjs");

  // Pass db if those initialisers accept it; otherwise they can import this
  await initFirmsTable(db);
  await initMandatesTable(db);
  await initIntakeFilesTable(db);
  await initCandidatesTable(db);
  await initMatchScoresTable(db);
  await initUsersTable(db);

  return db;
}

/**
 * Get the database instance (for models to use)
 */
async function getDb() {
  return await initDatabase();
}

module.exports = initDatabase;
module.exports.getDb = getDb;
