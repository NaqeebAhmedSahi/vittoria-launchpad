// ============================================================
// POSTGRESQL VERSION (ACTIVE)
// ============================================================
const { query, getClient } = require("../db/pgConnection.cjs");
const embeddingClient = require("../services/embeddingClient.cjs");

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
      console.warn(`[candidateModel] Invalid JSON, treating as comma-separated: ${field}`);
      return field.split(',').map(s => s.trim()).filter(s => s);
    }
  }
  return [];
}

/**
 * Initialize candidates table (PostgreSQL)
 * NOTE: Table creation is handled by databaseInitializer.cjs during setup
 * This function is kept for reference
 */
async function initCandidatesTable() {
  // Note: PostgreSQL schema is created during setup wizard
  // Table structure:
  // - id SERIAL PRIMARY KEY
  // - name TEXT
  // - current_title TEXT
  // - current_firm TEXT
  // - location TEXT
  // - sectors JSONB DEFAULT '[]'
  // - functions JSONB DEFAULT '[]'
  // - asset_classes JSONB DEFAULT '[]'
  // - geographies JSONB DEFAULT '[]'
  // - seniority TEXT
  // - status TEXT DEFAULT 'DRAFT' CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
  // - mandate_ids JSONB DEFAULT '[]'
  // - created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  // - updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
  console.log("[candidateModel] Table creation handled by setup wizard");
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT - KEPT FOR REFERENCE)
// ============================================================
// const initDatabase = require("../db/connection.cjs");
//
// async function initCandidatesTable(db) {
//   if (!db) {
//     db = await initDatabase();
//   }
//   
//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS candidates (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       name TEXT,
//       current_title TEXT,
//       current_firm TEXT,
//       location TEXT,
//       sectors TEXT DEFAULT '[]',
//       functions TEXT DEFAULT '[]',
//       asset_classes TEXT DEFAULT '[]',
//       geographies TEXT DEFAULT '[]',
//       seniority TEXT,
//       status TEXT NOT NULL DEFAULT 'DRAFT',
//       mandate_ids TEXT DEFAULT '[]',
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
//     );
//   `);
//
//   try {
//     await db.exec(`ALTER TABLE candidates ADD COLUMN mandate_ids TEXT DEFAULT '[]';`);
//   } catch (e) {
//     // Column already exists, ignore error
//   }
//
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
//   `);
//   
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);
//   `);
//   
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_candidates_current_firm ON candidates(current_firm);
//   `);
//   
//   await db.exec(`
//     CREATE TRIGGER IF NOT EXISTS trigger_candidates_updated_at
//       AFTER UPDATE ON candidates
//       FOR EACH ROW
//       BEGIN
//         UPDATE candidates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
//       END;
//   `);
// }
// ============================================================

/**
 * Create a draft candidate from parsed CV data (PostgreSQL)
 */
