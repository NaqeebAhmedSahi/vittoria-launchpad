const { getDb } = require("../db/connection.cjs");

/**
 * Initialize mandates table
 */
async function initMandatesTable(db) {
  await db.exec(`
    CREATE TABLE IF NOT EXISTS mandates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      firm_id INTEGER NOT NULL,
      location TEXT,

      primary_sector TEXT,
      sectors TEXT,          -- JSON string array
      functions TEXT,        -- JSON string array
      asset_classes TEXT,    -- JSON string array
      regions TEXT,          -- JSON string array

      seniority_min TEXT,
      seniority_max TEXT,

      status TEXT DEFAULT 'OPEN',
      raw_brief TEXT,
      candidate_ids TEXT DEFAULT '[]',

      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,

      FOREIGN KEY (firm_id) REFERENCES firms(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_mandates_firm ON mandates(firm_id);
    CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);
  `);
  
  // Add candidate_ids column if it doesn't exist (for existing databases)
  try {
    await db.exec(`ALTER TABLE mandates ADD COLUMN candidate_ids TEXT DEFAULT '[]';`);
  } catch (e) {
    // Column already exists, ignore error
  }
  
  console.log("[mandateModel] mandates table initialized");
}

/**
 * Helper: Parse JSON fields from DB row
 */
function parseMandateRow(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name,
    firm_id: row.firm_id,
    location: row.location || null,
    primary_sector: row.primary_sector || null,
    sectors: row.sectors ? JSON.parse(row.sectors) : [],
    functions: row.functions ? JSON.parse(row.functions) : [],
    asset_classes: row.asset_classes ? JSON.parse(row.asset_classes) : [],
    regions: row.regions ? JSON.parse(row.regions) : [],
    seniority_min: row.seniority_min || null,
    seniority_max: row.seniority_max || null,
    status: row.status || "OPEN",
    raw_brief: row.raw_brief || null,
    candidate_ids: row.candidate_ids ? JSON.parse(row.candidate_ids) : [],
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

/**
 * Helper: Serialize mandate data for DB insert/update
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
    raw_brief: data.raw_brief || null,
  };
}

/**
 * Create a new mandate
 */
async function createMandate(data) {
  const db = await getDb();
  const serialized = serializeMandateData(data);

  const result = await db.run(
    `INSERT INTO mandates (
      name, firm_id, location, primary_sector, sectors, functions, 
      asset_classes, regions, seniority_min, seniority_max, status, raw_brief
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
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
      serialized.raw_brief,
    ]
  );

  console.log(`[mandateModel] Created mandate: ${data.name} (ID: ${result.lastID})`);
  return result.lastID;
}

/**
 * Get mandate by ID
 */
async function getMandateById(id) {
  const db = await getDb();
  const row = await db.get(`SELECT * FROM mandates WHERE id = ?`, [id]);
  return parseMandateRow(row);
}

/**
 * List mandates with optional filters
 */
async function listMandates(options = {}) {
  const db = await getDb();
  let query = `SELECT * FROM mandates WHERE 1=1`;
  const params = [];

  if (options.firm_id) {
    query += ` AND firm_id = ?`;
    params.push(options.firm_id);
  }

  if (options.status) {
    query += ` AND status = ?`;
    params.push(options.status);
  }

  query += ` ORDER BY created_at DESC`;

  const rows = await db.all(query, params);
  return rows.map(parseMandateRow);
}

/**
 * Update mandate by ID
 */
async function updateMandate(id, data) {
  const db = await getDb();
  const serialized = serializeMandateData(data);

  const fields = [];
  const values = [];

  if (data.name !== undefined) {
    fields.push("name = ?");
    values.push(serialized.name);
  }
  if (data.firm_id !== undefined) {
    fields.push("firm_id = ?");
    values.push(serialized.firm_id);
  }
  if (data.location !== undefined) {
    fields.push("location = ?");
    values.push(serialized.location);
  }
  if (data.primary_sector !== undefined) {
    fields.push("primary_sector = ?");
    values.push(serialized.primary_sector);
  }
  if (data.sectors !== undefined) {
    fields.push("sectors = ?");
    values.push(serialized.sectors);
  }
  if (data.functions !== undefined) {
    fields.push("functions = ?");
    values.push(serialized.functions);
  }
  if (data.asset_classes !== undefined) {
    fields.push("asset_classes = ?");
    values.push(serialized.asset_classes);
  }
  if (data.regions !== undefined) {
    fields.push("regions = ?");
    values.push(serialized.regions);
  }
  if (data.seniority_min !== undefined) {
    fields.push("seniority_min = ?");
    values.push(serialized.seniority_min);
  }
  if (data.seniority_max !== undefined) {
    fields.push("seniority_max = ?");
    values.push(serialized.seniority_max);
  }
  if (data.status !== undefined) {
    fields.push("status = ?");
    values.push(serialized.status);
  }
  if (data.raw_brief !== undefined) {
    fields.push("raw_brief = ?");
    values.push(serialized.raw_brief);
  }

  fields.push("updated_at = CURRENT_TIMESTAMP");
  values.push(id);

  await db.run(
    `UPDATE mandates SET ${fields.join(", ")} WHERE id = ?`,
    values
  );

  console.log(`[mandateModel] Updated mandate ID: ${id}`);
}

/**
 * Delete mandate by ID
 */
async function deleteMandate(id) {
  const db = await getDb();
  await db.run(`DELETE FROM mandates WHERE id = ?`, [id]);
  console.log(`[mandateModel] Deleted mandate ID: ${id}`);
}

/**
 * Add a candidate to a mandate
 */
async function addCandidateToMandate(mandateId, candidateId) {
  const db = await getDb();
  
  // Get current candidate_ids
  const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
  if (!row) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  const candidateIds = JSON.parse(row.candidate_ids || '[]');
  
  // Add if not already present
  if (!candidateIds.includes(candidateId)) {
    candidateIds.push(candidateId);
    await db.run(
      'UPDATE mandates SET candidate_ids = ? WHERE id = ?',
      [JSON.stringify(candidateIds), mandateId]
    );
  }
  
  // Also update the candidate's mandate_ids
  const { addMandateToCandidate } = require('./candidateModel.cjs');
  await addMandateToCandidate(candidateId, mandateId);
  
  return candidateIds;
}

/**
 * Remove a candidate from a mandate
 */
async function removeCandidateFromMandate(mandateId, candidateId) {
  const db = await getDb();
  
  const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
  if (!row) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  const candidateIds = JSON.parse(row.candidate_ids || '[]');
  const filtered = candidateIds.filter(id => id !== candidateId);
  
  await db.run(
    'UPDATE mandates SET candidate_ids = ? WHERE id = ?',
    [JSON.stringify(filtered), mandateId]
  );
  
  // Also update the candidate's mandate_ids
  const { removeMandateFromCandidate } = require('./candidateModel.cjs');
  await removeMandateFromCandidate(candidateId, mandateId);
  
  return filtered;
}

/**
 * Get all candidates associated with a mandate
 */
async function getMandateCandidates(mandateId) {
  const db = await getDb();
  
  const row = await db.get('SELECT candidate_ids FROM mandates WHERE id = ?', [mandateId]);
  if (!row) {
    throw new Error(`Mandate with ID ${mandateId} not found`);
  }
  
  return JSON.parse(row.candidate_ids || '[]');
}

module.exports = {
  initMandatesTable,
  createMandate,
  getMandateById,
  listMandates,
  updateMandate,
  deleteMandate,
  addCandidateToMandate,
  removeCandidateFromMandate,
  getMandateCandidates,
};
