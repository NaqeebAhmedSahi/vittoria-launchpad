// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query } = require("../db/pgConnection.cjs");
const embeddingClient = require("../services/embeddingClient.cjs");

/**
 * Initialize firms table (PostgreSQL)
 * NOTE: Table creation is handled by databaseInitializer.cjs during setup
 */
async function initFirmsTable() {
  console.log("[firmModel] Table creation handled by setup wizard");
}

/**
 * Helper: Parse JSON fields from DB row (PostgreSQL)
 * Handles both JSONB (already parsed) and TEXT (needs parsing) from migration
 */
function parseFirmRow(row) {
  if (!row) return null;
  
  // Helper to safely parse JSON field
  const parseJsonField = (field) => {
    if (!field) return [];
    // If already an array (JSONB), return as-is
    if (Array.isArray(field)) return field;
    // If string, try to parse
    if (typeof field === 'string') {
      try {
        const parsed = JSON.parse(field);
        return Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        // Handle legacy SQLite comma-separated strings
        console.warn(`[firmModel] Invalid JSON, treating as comma-separated: ${field}`);
        return field.split(',').map(s => s.trim()).filter(s => s);
      }
    }
    return [];
  };
  
  return {
    id: row.id,
    name: row.name,
    short_name: row.short_name || null,
    sector_focus: parseJsonField(row.sector_focus),
    asset_classes: parseJsonField(row.asset_classes),
    regions: parseJsonField(row.regions),
    platform_type: row.platform_type || null,
    website: row.website || null,
    notes_text: row.notes_text || null,
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Helper: Serialize firm data for DB insert/update (PostgreSQL)
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

// ============================================================
// SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// ============================================================
// const { getDb } = require("../db/connection.cjs");
//
// async function initFirmsTable(db) {
//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS firms (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       short_name TEXT,
//       sector_focus TEXT,
//       asset_classes TEXT,
//       regions TEXT,
//       platform_type TEXT,
//       website TEXT,
//       notes_text TEXT,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP
//     );
//   `);
//   console.log("[firmModel] firms table initialized");
// }
//
// function parseFirmRow(row) {
//   if (!row) return null;
//   return {
//     id: row.id,
//     name: row.name,
//     short_name: row.short_name || null,
//     sector_focus: row.sector_focus ? JSON.parse(row.sector_focus) : [],
//     asset_classes: row.asset_classes ? JSON.parse(row.asset_classes) : [],
//     regions: row.regions ? JSON.parse(row.regions) : [],
//     platform_type: row.platform_type || null,
//     website: row.website || null,
//     notes_text: row.notes_text || null,
//     created_at: row.created_at,
//     updated_at: row.updated_at,
//   };
// }
//
// function serializeFirmData(data) {
//   return {
//     name: data.name,
//     short_name: data.short_name || null,
//     sector_focus: data.sector_focus ? JSON.stringify(data.sector_focus) : JSON.stringify([]),
//     asset_classes: data.asset_classes ? JSON.stringify(data.asset_classes) : JSON.stringify([]),
//     regions: data.regions ? JSON.stringify(data.regions) : JSON.stringify([]),
//     platform_type: data.platform_type || null,
//     website: data.website || null,
//     notes_text: data.notes_text || null,
//   };
// }
// ============================================================

/**
 * Create a new firm (PostgreSQL)
 */
async function createFirm(data) {
  const serialized = serializeFirmData(data);

  const result = await query(
    `INSERT INTO firms (name, short_name, sector_focus, asset_classes, regions, platform_type, website, notes_text)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
     RETURNING id`,
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

  const firmId = result.rows[0].id;
  console.log(`[firmModel] Created firm: ${data.name} (ID: ${firmId})`);

  // Generate and persist embedding for semantic search
  try {
    const firmSummary = [
      data.name || '',
      data.short_name || '',
      Array.isArray(data.sector_focus) ? data.sector_focus.join(' ') : (data.sector_focus || ''),
      Array.isArray(data.asset_classes) ? data.asset_classes.join(' ') : (data.asset_classes || ''),
      Array.isArray(data.regions) ? data.regions.join(' ') : (data.regions || ''),
      data.platform_type || '',
      data.notes_text || '',
    ]
      .filter(Boolean)
      .join(' | ');

    await embeddingClient.generateAndPersistEmbedding(
      'firms',
      firmId,
      firmSummary,
      { source: 'firm_profile' }
    );
    console.log(`[firmModel] ✅ Generated embedding for firm ${firmId}`);
  } catch (error) {
    console.error(`[firmModel] ⚠️ Failed to generate embedding for firm ${firmId}:`, error.message);
  }

  return firmId;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function createFirm(data) {
//   const db = await getDb();
//   const serialized = serializeFirmData(data);
//
//   const result = await db.run(
//     `INSERT INTO firms (name, short_name, sector_focus, asset_classes, regions, platform_type, website, notes_text)
//      VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       serialized.name,
//       serialized.short_name,
//       serialized.sector_focus,
//       serialized.asset_classes,
//       serialized.regions,
//       serialized.platform_type,
//       serialized.website,
//       serialized.notes_text,
//     ]
//   );
//
//   console.log(`[firmModel] Created firm: ${data.name} (ID: ${result.lastID})`);
//   return result.lastID;
// }
// ============================================================

/**
 * Get firm by ID (PostgreSQL)
 */
async function getFirmById(id) {
  const result = await query(`SELECT * FROM firms WHERE id = $1`, [id]);
  return parseFirmRow(result.rows[0]);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getFirmById(id) {
//   const db = await getDb();
//   const row = await db.get(`SELECT * FROM firms WHERE id = ?`, [id]);
//   return parseFirmRow(row);
// }
// ============================================================

/**
 * List all firms (PostgreSQL)
 */
async function listFirms() {
  const result = await query(`SELECT * FROM firms ORDER BY name ASC`);
  return result.rows.map(parseFirmRow);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function listFirms() {
//   const db = await getDb();
//   const rows = await db.all(`SELECT * FROM firms ORDER BY name ASC`);
//   return rows.map(parseFirmRow);
// }
// ============================================================

/**
 * Update firm by ID (PostgreSQL)
 */
async function updateFirm(id, data) {
  const serialized = serializeFirmData(data);

  const profileFieldsChanged = [
    'name',
    'short_name',
    'sector_focus',
    'asset_classes',
    'regions',
    'platform_type',
    'notes_text',
  ].some(field => data[field] !== undefined);

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(serialized.name);
  }
  if (data.short_name !== undefined) {
    fields.push(`short_name = $${paramIndex++}`);
    values.push(serialized.short_name);
  }
  if (data.sector_focus !== undefined) {
    fields.push(`sector_focus = $${paramIndex++}`);
    values.push(serialized.sector_focus);
  }
  if (data.asset_classes !== undefined) {
    fields.push(`asset_classes = $${paramIndex++}`);
    values.push(serialized.asset_classes);
  }
  if (data.regions !== undefined) {
    fields.push(`regions = $${paramIndex++}`);
    values.push(serialized.regions);
  }
  if (data.platform_type !== undefined) {
    fields.push(`platform_type = $${paramIndex++}`);
    values.push(serialized.platform_type);
  }
  if (data.website !== undefined) {
    fields.push(`website = $${paramIndex++}`);
    values.push(serialized.website);
  }
  if (data.notes_text !== undefined) {
    fields.push(`notes_text = $${paramIndex++}`);
    values.push(serialized.notes_text);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await query(
    `UPDATE firms SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  console.log(`[firmModel] Updated firm ID: ${id}`);

  if (profileFieldsChanged) {
    try {
      const result = await query('SELECT * FROM firms WHERE id = $1', [id]);
      const firm = result.rows[0];
      if (firm) {
        const firmSummary = [
          firm.name || '',
          firm.short_name || '',
          firm.sector_focus || '',
          firm.asset_classes || '',
          firm.regions || '',
          firm.platform_type || '',
          firm.notes_text || '',
        ]
          .filter(Boolean)
          .join(' | ');

        await embeddingClient.generateAndPersistEmbedding(
          'firms',
          id,
          firmSummary,
          { source: 'firm_update' }
        );
        console.log(`[firmModel] ✅ Regenerated embedding for firm ${id}`);
      }
    } catch (error) {
      console.error(`[firmModel] ⚠️ Failed to regenerate embedding for firm ${id}:`, error.message);
    }
  }
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function updateFirm(id, data) {
//   const db = await getDb();
//   const serialized = serializeFirmData(data);
//
//   const fields = [];
//   const values = [];
//
//   if (data.name !== undefined) {
//     fields.push("name = ?");
//     values.push(serialized.name);
//   }
//   if (data.short_name !== undefined) {
//     fields.push("short_name = ?");
//     values.push(serialized.short_name);
//   }
//   if (data.sector_focus !== undefined) {
//     fields.push("sector_focus = ?");
//     values.push(serialized.sector_focus);
//   }
//   if (data.asset_classes !== undefined) {
//     fields.push("asset_classes = ?");
//     values.push(serialized.asset_classes);
//   }
//   if (data.regions !== undefined) {
//     fields.push("regions = ?");
//     values.push(serialized.regions);
//   }
//   if (data.platform_type !== undefined) {
//     fields.push("platform_type = ?");
//     values.push(serialized.platform_type);
//   }
//   if (data.website !== undefined) {
//     fields.push("website = ?");
//     values.push(serialized.website);
//   }
//   if (data.notes_text !== undefined) {
//     fields.push("notes_text = ?");
//     values.push(serialized.notes_text);
//   }
//
//   fields.push("updated_at = CURRENT_TIMESTAMP");
//   values.push(id);
//
//   await db.run(
//     `UPDATE firms SET ${fields.join(", ")} WHERE id = ?`,
//     values
//   );
//
//   console.log(`[firmModel] Updated firm ID: ${id}`);
// }
// ============================================================

/**
 * Delete firm by ID (PostgreSQL)
 */
async function deleteFirm(id) {
  try {
    const vectorStore = require('../services/vectorStore.cjs');
    // Delete embedding first
    await vectorStore.deleteEmbedding('firms', id);
    console.log(`✅ Deleted embedding for firm ${id}`);
  } catch (error) {
    console.error(`⚠️ Failed to delete embedding:`, error.message);
  }

  await query(`DELETE FROM firms WHERE id = $1`, [id]);
  console.log(`[firmModel] Deleted firm ID: ${id}`);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function deleteFirm(id) {
//   const db = await getDb();
//   await db.run(`DELETE FROM firms WHERE id = ?`, [id]);
//   console.log(`[firmModel] Deleted firm ID: ${id}`);
// }
// ============================================================

module.exports = {
  initFirmsTable,
  createFirm,
  getFirmById,
  listFirms,
  updateFirm,
  deleteFirm,
};
