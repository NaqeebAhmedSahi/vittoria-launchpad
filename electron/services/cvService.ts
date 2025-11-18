/**
 * CV Service
 * Handles CV processing, quality scoring, and candidate creation
 */

import { Pool } from 'pg';
import {
  ParsedCv,
  IntakeFile,
  IntakeFileStatus,
} from '../types/scoring';
import { computeCvQuality, getQualityThresholds } from './scoringService';
import { createDraftCandidate } from './candidateService';

/**
 * Process a parsed CV: compute quality, save results, and auto-create candidate if threshold met
 */
export async function processParsedCv(
  pool: Pool,
  intakeId: number,
  parsed: ParsedCv
): Promise<{
  status: IntakeFileStatus;
  qualityScore: number;
  candidateId?: number;
}> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Compute CV quality
    const qualityResult = computeCvQuality(parsed);
    const thresholds = getQualityThresholds();

    let status: IntakeFileStatus;
    let candidateId: number | undefined;

    // Determine action based on quality score
    if (qualityResult.score >= thresholds.good) {
      // Auto-create draft candidate
      candidateId = await createDraftCandidate(pool, parsed);
      status = 'PARSED';

      // Update intake file with candidate link
      await client.query(
        `UPDATE intake_files 
         SET status = $1, quality_score = $2, parsed_json = $3, candidate_id = $4, updated_at = now()
         WHERE id = $5`,
        [status, qualityResult.score, JSON.stringify(parsed), candidateId, intakeId]
      );
    } else {
      // Quality below threshold - needs review
      status = 'NEEDS_REVIEW';

      await client.query(
        `UPDATE intake_files 
         SET status = $1, quality_score = $2, parsed_json = $3, updated_at = now()
         WHERE id = $4`,
        [status, qualityResult.score, JSON.stringify(parsed), intakeId]
      );
    }

    await client.query('COMMIT');

    return {
      status,
      qualityScore: qualityResult.score,
      candidateId,
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing parsed CV:', error);
    throw new Error(`Failed to process parsed CV: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

/**
 * Create a new intake file entry
 */
export async function createIntakeFile(
  pool: Pool,
  fileName: string
): Promise<number> {
  const query = `
    INSERT INTO intake_files (file_name, status)
    VALUES ($1, $2)
    RETURNING id
  `;

  try {
    const result = await pool.query(query, [fileName, 'NEW']);
    return result.rows[0].id;
  } catch (error) {
    console.error('Error creating intake file:', error);
    throw new Error(`Failed to create intake file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Update intake file status
 */
export async function updateIntakeFileStatus(
  pool: Pool,
  intakeId: number,
  status: IntakeFileStatus
): Promise<void> {
  const query = `
    UPDATE intake_files
    SET status = $1, updated_at = now()
    WHERE id = $2
  `;

  try {
    await pool.query(query, [status, intakeId]);
  } catch (error) {
    console.error('Error updating intake file status:', error);
    throw new Error(`Failed to update intake file status: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get intake file by ID
 */
export async function getIntakeFileById(
  pool: Pool,
  intakeId: number
): Promise<IntakeFile | null> {
  const query = `
    SELECT 
      id,
      file_name,
      status,
      quality_score,
      parsed_json,
      candidate_id,
      created_at
    FROM intake_files
    WHERE id = $1
  `;

  try {
    const result = await pool.query(query, [intakeId]);
    
    if (result.rows.length === 0) {
      return null;
    }

    return result.rows[0] as IntakeFile;
  } catch (error) {
    console.error('Error fetching intake file:', error);
    throw new Error(`Failed to fetch intake file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all intake files with a specific status
 */
export async function getIntakeFilesByStatus(
  pool: Pool,
  status: IntakeFileStatus
): Promise<IntakeFile[]> {
  const query = `
    SELECT 
      id,
      file_name,
      status,
      quality_score,
      parsed_json,
      candidate_id,
      created_at
    FROM intake_files
    WHERE status = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [status]);
    return result.rows as IntakeFile[];
  } catch (error) {
    console.error('Error fetching intake files by status:', error);
    throw new Error(`Failed to fetch intake files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get all intake files
 */
export async function getAllIntakeFiles(pool: Pool): Promise<IntakeFile[]> {
  const query = `
    SELECT 
      id,
      file_name,
      status,
      quality_score,
      parsed_json,
      candidate_id,
      created_at
    FROM intake_files
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query);
    return result.rows as IntakeFile[];
  } catch (error) {
    console.error('Error fetching all intake files:', error);
    throw new Error(`Failed to fetch intake files: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Manually create candidate from intake file (for files that needed review)
 */
export async function createCandidateFromIntake(
  pool: Pool,
  intakeId: number
): Promise<number> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Get intake file
    const intakeFile = await getIntakeFileById(pool, intakeId);
    
    if (!intakeFile) {
      throw new Error(`Intake file with ID ${intakeId} not found`);
    }

    if (!intakeFile.parsed_json) {
      throw new Error(`Intake file with ID ${intakeId} has no parsed data`);
    }

    if (intakeFile.candidate_id) {
      throw new Error(`Intake file with ID ${intakeId} already has a candidate`);
    }

    // Create draft candidate
    const candidateId = await createDraftCandidate(pool, intakeFile.parsed_json);

    // Update intake file
    await client.query(
      `UPDATE intake_files 
       SET candidate_id = $1, status = $2, updated_at = now()
       WHERE id = $3`,
      [candidateId, 'PARSED', intakeId]
    );

    await client.query('COMMIT');

    return candidateId;
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error creating candidate from intake:', error);
    throw new Error(`Failed to create candidate from intake: ${error instanceof Error ? error.message : 'Unknown error'}`);
  } finally {
    client.release();
  }
}

/**
 * Delete intake file
 */
export async function deleteIntakeFile(
  pool: Pool,
  intakeId: number
): Promise<void> {
  const query = `
    DELETE FROM intake_files
    WHERE id = $1
  `;

  try {
    await pool.query(query, [intakeId]);
  } catch (error) {
    console.error('Error deleting intake file:', error);
    throw new Error(`Failed to delete intake file: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
