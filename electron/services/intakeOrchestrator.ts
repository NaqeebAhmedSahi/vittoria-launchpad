/**
 * Intake Orchestrator
 * End-to-end pipeline for CV upload, parsing, scoring, and candidate creation
 */

import { Pool } from 'pg';
import * as fs from 'fs';
import * as path from 'path';
import {
  ParsedCv,
  CvUploadResult,
} from '../types/scoring';
import {
  createIntakeFile,
  updateIntakeFileStatus,
  processParsedCv,
} from './cvService';
import {
  computeFitScore,
  getDummyMandate,
} from './scoringService';
import { getCandidateById } from './candidateService';

/**
 * Save match score to database
 */
async function saveMatchScore(
  pool: Pool,
  candidateId: number,
  mandateId: number | null,
  finalScore: number,
  dimensionScores: {
    sector: number;
    function: number;
    assetClass: number;
    geography: number;
    seniority: number;
  }
): Promise<void> {
  const query = `
    INSERT INTO match_scores (
      candidate_id,
      mandate_id,
      final_score,
      dimension_scores
    ) VALUES ($1, $2, $3, $4)
  `;

  const values = [
    candidateId,
    mandateId,
    finalScore,
    JSON.stringify(dimensionScores),
  ];

  try {
    await pool.query(query, values);
  } catch (error) {
    console.error('Error saving match score:', error);
    throw new Error(`Failed to save match score: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Extract text from a file (placeholder - implement based on your file parser)
 * This is a simple implementation that reads plain text files
 * You should replace this with your actual PDF/DOCX parser
 */
async function extractTextFromFile(filePath: string): Promise<string> {
  try {
    // Check if file exists
    if (!fs.existsSync(filePath)) {
      throw new Error(`File not found: ${filePath}`);
    }

    const ext = path.extname(filePath).toLowerCase();

    // For now, just handle .txt files
    // TODO: Integrate PDF parser (pdf-parse) and DOCX parser (mammoth)
    if (ext === '.txt') {
      return fs.readFileSync(filePath, 'utf-8');
    }

    // Placeholder for PDF/DOCX extraction
    // You should implement your LLM-based parser here
    throw new Error(`File type ${ext} not yet supported. Implement PDF/DOCX parser.`);
  } catch (error) {
    console.error('Error extracting text from file:', error);
    throw new Error(`Failed to extract text: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Parse raw text into structured CV data
 * This is a placeholder - implement with your LLM parser
 */
async function parseTextToCv(rawText: string): Promise<ParsedCv> {
  // TODO: Implement actual LLM-based parsing
  // For now, return a minimal structure
  
  // This is where you'd call your LLM adapter to parse the CV
  // Example: const parsed = await llmAdapter.parseCv(rawText);
  
  // Placeholder implementation - extract basic info from text
  const lines = rawText.split('\n').filter(line => line.trim());
  
  return {
    name: lines[0] || 'Unknown',
    current_title: undefined,
    current_firm: undefined,
    location: undefined,
    sectors: [],
    functions: [],
    asset_classes: [],
    geographies: [],
    seniority: '',
    experience: [],
    education: [],
    raw_text: rawText,
  };
}

/**
 * Main orchestrator: Handle CV upload end-to-end
 * 
 * Flow:
 * 1. Create intake file entry
 * 2. Extract text from file
 * 3. Parse text to structured CV
 * 4. Compute CV quality
 * 5. Auto-create draft candidate if quality >= threshold
 * 6. Compute fit score against dummy mandate
 * 7. Save match score
 * 8. Return results
 */
export async function handleCvUpload(
  pool: Pool,
  intakeId: number,
  filePath: string
): Promise<CvUploadResult> {
  try {
    // Step 1: Update status to PARSING
    await updateIntakeFileStatus(pool, intakeId, 'PARSING');

    // Step 2: Extract text from file
    const rawText = await extractTextFromFile(filePath);

    // Step 3: Parse text to structured CV
    const parsed = await parseTextToCv(rawText);

    // Step 4-5: Process parsed CV (compute quality, auto-create candidate)
    const processResult = await processParsedCv(pool, intakeId, parsed);

    // Step 6-7: Compute fit score if candidate was created
    let fitScore: number | undefined;

    if (processResult.candidateId) {
      const dummyMandate = getDummyMandate();
      const fitResult = computeFitScore(parsed, dummyMandate);
      fitScore = fitResult.finalScore;

      // Save match score
      await saveMatchScore(
        pool,
        processResult.candidateId,
        null, // No real mandate ID yet
        fitResult.finalScore,
        fitResult.dimensionScores
      );
    }

    // Step 8: Return results
    return {
      intakeStatus: processResult.status,
      candidateId: processResult.candidateId,
      cvQualityScore: processResult.qualityScore,
      fitScore,
    };
  } catch (error) {
    // Update intake file to error state
    try {
      await updateIntakeFileStatus(pool, intakeId, 'NEEDS_REVIEW');
    } catch (updateError) {
      console.error('Failed to update intake status after error:', updateError);
    }

    console.error('Error in CV upload pipeline:', error);
    throw new Error(`CV upload pipeline failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Handle CV upload from file path (creates intake entry)
 */
export async function handleNewCvUpload(
  pool: Pool,
  filePath: string
): Promise<CvUploadResult> {
  try {
    const fileName = path.basename(filePath);
    
    // Create intake file entry
    const intakeId = await createIntakeFile(pool, fileName);

    // Process the CV
    return await handleCvUpload(pool, intakeId, filePath);
  } catch (error) {
    console.error('Error handling new CV upload:', error);
    throw new Error(`Failed to handle CV upload: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Reprocess an existing intake file
 */
export async function reprocessIntakeFile(
  pool: Pool,
  intakeId: number,
  filePath: string
): Promise<CvUploadResult> {
  return await handleCvUpload(pool, intakeId, filePath);
}

/**
 * Batch process multiple CV files
 */
export async function batchProcessCvs(
  pool: Pool,
  filePaths: string[]
): Promise<CvUploadResult[]> {
  const results: CvUploadResult[] = [];

  for (const filePath of filePaths) {
    try {
      const result = await handleNewCvUpload(pool, filePath);
      results.push(result);
    } catch (error) {
      console.error(`Failed to process ${filePath}:`, error);
      // Continue with next file
      results.push({
        intakeStatus: 'NEEDS_REVIEW',
        cvQualityScore: 0,
      });
    }
  }

  return results;
}

/**
 * Get match scores for a candidate
 */
export async function getMatchScoresForCandidate(
  pool: Pool,
  candidateId: number
): Promise<Array<{
  id: number;
  candidate_id: number;
  mandate_id: number | null;
  final_score: number;
  dimension_scores: {
    sector: number;
    function: number;
    assetClass: number;
    geography: number;
    seniority: number;
  };
  created_at: Date;
}>> {
  const query = `
    SELECT 
      id,
      candidate_id,
      mandate_id,
      final_score,
      dimension_scores,
      created_at
    FROM match_scores
    WHERE candidate_id = $1
    ORDER BY created_at DESC
  `;

  try {
    const result = await pool.query(query, [candidateId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching match scores:', error);
    throw new Error(`Failed to fetch match scores: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get top matching candidates for a mandate
 */
export async function getTopMatchesForMandate(
  pool: Pool,
  mandateId: number | null,
  limit: number = 10
): Promise<Array<{
  candidate: {
    id: number;
    name: string;
    current_title?: string;
    current_firm?: string;
  };
  match_score: {
    final_score: number;
    dimension_scores: {
      sector: number;
      function: number;
      assetClass: number;
      geography: number;
      seniority: number;
    };
  };
}>> {
  const query = `
    SELECT 
      c.id,
      c.name,
      c.current_title,
      c.current_firm,
      ms.final_score,
      ms.dimension_scores
    FROM match_scores ms
    JOIN candidates c ON ms.candidate_id = c.id
    WHERE ms.mandate_id ${mandateId === null ? 'IS NULL' : '= $1'}
    AND c.status = 'ACTIVE'
    ORDER BY ms.final_score DESC
    LIMIT ${limit}
  `;

  try {
    const result = mandateId === null
      ? await pool.query(query)
      : await pool.query(query, [mandateId]);

    return result.rows.map((row: {
      id: number;
      name: string;
      current_title?: string;
      current_firm?: string;
      final_score: number;
      dimension_scores: {
        sector: number;
        function: number;
        assetClass: number;
        geography: number;
        seniority: number;
      };
    }) => ({
      candidate: {
        id: row.id,
        name: row.name,
        current_title: row.current_title,
        current_firm: row.current_firm,
      },
      match_score: {
        final_score: row.final_score,
        dimension_scores: row.dimension_scores,
      },
    }));
  } catch (error) {
    console.error('Error fetching top matches:', error);
    throw new Error(`Failed to fetch top matches: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
