const initDatabase = require("../db/connection.cjs");

/**
 * Initialize candidates table
 */
async function initCandidatesTable(db) {
  if (!db) {
    db = await initDatabase();
  }
  
  await db.exec(`
    CREATE TABLE IF NOT EXISTS candidates (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT,
      current_title TEXT,
      current_firm TEXT,
      location TEXT,
      sectors TEXT DEFAULT '[]',
      functions TEXT DEFAULT '[]',
      asset_classes TEXT DEFAULT '[]',
      geographies TEXT DEFAULT '[]',
      seniority TEXT,
      status TEXT NOT NULL DEFAULT 'DRAFT',
      mandate_ids TEXT DEFAULT '[]',
      created_at TEXT DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
      CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
    );
  `);

  // Add mandate_ids column if it doesn't exist (for existing databases)
  try {
    await db.exec(`ALTER TABLE candidates ADD COLUMN mandate_ids TEXT DEFAULT '[]';`);
  } catch (e) {
    // Column already exists, ignore error
  }

  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
  `);
  
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);
  `);
  
  await db.exec(`
    CREATE INDEX IF NOT EXISTS idx_candidates_current_firm ON candidates(current_firm);
  `);
  
  await db.exec(`
    CREATE TRIGGER IF NOT EXISTS trigger_candidates_updated_at
      AFTER UPDATE ON candidates
      FOR EACH ROW
      BEGIN
        UPDATE candidates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
      END;
  `);
}

/**
 * Create a draft candidate from parsed CV data
 */
