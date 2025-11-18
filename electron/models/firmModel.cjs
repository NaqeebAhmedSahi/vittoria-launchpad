const { getDb } = require("../db/connection.cjs");

/**
 * Initialize firms table
 */
async function initFirmsTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS firms (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      short_name TEXT,
      sector_focus TEXT,      -- store as JSON string
      asset_classes TEXT,     -- store as JSON string
      regions TEXT,           -- store as JSON string
      platform_type TEXT,
      website TEXT,
      notes_text TEXT,
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP
    );
  `);
  console.log("[firmModel] firms table initialized");
}

/**
 * Helper: Parse JSON fields from DB row
 */
function parseFirmRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    short_name: row.short_name || null,
    sector_focus: row.sector_focus ? JSON.parse(row.sector_focus) : [],
    asset_classes: row.asset_classes ? JSON.parse(row.asset_classes) : [],
    regions: row.regions ? JSON.parse(row.regions) : [],
    platform_type: row.platform_type || null,
    website: row.website || null,
    notes_text: row.notes_text || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Helper: Serialize firm data for DB insert/update
 */
function serializeFirmData(data) {
  return {
    name: data.name,
    short_name: data.short_name || null,
    sector_focus: data.sector_focus ? JSON.stringify(data.sector_focus) : JSON.stringify([]),
    asset_classes: data.asset_classes ? JSON.stringify(data.asset_classes) : JSON.stringify([]),
    regions: data.regions ? JSON.stringify(data.regions) : JSON.stringify([]),
    platform_type: data.platform_type || null,
    website: data.website || null,
    notes_text: data.notes_text || null,
  };
}

/**
 * Create a new firm
 */
async function createFirm(data) {
  const db = await getDb();
  const serialized = serializeFirmData(data);

  const result = await db.run(
    `INSERT INTO firms (name, short_name, sector_focus, asset_classes, regions, platform_type, website, notes_text)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      serialized.name,
      serialized.short_name,
      serialized.sector_focus,
      serialized.asset_classes,
      serialized.regions,
      serialized.platform_type,
      serialized.website,
      serialized.notes_text,
    ]
  );

  console.log(`[firmModel] Created firm: ${data.name} (ID: ${result.lastID})`);
  return result.lastID;
}

/**
 * Get firm by ID
 */
async function getFirmById(id) {
  const db = await getDb();
  const row = await db.get(`SELECT * FROM firms WHERE id = ?`, [id]);
  return parseFirmRow(row);
}

/**
 * List all firms
 */
async function listFirms() {
  const db = await getDb();
  const rows = await db.all(`SELECT * FROM firms ORDER BY name ASC`);
  return rows.map(parseFirmRow);
}

/**
 * Update firm by ID
 */
async function updateFirm(id, data) {
  const db = await getDb();
  const serialized = serializeFirmData(data);

  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(serialized.name);
  }
  if (data.short_name !== undefined) {
    fields.push("short_name = ?");
    values.push(serialized.short_name);
  }
  if (data.sector_focus !== undefined) {
    fields.push("sector_focus = ?");
    values.push(serialized.sector_focus);
  }
  if (data.asset_classes !== undefined) {
    fields.push("asset_classes = ?");
    values.push(serialized.asset_classes);
  }
  if (data.regions !== undefined) {
    fields.push("regions = ?");
    values.push(serialized.regions);
  }
  if (data.platform_type !== undefined) {
    fields.push("platform_type = ?");
    values.push(serialized.platform_type);
  }
  if (data.website !== undefined) {
    fields.push("website = ?");
    values.push(serialized.website);
  }
  if (data.notes_text !== undefined) {
    fields.push("notes_text = ?");
    values.push(serialized.notes_text);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.run(
    `UPDATE firms SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  console.log(`[firmModel] Updated firm ID: ${id}`);
}

/**
 * Delete firm by ID
 */
async function deleteFirm(id) {
  const db = await getDb();
  await db.run(`DELETE FROM firms WHERE id = ?`, [id]);
  console.log(`[firmModel] Deleted firm ID: ${id}`);
}

module.exports = {
  initFirmsTable,
  createFirm,
  getFirmById,
  listFirms,
  updateFirm,
  deleteFirm,
};
