// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query } = require("../db/pgConnection.cjs");

/**
 * Helper: Safely parse JSON field (handles JSONB, TEXT, and legacy comma-separated strings)
 */
function safeParseJsonField(field) {
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
      console.warn(`[mandateModel] Invalid JSON, treating as comma-separated: ${field}`);
      return field.split(',').map(s => s.trim()).filter(s => s);
    }
  }
  return [];
}

/**
 * Initialize mandates table (PostgreSQL)
 * NOTE: Table creation is handled by databaseInitializer.cjs during setup
 */
async function initMandatesTable() {
  console.log("[mandateModel] Table creation handled by setup wizard");
}

/**
 * Helper: Parse JSON fields from DB row (PostgreSQL)
 */
function parseMandateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    firm_id: row.firm_id,
    location: row.location || null,
    primary_sector: row.primary_sector || null,
    sectors: safeParseJsonField(row.sectors),
    functions: safeParseJsonField(row.functions),
    asset_classes: safeParseJsonField(row.asset_classes),
    regions: safeParseJsonField(row.regions),
    seniority_min: row.seniority_min || null,
    seniority_max: row.seniority_max || null,
    status: row.status || "OPEN",
    candidate_ids: safeParseJsonField(row.candidate_ids),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Helper: Serialize mandate data for DB insert/update (PostgreSQL)
 */