async function createDraftCandidate(parsedCv) {
  const result = await query(
    `INSERT INTO candidates (
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
    [
      // Ensure we never insert NULL into the name column. Use parsedCv.name,
      // fallback to other parsed fields if available, otherwise empty string.
      parsedCv.name || parsedCv.full_name || parsedCv.current_title || parsedCv.current_firm || '',
      parsedCv.current_title || null,
      parsedCv.current_firm || null,
      parsedCv.location || null,
      JSON.stringify(parsedCv.sectors || []),
      JSON.stringify(parsedCv.functions || []),
      JSON.stringify(parsedCv.asset_classes || []),
      JSON.stringify(parsedCv.geographies || []),
      parsedCv.seniority || null,
      'DRAFT'
    ]
  );

  const candidateId = result.rows[0].id;

  // Generate and persist embedding for semantic search & duplicate detection
  try {
    const profileSummary = [
      parsedCv.name || parsedCv.full_name || '',
      parsedCv.current_title || '',
      parsedCv.current_firm || '',
      parsedCv.seniority || '',
      Array.isArray(parsedCv.sectors) ? parsedCv.sectors.join(' ') : (parsedCv.sectors || ''),
      Array.isArray(parsedCv.functions) ? parsedCv.functions.join(' ') : (parsedCv.functions || ''),
    ]
      .filter(Boolean)
      .join(' | ');

    await embeddingClient.generateAndPersistEmbedding(
      'candidates',
      candidateId,
      profileSummary,
      { source: 'parsed' }
    );
    console.log(`[candidateModel] ✅ Generated embedding for candidate ${candidateId}`);
  } catch (error) {
    console.error(`[candidateModel] ⚠️ Failed to generate embedding for candidate ${candidateId}:`, error.message);
    // Don't fail candidate creation if embedding generation fails
  }

  return candidateId;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function createDraftCandidate(parsedCv) {
//   const db = await initDatabase();
//   
//   const query = `
//     INSERT INTO candidates (
//       name,
//       current_title,
//       current_firm,
//       location,
//       sectors,
//       functions,
//       asset_classes,
//       geographies,
//       seniority,
//       status
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
//   `;
//
//   const result = await db.run(query, [
//     parsedCv.name,
//     parsedCv.current_title || null,
//     parsedCv.current_firm || null,
//     parsedCv.location || null,
//     JSON.stringify(parsedCv.sectors || []),
//     JSON.stringify(parsedCv.functions || []),
//     JSON.stringify(parsedCv.asset_classes || []),
//     JSON.stringify(parsedCv.geographies || []),
//     parsedCv.seniority || null,
//     'DRAFT'
//   ]);
//
//   return result.lastID;
// }
// ============================================================

/**
 * Get candidate by ID (PostgreSQL)
 */
async function getCandidateById(candidateId) {
  const result = await query(
    `SELECT 
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
    WHERE id = $1`,
    [candidateId]
  );

  if (result.rows.length === 0) {
    return null;
  }

  const row = result.rows[0];
  
  // Parse JSON strings back to arrays (safe parsing handles JSONB and legacy TEXT)
  return {
    ...row,
    sectors: safeParseJsonField(row.sectors),
    functions: safeParseJsonField(row.functions),
    asset_classes: safeParseJsonField(row.asset_classes),
    geographies: safeParseJsonField(row.geographies),
    mandate_ids: safeParseJsonField(row.mandate_ids),
  };
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getCandidateById(candidateId) {
//   const db = await initDatabase();
//   
//   const row = await db.get(`
//     SELECT 
//       id,
//       name,
//       current_title,
//       current_firm,
//       location,
//       sectors,
//       functions,
//       asset_classes,
//       geographies,
//       seniority,
//       status,
//       mandate_ids,
//       created_at,
//       updated_at
//     FROM candidates
//     WHERE id = ?
//   `, [candidateId]);
//
//   if (!row) {
//     return null;
//   }
//
//   return {
//     ...row,
//     sectors: JSON.parse(row.sectors || '[]'),
//     functions: JSON.parse(row.functions || '[]'),
//     asset_classes: JSON.parse(row.asset_classes || '[]'),
//     geographies: JSON.parse(row.geographies || '[]'),
//     mandate_ids: JSON.parse(row.mandate_ids || '[]'),
//   };
// }
// ============================================================

/**
 * Get all candidates with optional status filter (PostgreSQL)
 */
async function listCandidates(status = null) {
  let sql = `
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
    sql += ' WHERE status = $1';
    params.push(status);
  }
  
  sql += ' ORDER BY created_at DESC';
  
  const result = await query(sql, params);
  
  return result.rows.map(row => ({
    ...row,
    sectors: safeParseJsonField(row.sectors),
    functions: safeParseJsonField(row.functions),
    asset_classes: safeParseJsonField(row.asset_classes),
    geographies: safeParseJsonField(row.geographies),
    mandate_ids: safeParseJsonField(row.mandate_ids),
  }));
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function listCandidates(status = null) {
//   const db = await initDatabase();
//   
//   let query = `
//     SELECT 
//       id,
//       name,
//       current_title,
//       current_firm,
//       location,
//       sectors,
//       functions,
//       asset_classes,
//       geographies,
//       seniority,
//       status,
//       mandate_ids,
//       created_at,
//       updated_at
//     FROM candidates
//   `;
//   
//   const params = [];
//   
//   if (status) {
//     query += ' WHERE status = ?';
//     params.push(status);
//   }
//   
//   query += ' ORDER BY created_at DESC';
//   
//   const rows = await db.all(query, params);
//   
//   return rows.map(row => ({
//     ...row,
//     sectors: JSON.parse(row.sectors || '[]'),
//     functions: JSON.parse(row.functions || '[]'),
//     asset_classes: JSON.parse(row.asset_classes || '[]'),
//     geographies: JSON.parse(row.geographies || '[]'),
//     mandate_ids: JSON.parse(row.mandate_ids || '[]'),
//   }));
// }
// ============================================================

/**
 * Update candidate information (PostgreSQL)
 */
async function updateCandidate(candidateId, updates) {
  const fields = [];
  const values = [];
  let paramIndex = 1;

  // Track if any profile fields changed (for embedding regeneration)
  const profileFieldsChanged = [
    'name',
    'current_title',
    'current_firm',
    'location',
    'sectors',
    'functions',
    'asset_classes',
    'geographies',
    'seniority',
  ].some(field => updates[field] !== undefined);
  
  if (updates.name !== undefined) {
    fields.push(`name = $${paramIndex++}`);
    values.push(updates.name);
  }
  if (updates.current_title !== undefined) {
    fields.push(`current_title = $${paramIndex++}`);
    values.push(updates.current_title);
  }
  if (updates.current_firm !== undefined) {
    fields.push(`current_firm = $${paramIndex++}`);
    values.push(updates.current_firm);
  }
  if (updates.location !== undefined) {
    fields.push(`location = $${paramIndex++}`);
    values.push(updates.location);
  }
  if (updates.sectors !== undefined) {
    fields.push(`sectors = $${paramIndex++}`);
    values.push(JSON.stringify(updates.sectors));
  }
  if (updates.functions !== undefined) {
    fields.push(`functions = $${paramIndex++}`);
    values.push(JSON.stringify(updates.functions));
  }
  if (updates.asset_classes !== undefined) {
    fields.push(`asset_classes = $${paramIndex++}`);
    values.push(JSON.stringify(updates.asset_classes));
  }
  if (updates.geographies !== undefined) {
    fields.push(`geographies = $${paramIndex++}`);
    values.push(JSON.stringify(updates.geographies));
  }
  if (updates.seniority !== undefined) {
    fields.push(`seniority = $${paramIndex++}`);
    values.push(updates.seniority);
  }
  if (updates.status !== undefined) {
    fields.push(`status = $${paramIndex++}`);
    values.push(updates.status);
  }

  if (fields.length === 0) {
    throw new Error('No fields to update');
  }

  fields.push('updated_at = CURRENT_TIMESTAMP');
  values.push(candidateId);

  const sql = `UPDATE candidates SET ${fields.join(', ')} WHERE id = $${paramIndex}`;
  
  await query(sql, values);

  // Regenerate embedding if profile fields changed
  if (profileFieldsChanged) {
    try {
      const candidate = await getCandidateById(candidateId);
      if (candidate) {
        const profileSummary = [
          candidate.name || '',
          candidate.current_title || '',
          candidate.current_firm || '',
          candidate.seniority || '',
          Array.isArray(candidate.sectors) ? candidate.sectors.join(' ') : (candidate.sectors || ''),
          Array.isArray(candidate.functions) ? candidate.functions.join(' ') : (candidate.functions || ''),
        ]
          .filter(Boolean)
          .join(' | ');

        await embeddingClient.generateAndPersistEmbedding(
          'candidates',
          candidateId,
          profileSummary,
          { source: 'enriched' }
        );
        console.log(`[candidateModel] ✅ Regenerated embedding for candidate ${candidateId}`);
      }
    } catch (error) {
      console.error(`[candidateModel] ⚠️ Failed to regenerate embedding for candidate ${candidateId}:`, error.message);
      // Don't fail the update if embedding regeneration fails
    }
  }
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function updateCandidate(candidateId, updates) {
//   const db = await initDatabase();
//   
//   const fields = [];
//   const values = [];
//   
//   if (updates.name !== undefined) {
//     fields.push('name = ?');
//     values.push(updates.name);
//   }
//   if (updates.current_title !== undefined) {
//     fields.push('current_title = ?');
//     values.push(updates.current_title);
//   }
//   if (updates.current_firm !== undefined) {
//     fields.push('current_firm = ?');
//     values.push(updates.current_firm);
//   }
//   if (updates.location !== undefined) {
//     fields.push('location = ?');
//     values.push(updates.location);
//   }
//   if (updates.sectors !== undefined) {
//     fields.push('sectors = ?');
//     values.push(JSON.stringify(updates.sectors));
//   }
//   if (updates.functions !== undefined) {
//     fields.push('functions = ?');
//     values.push(JSON.stringify(updates.functions));
//   }
//   if (updates.asset_classes !== undefined) {
//     fields.push('asset_classes = ?');
//     values.push(JSON.stringify(updates.asset_classes));
//   }
//   if (updates.geographies !== undefined) {
//     fields.push('geographies = ?');
//     values.push(JSON.stringify(updates.geographies));
//   }
//   if (updates.seniority !== undefined) {
//     fields.push('seniority = ?');
//     values.push(updates.seniority);
//   }
//   if (updates.status !== undefined) {
//     fields.push('status = ?');
//     values.push(updates.status);
//   }
//
//   if (fields.length === 0) {
//     throw new Error('No fields to update');
//   }
//
//   fields.push('updated_at = CURRENT_TIMESTAMP');
//   values.push(candidateId);
//
//   const query = `UPDATE candidates SET ${fields.join(', ')} WHERE id = ?`;
//   
//   await db.run(query, values);
// }
// ============================================================

/**
 * Approve a candidate - sets status to ACTIVE and updates intake file (PostgreSQL)
 */
async function approveCandidate(candidateId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Update candidate status to ACTIVE
    await client.query(
      'UPDATE candidates SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ACTIVE', candidateId]
    );

    // Update associated intake file status to Approved
    await client.query(
      'UPDATE intake_files SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = $2',
      ['Approved', candidateId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function approveCandidate(candidateId) {
//   const db = await initDatabase();
//   
//   await db.run('BEGIN TRANSACTION');
//   
//   try {
//     await db.run(
//       'UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
//       ['ACTIVE', candidateId]
//     );
//
//     await db.run(
//       'UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?',
//       ['Approved', candidateId]
//     );
//
//     await db.run('COMMIT');
//   } catch (error) {
//     await db.run('ROLLBACK');
//     throw error;
//   }
// }
// ============================================================

/**
 * Reject a candidate - sets status to ARCHIVED and updates intake file (PostgreSQL)
 */
async function rejectCandidate(candidateId) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Update candidate status to ARCHIVED
    await client.query(
      'UPDATE candidates SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['ARCHIVED', candidateId]
    );

    // Update associated intake file status to Rejected
    await client.query(
      'UPDATE intake_files SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = $2',
      ['Rejected', candidateId]
    );

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

/**
 * Defer a candidate - sets status to DEFERRED and updates intake file with reason (PostgreSQL)
 */
async function deferCandidate(candidateId, reason = null, reminderDate = null) {
  const client = await getClient();
  
  try {
    await client.query('BEGIN');
    
    // Update candidate status to DEFERRED
    await client.query(
      'UPDATE candidates SET status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2',
      ['DEFERRED', candidateId]
    );

    // Get intake file to update its metadata
    const intakeResult = await client.query(
      'SELECT id, parsed_json FROM intake_files WHERE candidate_id = $1',
      [candidateId]
    );

    if (intakeResult.rows.length > 0) {
      const intake = intakeResult.rows[0];
      let parsedJson = intake.parsed_json || {};
      
      // Add defer metadata
      parsedJson._deferral = {
        reason: reason || 'Deferred for review',
        deferredAt: new Date().toISOString(),
        reminderDate: reminderDate
      };

      // Update intake file status and metadata
      await client.query(
        'UPDATE intake_files SET status = $1, parsed_json = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $3',
        ['Deferred', JSON.stringify(parsedJson), intake.id]
      );
    }

    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function rejectCandidate(candidateId) {
//   const db = await initDatabase();
//   
//   await db.run('BEGIN TRANSACTION');
//   
//   try {
//     await db.run(
//       'UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
//       ['ARCHIVED', candidateId]
//     );
//
//     await db.run(
//       'UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?',
//       ['Rejected', candidateId]
//     );
//
//     await db.run('COMMIT');
//   } catch (error) {
//     await db.run('ROLLBACK');
//     throw error;
//   }
// }
// ============================================================

/**
 * Search candidates by name (PostgreSQL)
 */
async function searchCandidates(searchTerm) {
  const result = await query(
    `SELECT 
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
    WHERE name ILIKE $1
    ORDER BY created_at DESC`,
    [`%${searchTerm}%`]
  );
  
  return result.rows.map(row => ({
    ...row,
    sectors: safeParseJsonField(row.sectors),
    functions: safeParseJsonField(row.functions),
    asset_classes: safeParseJsonField(row.asset_classes),
    geographies: safeParseJsonField(row.geographies),
  }));
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function searchCandidates(searchTerm) {
//   const db = await initDatabase();
//   
//   const rows = await db.all(`
//     SELECT 
//       id,
//       name,
//       current_title,
//       current_firm,
//       location,
//       sectors,
//       functions,
//       asset_classes,
//       geographies,
//       seniority,
//       status,
//       created_at,
//       updated_at
//     FROM candidates
//     WHERE name LIKE ?
//     ORDER BY created_at DESC
//   `, [`%${searchTerm}%`]);
//   
//   return rows.map(row => ({
//     ...row,
//     sectors: JSON.parse(row.sectors || '[]'),
//     functions: JSON.parse(row.functions || '[]'),
//     asset_classes: JSON.parse(row.asset_classes || '[]'),
//     geographies: JSON.parse(row.geographies || '[]'),
//   }));
// }
// ============================================================

/**
 * Delete a candidate (soft delete by archiving) (PostgreSQL)
 */
async function deleteCandidate(candidateId) {
  await updateCandidate(candidateId, { status: 'ARCHIVED' });
}

/**
 * Create a candidate manually (PostgreSQL)
 */
async function createCandidate(candidateData) {
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

  const result = await query(
    `INSERT INTO candidates (
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
    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
    RETURNING id`,
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

  // Return the full row
  return getCandidateById(result.rows[0].id);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function deleteCandidate(candidateId) {
//   await updateCandidate(candidateId, { status: 'ARCHIVED' });
// }
//
// async function createCandidate(candidateData) {
//   const db = await initDatabase();
//
//   const {
//     name,
//     current_title,
//     current_firm,
//     location,
//     sectors = [],
//     functions = [],
//     asset_classes = [],
//     geographies = [],
//     seniority = null,
//     status = "ACTIVE",
//   } = candidateData;
//
//   const result = await db.run(
//     `INSERT INTO candidates (
//       name,
//       current_title,
//       current_firm,
//       location,
//       sectors,
//       functions,
//       asset_classes,
//       geographies,
//       seniority,
//       status
//     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
//     [
//       name,
//       current_title || null,
//       current_firm || null,
//       location || null,
//       JSON.stringify(sectors),
//       JSON.stringify(functions),
//       JSON.stringify(asset_classes),
//       JSON.stringify(geographies),
//       seniority || null,
//       status,
//     ]
//   );
//
//   return getCandidateById(result.lastID);
// }
// ============================================================

/**
 * Add a mandate to a candidate (PostgreSQL)
 */
async function addMandateToCandidate(candidateId, mandateId) {
  // Get current mandate_ids
  const result = await query(
    'SELECT mandate_ids FROM candidates WHERE id = $1',
    [candidateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  const mandateIds = safeParseJsonField(result.rows[0].mandate_ids);
  
  // Add if not already present
  if (!mandateIds.includes(mandateId)) {
    mandateIds.push(mandateId);
    await query(
      'UPDATE candidates SET mandate_ids = $1 WHERE id = $2',
      [JSON.stringify(mandateIds), candidateId]
    );
  }
  
  return mandateIds;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function addMandateToCandidate(candidateId, mandateId) {
//   const db = await initDatabase();
//   
//   const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
//   if (!row) {
//     throw new Error(`Candidate with ID ${candidateId} not found`);
//   }
//   
//   const mandateIds = JSON.parse(row.mandate_ids || '[]');
//   
//   if (!mandateIds.includes(mandateId)) {
//     mandateIds.push(mandateId);
//     await db.run(
//       'UPDATE candidates SET mandate_ids = ? WHERE id = ?',
//       [JSON.stringify(mandateIds), candidateId]
//     );
//   }
//   
//   return mandateIds;
// }
// ============================================================

/**
 * Remove a mandate from a candidate (PostgreSQL)
 */
async function removeMandateFromCandidate(candidateId, mandateId) {
  const result = await query(
    'SELECT mandate_ids FROM candidates WHERE id = $1',
    [candidateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  const mandateIds = safeParseJsonField(result.rows[0].mandate_ids);
  const filtered = mandateIds.filter(id => id !== mandateId);
  
  await query(
    'UPDATE candidates SET mandate_ids = $1 WHERE id = $2',
    [JSON.stringify(filtered), candidateId]
  );
  
  return filtered;
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function removeMandateFromCandidate(candidateId, mandateId) {
//   const db = await initDatabase();
//   
//   const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
//   if (!row) {
//     throw new Error(`Candidate with ID ${candidateId} not found`);
//   }
//   
//   const mandateIds = JSON.parse(row.mandate_ids || '[]');
//   const filtered = mandateIds.filter(id => id !== mandateId);
//   
//   await db.run(
//     'UPDATE candidates SET mandate_ids = ? WHERE id = ?',
//     [JSON.stringify(filtered), candidateId]
//   );
//   
//   return filtered;
// }
// ============================================================

/**
 * Get all mandates associated with a candidate (PostgreSQL)
 */
async function getCandidateMandates(candidateId) {
  const result = await query(
    'SELECT mandate_ids FROM candidates WHERE id = $1',
    [candidateId]
  );
  
  if (result.rows.length === 0) {
    throw new Error(`Candidate with ID ${candidateId} not found`);
  }
  
  const mandateIds = result.rows[0].mandate_ids;
  return typeof mandateIds === 'string' 
    ? JSON.parse(mandateIds || '[]')
    : (mandateIds || []);
}

// ============================================================
// SQLITE VERSION (COMMENTED OUT)
// ============================================================
// async function getCandidateMandates(candidateId) {
//   const db = await initDatabase();
//   
//   const row = await db.get('SELECT mandate_ids FROM candidates WHERE id = ?', [candidateId]);
//   if (!row) {
//     throw new Error(`Candidate with ID ${candidateId} not found`);
//   }
//   
//   return JSON.parse(row.mandate_ids || '[]');
// }
// ============================================================

module.exports = {
  initCandidatesTable,
  createDraftCandidate,
  createCandidate,       
  getCandidateById,
  listCandidates,
  updateCandidate,
  approveCandidate,
  rejectCandidate,
  deferCandidate,
  searchCandidates,
  deleteCandidate,
  addMandateToCandidate,
  removeMandateFromCandidate,
  getCandidateMandates,
};