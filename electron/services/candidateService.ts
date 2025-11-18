/**
 * Candidate Service
 * Handles candidate creation, approval, and rejection workflows
 */

import { Database } from 'sqlite';
import { ParsedCv, Candidate, CandidateStatus } from '../types/scoring';

/**
 * Create a draft candidate from parsed CV data
 */
export async function createDraftCandidate(
  db: Database,
  parsed: ParsedCv
): Promise<number> {
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

  const values = [
    parsed.name,
    parsed.current_title || null,
    parsed.current_firm || null,
    parsed.location || null,
    JSON.stringify(parsed.sectors || []),
    JSON.stringify(parsed.functions || []),
    JSON.stringify(parsed.asset_classes || []),
    JSON.stringify(parsed.geographies || []),
    parsed.seniority || null,
    'DRAFT' as CandidateStatus,
  ];

  try {
    const result = await db.run(query, values);
    return result.lastID!;
  } catch (error) {
    console.error('Error creating draft candidate:', error);
    throw new Error(`Failed to create draft candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get candidate by ID
 */
export async function getCandidateById(
  db: Database,
  candidateId: number
): Promise<Candidate | null> {
  const query = `
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
      created_at
    FROM candidates
    WHERE id = ?
  `;

  try {
    const row = await db.get(query, [candidateId]);
    
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
    } as Candidate;
  } catch (error) {
    console.error('Error fetching candidate:', error);
    throw new Error(`Failed to fetch candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Approve a candidate
 * Sets candidate status to ACTIVE and updates associated intake file to APPROVED
 */
export async function approveCandidate(
  db: Database,
  candidateId: number
): Promise<void> {
  try {
    await db.run('BEGIN TRANSACTION');

    // Update candidate status to ACTIVE
    await db.run(
      `UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ['ACTIVE', candidateId]
    );

    // Update associated intake file status to APPROVED
    await db.run(
      `UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?`,
      ['APPROVED', candidateId]
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error approving candidate:', error);
    throw new Error(`Failed to approve candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reject a candidate
 * Sets candidate status to ARCHIVED and updates associated intake file to REJECTED
 */
export async function rejectCandidate(
  db: Database,
  candidateId: number
): Promise<void> {
  try {
    await db.run('BEGIN TRANSACTION');

    // Update candidate status to ARCHIVED
    await db.run(
      `UPDATE candidates SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      ['ARCHIVED', candidateId]
    );

    // Update associated intake file status to REJECTED
    await db.run(
      `UPDATE intake_files SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE candidate_id = ?`,
      ['REJECTED', candidateId]
    );

    await db.run('COMMIT');
  } catch (error) {
    await db.run('ROLLBACK');
    console.error('Error rejecting candidate:', error);
    throw new Error(`Failed to reject candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all candidates with a specific status
 */
export async function getCandidatesByStatus(
  pool: Pool,
  status: CandidateStatus
): Promise<Candidate[]> {
  const query = `
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
      created_at
    FROM candidates
    WHERE status = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [status]);
    return result.rows as Candidate[];
  } catch (error) {
    console.error('Error fetching candidates by status:', error);
    throw new Error(`Failed to fetch candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update candidate information
 */
export async function updateCandidate(
  pool: Pool,
  candidateId: number,
  updates: Partial<Omit<Candidate, 'id' | 'created_at'>>
): Promise<void> {
  const fields: string[] = [];
  const values: unknown[] = [];
  let paramIndex = 1;

  // Build dynamic update query
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
    values.push(updates.sectors);
  }
  if (updates.functions !== undefined) {
    fields.push(`functions = $${paramIndex++}`);
    values.push(updates.functions);
  }
  if (updates.asset_classes !== undefined) {
    fields.push(`asset_classes = $${paramIndex++}`);
    values.push(updates.asset_classes);
  }
  if (updates.geographies !== undefined) {
    fields.push(`geographies = $${paramIndex++}`);
    values.push(updates.geographies);
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

  fields.push(`updated_at = now()`);
  values.push(candidateId);

  const query = `
    UPDATE candidates
    SET ${fields.join(', ')}
    WHERE id = $${paramIndex}
  `;

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error('Error updating candidate:', error);
    throw new Error(`Failed to update candidate: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Delete a candidate (soft delete by archiving)
 */
export async function deleteCandidate(
  pool: Pool,
  candidateId: number
): Promise<void> {
  await updateCandidate(pool, candidateId, { status: 'ARCHIVED' });
}

/**
 * Search candidates by name
 */
export async function searchCandidatesByName(
  pool: Pool,
  searchTerm: string
): Promise<Candidate[]> {
  const query = `
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
      created_at
    FROM candidates
    WHERE name ILIKE $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [`%${searchTerm}%`]);
    return result.rows as Candidate[];
  } catch (error) {
    console.error('Error searching candidates:', error);
    throw new Error(`Failed to search candidates: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