async function createDraftCandidate(parsedCv) {
  const db = await initDatabase();
  
  const query = `
    INSERT INTO candidates (
      name,
      current_title,
      current_firm,
      location,
      sectors,
      functions,
      asset_classes,
      geographies,
      seniority,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const result = await db.run(query, [
    parsedCv.name,
    parsedCv.current_title || null,
    parsedCv.current_firm || null,
    parsedCv.location || null,
    JSON.stringify(parsedCv.sectors || []),
    JSON.stringify(parsedCv.functions || []),
    JSON.stringify(parsedCv.asset_classes || []),
    JSON.stringify(parsedCv.geographies || []),
    parsedCv.seniority || null,
    'DRAFT'
  ]);

  return result.lastID;
}

/**
 * Get candidate by ID
 */
async function getCandidateById(candidateId) {
  const db = await initDatabase();
  
  const row = await db.get(`
    SELECT 
      id,
      name,
      current_title,
      current_firm,
      location,
      sectors,
      functions,
      asset_classes,
      geographies,
      seniority,
      status,
      mandate_ids,
      created_at,
      updated_at
    FROM candidates
    WHERE id = ?
  `, [candidateId]);

  if (!row) {
    return null;
  }

  // Parse JSON strings back to arrays
  return {
    ...row,
    sectors: JSON.parse(row.sectors || '[]'),
    functions: JSON.parse(row.functions || '[]'),
    asset_classes: JSON.parse(row.asset_classes || '[]'),
    geographies: JSON.parse(row.geographies || '[]'),
    mandate_ids: JSON.parse(row.mandate_ids || '[]'),
  };
}

/**
 * Get all candidates with optional status filter
 */
async function listCandidates(status = null) {
  const db = await initDatabase();
  
  let query = `
    SELECT 
      id,
      name,
      current_title,
      current_firm,
      location,
      sectors,
      functions,
      asset_classes,
      geographies,
      seniority,
      status,
      mandate_ids,
      created_at,
      updated_at
    FROM candidates
  `;
  
  const params = [];
  
  if (status) {
    query += ' WHERE status = ?';
    params.push(status);
  }
  
  query += ' ORDER BY created_at DESC';
  
  const rows = await db.all(query, params);
  
  return rows.map(row => ({
    ...row,
    sectors: JSON.parse(row.sectors || '[]'),
    functions: JSON.parse(row.functions || '[]'),
    asset_classes: JSON.parse(row.asset_classes || '[]'),
    geographies: JSON.parse(row.geographies || '[]'),
    mandate_ids: JSON.parse(row.mandate_ids || '[]'),
  }));
}

/**
 * Update candidate information
 */
async function updateCandidate(candidateId, updates) {
  const db = await initDatabase();
  
  const fields = [];
  const values = [];
  
  if (updates.name !== undefined) {
    fields.push('name = ?');
    values.push(updates.name);
  }
  if (updates.current_title !== undefined) {
    fields.push('current_title = ?');
    values.push(updates.current_title);
  }
  if (updates.current_firm !== undefined) {
    fields.push('current_firm = ?');
    values.push(updates.current_firm);
  }
  if (updates.location !== undefined) {
    fields.push('location = ?');
    values.push(updates.location);
  }
  if (updates.sectors !== undefined) {
    fields.push('sectors = ?');
    values.push(JSON.stringify(updates.sectors));
  }
  if (updates.functions !== undefined) {
    fields.push('functions = ?');
    values.push(JSON.stringify(updates.functions));
  }
  if (updates.asset_classes !== undefined) {
    fields.push('asset_classes = ?');
    values.push(JSON.stringify(updates.asset_classes));
  }
  if (updates.geographies !== undefined) {
    fields.push('geographies = ?');
    values.push(JSON.stringify(updates.geographies));
  }
  if (updates.seniority !== undefined) {
    fields.push('seniority = ?');
    values.push(updates.seniority);
  }
  if (updates.status !== undefined) {
    fields.push('status = ?');
    values.push(updates.status);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(candidateId);

  const query = `UPDATE candidates SET ${fields.join(', ')} WHERE id = ?`;
  
  await db.run(query, values);
}

/**
 * Approve a candidate - sets status to ACTIVE and updates intake file
 */
async function approveCandidate(candidateId) {
  const db = await initDatabase();
  
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Update candidate status to ACTIVE
    await db.run(
      'UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['ACTIVE', candidateId]
    );

    // Update associated intake file status to Approved (UI expects title case)
    await db.run(
      'UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?',
      ['Approved', candidateId]
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Reject a candidate - sets status to ARCHIVED and updates intake file
 */
async function rejectCandidate(candidateId) {
  const db = await initDatabase();
  
  await db.run('BEGIN TRANSACTION');
  
  try {
    // Update candidate status to ARCHIVED
    await db.run(
      'UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
      ['ARCHIVED', candidateId]
    );

    // Update associated intake file status to Rejected (UI expects title case)
    await db.run(
      'UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?',
      ['Rejected', candidateId]
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    throw error;
  }
}

/**
 * Search candidates by name
 */
async function searchCandidates(searchTerm) {
  const db = await initDatabase();
  
  const rows = await db.all(`
    SELECT 
      id,
      name,
      current_title,
      current_firm,
      location,
      sectors,
      functions,
      asset_classes,
      geographies,
      seniority,
      status,
      created_at,
      updated_at
    FROM candidates
    WHERE name LIKE ?
    ORDER BY created_at DESC
  `, [`%${searchTerm}%`]);
  
  return rows.map(row => ({
    ...row,
    sectors: JSON.parse(row.sectors || '[]'),
    functions: JSON.parse(row.functions || '[]'),
    asset_classes: JSON.parse(row.asset_classes || '[]'),
    geographies: JSON.parse(row.geographies || '[]'),
  }));
}

/**
 * Delete a candidate (soft delete by archiving)
 */
async function deleteCandidate(candidateId) {
  await updateCandidate(candidateId, { status: 'ARCHIVED' });
}

async function createCandidate(candidateData) {
  const db = await initDatabase();

  const {
    name,
    current_title,
    current_firm,
    location,
    sectors = [],
    functions = [],
    asset_classes = [],
    geographies = [],
    seniority = null,
    status = "ACTIVE", // manual candidates go straight to ACTIVE
  } = candidateData;

  const result = await db.run(
    `
    INSERT INTO candidates (
      name,
      current_title,
      current_firm,
      location,
      sectors,
      functions,
      asset_classes,
      geographies,
      seniority,
      status
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `,
    [
      name,
      current_title || null,
      current_firm || null,
      location || null,
      JSON.stringify(sectors),
      JSON.stringify(functions),
      JSON.stringify(asset_classes),
      JSON.stringify(geographies),
      seniority || null,
      status,
    ]
  );

  // Return the full row in the same shape as getCandidateById
  return getCandidateById(result.lastID);
}

/**
 * Add a mandate to a candidate
 */
async function addMandateToCandidate(candidateId, mandateId) {
  const db = await initDatabase();
  
  // Get current mandate_ids
  const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
  if (!row) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  const mandateIds = JSON.parse(row.mandate_ids || '[]');
  
  // Add if not already present
  if (!mandateIds.includes(mandateId)) {
    mandateIds.push(mandateId);
    await db.run(
      'UPDATE candidates SET mandate_ids = ? WHERE id = ?',
      [JSON.stringify(mandateIds), candidateId]
    );
  }
  
  return mandateIds;
}

/**
 * Remove a mandate from a candidate
 */
async function removeMandateFromCandidate(candidateId, mandateId) {
  const db = await initDatabase();
  
  const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
  if (!row) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  const mandateIds = JSON.parse(row.mandate_ids || '[]');
  const filtered = mandateIds.filter(id => id !== mandateId);
  
  await db.run(
    'UPDATE candidates SET mandate_ids = ? WHERE id = ?',
    [JSON.stringify(filtered), candidateId]
  );
  
  return filtered;
}

/**
 * Get all mandates associated with a candidate
 */
async function getCandidateMandates(candidateId) {
  const db = await initDatabase();
  
  const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
  if (!row) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  return JSON.parse(row.mandate_ids || '[]');
}

module.exports = {
  initCandidatesTable,
  createDraftCandidate,
  createCandidate,       // ⬅️ export it
  getCandidateById,
  listCandidates,
  updateCandidate,
  approveCandidate,
  rejectCandidate,
  searchCandidates,
  deleteCandidate,
  addMandateToCandidate,
  removeMandateFromCandidate,
  getCandidateMandates,
};