function serializeMandateData(data) {
  return {
    name: data.name,
    firm_id: data.firm_id,
    location: data.location || null,
    primary_sector: data.primary_sector || null,
    sectors: data.sectors ? JSON.stringify(data.sectors) : JSON.stringify([]),
    functions: data.functions ? JSON.stringify(data.functions) : JSON.stringify([]),
    asset_classes: data.asset_classes ? JSON.stringify(data.asset_classes) : JSON.stringify([]),
    regions: data.regions ? JSON.stringify(data.regions) : JSON.stringify([]),
    seniority_min: data.seniority_min || null,
    seniority_max: data.seniority_max || null,
    status: data.status || "OPEN",
  };
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// ============================================================
// const { getDb } = require("../db/connection.cjs");
//
// async function initMandatesTable(db) {
//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS mandates (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT NOT NULL,
//       firm_id INTEGER NOT NULL,
//       location TEXT,
//       primary_sector TEXT,
//       sectors TEXT,
//       functions TEXT,
//       asset_classes TEXT,
//       regions TEXT,
//       seniority_min TEXT,
//       seniority_max TEXT,
//       status TEXT DEFAULT 'OPEN',
//       raw_brief TEXT,
//       candidate_ids TEXT DEFAULT '[]',
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
//     );
//     CREATE INDEX IF NOT EXISTS idx_mandates_firm ON mandates(firm_id);
//     CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);
//   `);
//   try {
//     await db.exec(`ALTER TABLE mandates ADD COLUMN candidate_ids TEXT DEFAULT '[]';`);
//   } catch (e) {
//     // Column already exists
//   }
//   console.log("[mandateModel] mandates table initialized");
// }
//
// function parseMandateRow(row) {
//   if (!row) return null;
//   return {
//     id: row.id,
//     name: row.name,
//     firm_id: row.firm_id,
//     location: row.location || null,
//     primary_sector: row.primary_sector || null,
//     sectors: row.sectors ? JSON.parse(row.sectors) : [],
//     functions: row.functions ? JSON.parse(row.functions) : [],
//     asset_classes: row.asset_classes ? JSON.parse(row.asset_classes) : [],
//     regions: row.regions ? JSON.parse(row.regions) : [],
//     seniority_min: row.seniority_min || null,
//     seniority_max: row.seniority_max || null,
//     status: row.status || "OPEN",
//     raw_brief: row.raw_brief || null,
//     candidate_ids: row.candidate_ids ? JSON.parse(row.candidate_ids) : [],
//     created_at: row.created_at,
//     updated_at: row.updated_at,
//   };
// }
//
// function serializeMandateData(data) {
//   return {
//     name: data.name,
//     firm_id: data.firm_id,
//     location: data.location || null,
//     primary_sector: data.primary_sector || null,
//     sectors: data.sectors ? JSON.stringify(data.sectors) : JSON.stringify([]),
//     functions: data.functions ? JSON.stringify(data.functions) : JSON.stringify([]),
//     asset_classes: data.asset_classes ? JSON.stringify(data.asset_classes) : JSON.stringify([]),
//     regions: data.regions ? JSON.stringify(data.regions) : JSON.stringify([]),
//     seniority_min: data.seniority_min || null,
//     seniority_max: data.seniority_max || null,
//     status: data.status || "OPEN",
//     raw_brief: data.raw_brief || null,
//   };
// }
// ============================================================

/**
 * Create a new mandate (PostgreSQL)
 */
async function createMandate(data) {
  const serialized = serializeMandateData(data);

  const result = await query(
    `INSERT INTO mandates (
      name, firm_id, location, primary_sector, sectors, functions, 
      asset_classes, regions, seniority_min, seniority_max, status
    )
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
    RETURNING id`,
    [
      serialized.name,
      serialized.firm_id,
      serialized.location,
      serialized.primary_sector,
      serialized.sectors,
      serialized.functions,
      serialized.asset_classes,
      serialized.regions,
      serialized.seniority_min,
      serialized.seniority_max,
      serialized.status,
    ]
  );

  console.log(`[mandateModel] Created mandate: ${data.name} (ID: ${result.rows[0].id})`);
  return result.rows[0].id;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function createMandate(data) {
//   const db = await getDb();
//   const serialized = serializeMandateData(data);
//
//   const result = await db.run(
//     `INSERT INTO mandates (
//       name, firm_id, location, primary_sector, sectors, functions, 
//       asset_classes, regions, seniority_min, seniority_max, status, raw_brief
//     )
//     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       serialized.name,
//       serialized.firm_id,
//       serialized.location,
//       serialized.primary_sector,
//       serialized.sectors,
//       serialized.functions,
//       serialized.asset_classes,
//       serialized.regions,
//       serialized.seniority_min,
//       serialized.seniority_max,
//       serialized.status,
//       serialized.raw_brief,
//     ]
//   );
//
//   console.log(`[mandateModel] Created mandate: ${data.name} (ID: ${result.lastID})`);
//   return result.lastID;
// }
// ============================================================

/**
 * Get mandate by ID (PostgreSQL)
 */
async function getMandateById(id) {
  const result = await query(`SELECT * FROM mandates WHERE id = $1`, [id]);
  return parseMandateRow(result.rows[0]);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getMandateById(id) {
//   const db = await getDb();
//   const row = await db.get(`SELECT * FROM mandates WHERE id = ?`, [id]);
//   return parseMandateRow(row);
// }
// ============================================================

/**
 * List mandates with optional filters (PostgreSQL)
 */
async function listMandates(options = {}) {
  let sql = `SELECT * FROM mandates WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (options.firm_id) {
    sql += ` AND firm_id = $${paramIndex++}`;
    params.push(options.firm_id);
  }

  if (options.status) {
    sql += ` AND status = $${paramIndex++}`;
    params.push(options.status);
  }

  sql += ` ORDER BY created_at DESC`;

  const result = await query(sql, params);
  return result.rows.map(parseMandateRow);
}

/**
 * List mandates with pagination and optional filters (PostgreSQL)
 */
async function listMandatesPaged(options = {}) {
  const page = Number(options.page) > 0 ? Number(options.page) : 1;
  const pageSize = Number(options.pageSize) > 0 ? Number(options.pageSize) : 10;

  const offset = (page - 1) * pageSize;

  let whereSql = `WHERE 1=1`;
  const params = [];
  let paramIndex = 1;

  if (options.firm_id) {
    whereSql += ` AND firm_id = $${paramIndex++}`;
    params.push(options.firm_id);
  }

  if (options.status) {
    whereSql += ` AND status = $${paramIndex++}`;
    params.push(options.status);
  }

  const countResult = await query(
    `SELECT COUNT(*)::int AS count FROM mandates ${whereSql}`,
    params
  );
  const total = countResult.rows[0]?.count ?? 0;

  const result = await query(
    `SELECT * FROM mandates ${whereSql} ORDER BY created_at DESC LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...params, pageSize, offset]
  );

  return {
    rows: result.rows.map(parseMandateRow),
    total,
  };
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function listMandates(options = {}) {
//   const db = await getDb();
//   let query = `SELECT * FROM mandates WHERE 1=1`;
//   const params = [];
//
//   if (options.firm_id) {
//     query += ` AND firm_id = ?`;
//     params.push(options.firm_id);
//   }
//
//   if (options.status) {
//     query += ` AND status = ?`;
//     params.push(options.status);
//   }
//
//   query += ` ORDER BY created_at DESC`;
//
//   const rows = await db.all(query, params);
//   return rows.map(parseMandateRow);
// }
// ============================================================

/**
 * Update mandate by ID (PostgreSQL)
 */
async function updateMandate(id, data) {
  const serialized = serializeMandateData(data);

  const fields = [];
  const values = [];
  let paramIndex = 1;

  if (data.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(serialized.name);
  }
  if (data.firm_id !== undefined) {
    fields.push(`firm_id = $${paramIndex++}`);
    values.push(serialized.firm_id);
  }
  if (data.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(serialized.location);
  }
  if (data.primary_sector !== undefined) {
    fields.push(`primary_sector = $${paramIndex++}`);
    values.push(serialized.primary_sector);
  }
  if (data.sectors !== undefined) {
    fields.push(`sectors = $${paramIndex++}`);
    values.push(serialized.sectors);
  }
  if (data.functions !== undefined) {
    fields.push(`functions = $${paramIndex++}`);
    values.push(serialized.functions);
  }
  if (data.asset_classes !== undefined) {
    fields.push(`asset_classes = $${paramIndex++}`);
    values.push(serialized.asset_classes);
  }
  if (data.regions !== undefined) {
    fields.push(`regions = $${paramIndex++}`);
    values.push(serialized.regions);
  }
  if (data.seniority_min !== undefined) {
    fields.push(`seniority_min = $${paramIndex++}`);
    values.push(serialized.seniority_min);
  }
  if (data.seniority_max !== undefined) {
    fields.push(`seniority_max = $${paramIndex++}`);
    values.push(serialized.seniority_max);
  }
  if (data.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(serialized.status);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await query(
    `UPDATE mandates SET ${fields.join(", ")} WHERE id = $${paramIndex}`,
    values
  );

  console.log(`[mandateModel] Updated mandate ID: ${id}`);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function updateMandate(id, data) {
//   const db = await getDb();
//   const serialized = serializeMandateData(data);
//
//   const fields = [];
//   const values = [];
//
//   if (data.name !== undefined) {
//     fields.push("name = ?");
//     values.push(serialized.name);
//   }
//   if (data.firm_id !== undefined) {
//     fields.push("firm_id = ?");
//     values.push(serialized.firm_id);
//   }
//   if (data.location !== undefined) {
//     fields.push("location = ?");
//     values.push(serialized.location);
//   }
//   if (data.primary_sector !== undefined) {
//     fields.push("primary_sector = ?");
//     values.push(serialized.primary_sector);
//   }
//   if (data.sectors !== undefined) {
//     fields.push("sectors = ?");
//     values.push(serialized.sectors);
//   }
//   if (data.functions !== undefined) {
//     fields.push("functions = ?");
//     values.push(serialized.functions);
//   }
//   if (data.asset_classes !== undefined) {
//     fields.push("asset_classes = ?");
//     values.push(serialized.asset_classes);
//   }
//   if (data.regions !== undefined) {
//     fields.push("regions = ?");
//     values.push(serialized.regions);
//   }
//   if (data.seniority_min !== undefined) {
//     fields.push("seniority_min = ?");
//     values.push(serialized.seniority_min);
//   }
//   if (data.seniority_max !== undefined) {
//     fields.push("seniority_max = ?");
//     values.push(serialized.seniority_max);
//   }
//   if (data.status !== undefined) {
//     fields.push("status = ?");
//     values.push(serialized.status);
//   }
//   if (data.raw_brief !== undefined) {
//     fields.push("raw_brief = ?");
//     values.push(serialized.raw_brief);
//   }
//
//   fields.push("updated_at = CURRENT_TIMESTAMP");
//   values.push(id);
//
//   await db.run(
//     `UPDATE mandates SET ${fields.join(", ")} WHERE id = ?`,
//     values
//   );
//
//   console.log(`[mandateModel] Updated mandate ID: ${id}`);
// }
// ============================================================

/**
 * Delete mandate by ID (PostgreSQL)
 */
async function deleteMandate(id) {
  await query(`DELETE FROM mandates WHERE id = $1`, [id]);
  console.log(`[mandateModel] Deleted mandate ID: ${id}`);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function deleteMandate(id) {
//   const db = await getDb();
//   await db.run(`DELETE FROM mandates WHERE id = ?`, [id]);
//   console.log(`[mandateModel] Deleted mandate ID: ${id}`);
// }
// ============================================================

/**
 * Add a candidate to a mandate (PostgreSQL)
 */
async function addCandidateToMandate(mandateId, candidateId) {
  // Get current candidate_ids
  const result = await query(
    'SELECT candidate_ids FROM mandates WHERE id = $1',
    [mandateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  const candidateIds = safeParseJsonField(result.rows[0].candidate_ids);
  
  // Add candidate if not already present
  if (!candidateIds.includes(candidateId)) {
    candidateIds.push(candidateId);
    await query(
      'UPDATE mandates SET candidate_ids = $1 WHERE id = $2',
      [JSON.stringify(candidateIds), mandateId]
    );
  }
  
  // Also update the candidate's mandate_ids
  const { addMandateToCandidate } = require('./candidateModel.cjs');
  await addMandateToCandidate(candidateId, mandateId);
  
  return candidateIds;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function addCandidateToMandate(mandateId, candidateId) {
//   const db = await getDb();
//   
//   const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
//   if (!row) {
//     throw new Error(`Mandate with ID ${mandateId} not found`);
//   }
//   
//   const candidateIds = JSON.parse(row.candidate_ids || '[]');
//   
//   if (!candidateIds.includes(candidateId)) {
//     candidateIds.push(candidateId);
//     await db.run(
//       'UPDATE mandates SET candidate_ids = ? WHERE id = ?',
//       [JSON.stringify(candidateIds), mandateId]
//     );
//   }
//   
//   const { addMandateToCandidate } = require('./candidateModel.cjs');
//   await addMandateToCandidate(candidateId, mandateId);
//   
//   return candidateIds;
// }
// ============================================================

/**
 * Remove a candidate from a mandate (PostgreSQL)
 */
async function removeCandidateFromMandate(mandateId, candidateId) {
  const result = await query(
    'SELECT candidate_ids FROM mandates WHERE id = $1',
    [mandateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  const candidateIds = safeParseJsonField(result.rows[0].candidate_ids);
  const filtered = candidateIds.filter(id => id !== candidateId);
  
  await query(
    'UPDATE mandates SET candidate_ids = $1 WHERE id = $2',
    [JSON.stringify(filtered), mandateId]
  );
  
  // Also update the candidate's mandate_ids
  const { removeMandateFromCandidate } = require('./candidateModel.cjs');
  await removeMandateFromCandidate(candidateId, mandateId);
  
  return filtered;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function removeCandidateFromMandate(mandateId, candidateId) {
//   const db = await getDb();
//   
//   const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
//   if (!row) {
//     throw new Error(`Mandate with ID ${mandateId} not found`);
//   }
//   
//   const candidateIds = JSON.parse(row.candidate_ids || '[]');
//   const filtered = candidateIds.filter(id => id !== candidateId);
//   
//   await db.run(
//     'UPDATE mandates SET candidate_ids = ? WHERE id = ?',
//     [JSON.stringify(filtered), mandateId]
//   );
//   
//   const { removeMandateFromCandidate } = require('./candidateModel.cjs');
//   await removeMandateFromCandidate(candidateId, mandateId);
//   
//   return filtered;
// }
// ============================================================

/**
 * Get all candidates associated with a mandate (PostgreSQL)
 */
async function getMandateCandidates(mandateId) {
  const result = await query(
    'SELECT candidate_ids FROM mandates WHERE id = $1',
    [mandateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  return safeParseJsonField(result.rows[0].candidate_ids);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getMandateCandidates(mandateId) {
//   const db = await getDb();
//   
//   const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
//   if (!row) {
//     throw new Error(`Mandate with ID ${mandateId} not found`);
//   }
//   
//   return JSON.parse(row.candidate_ids || '[]');
// }
// ============================================================

module.exports = {
  initMandatesTable,
  createMandate,
  getMandateById,
  listMandates,
  listMandatesPaged,
  updateMandate,
  deleteMandate,
  addCandidateToMandate,
  removeCandidateFromMandate,
  getMandateCandidates,
};
