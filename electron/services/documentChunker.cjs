/**
 * Document Chunking Service
 * ========================
 * Splits documents into semantic chunks for RAG workflows
 * Generates embeddings for each chunk for similarity search
 * 
 * Chunk Strategy:
 * - Split by sections first (Education, Experience, Skills, etc.)
 * - Then split large sections into ~250-500 token chunks
 * - Overlap of 50 tokens to maintain context across chunks
 * - Track source metadata for attribution
 */

const embeddingMapper = require('./embeddingMapper.cjs');
const { query } = require('../db/pgConnection.cjs');

// Approximate tokens per word (varies, but 1 word ≈ 1.3 tokens)
const TOKENS_PER_WORD = 1.3;
const TARGET_TOKENS_PER_CHUNK = 300; // 250-500 range, aiming for middle
const OVERLAP_TOKENS = 50;

/**
 * Estimate token count from text
 * Rule of thumb: 1 word ≈ 1.3 tokens for English text
 */
function estimateTokens(text) {
  if (!text) return 0;
  const words = text.split(/\s+/).length;
  return Math.ceil(words * TOKENS_PER_WORD);
}

/**
 * Split text into chunks with overlap
 * Returns array of { text, startChar, endChar, tokens, overlap }
 */
function splitIntoChunks(text, targetTokens = TARGET_TOKENS_PER_CHUNK, overlapTokens = OVERLAP_TOKENS) {
  if (!text || text.trim().length === 0) return [];

  const chunks = [];
  const words = text.split(/(\s+)/); // Keep whitespace to reconstruct text
  const targetWords = Math.ceil(targetTokens / TOKENS_PER_WORD);
  const overlapWords = Math.ceil(overlapTokens / TOKENS_PER_WORD);

  let currentChunk = [];
  let startIdx = 0;

  for (let i = 0; i < words.length; i++) {
    currentChunk.push(words[i]);

    // Check if we've reached target chunk size
    if (currentChunk.length >= targetWords) {
      const chunkText = currentChunk.join('').trim();
      if (chunkText.length > 0) {
        chunks.push({
          text: chunkText,
          tokens: estimateTokens(chunkText),
          wordCount: currentChunk.filter(w => w.trim()).length,
        });
      }

      // Create overlap: keep last N words for next chunk's start
      currentChunk = currentChunk.slice(-overlapWords);
      startIdx = i - overlapWords;
    }
  }

  // Add remaining chunk if any
  if (currentChunk.length > 0) {
    const chunkText = currentChunk.join('').trim();
    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        tokens: estimateTokens(chunkText),
        wordCount: currentChunk.filter(w => w.trim()).length,
      });
    }
  }

  return chunks;
}

/**
 * Extract section from text (e.g., Education, Experience)
 * Returns { sectionName, content, startIdx, endIdx }
 */
function extractSection(text, sectionName) {
  const regex = new RegExp(`\\b${sectionName}\\b[\\s\\n]*(.+?)(?=\\b(?:Education|Experience|Skills|Certifications|Projects|Awards|Languages|References|Summary|Objective|Professional)\\b|$)`, 'is');
  const match = text.match(regex);

  if (!match) return null;

  return {
    sectionName,
    content: match[1].trim(),
    startIdx: match.index,
    endIdx: match.index + match[0].length,
  };
}

/**
 * Chunk document by sections, then further split large sections
 * Returns array of { text, section, chunkIndex, source }
 */
function chunkDocumentBySections(text) {
  const sections = [
    'Summary',
    'Objective',
    'Professional',
    'Experience',
    'Education',
    'Skills',
    'Certifications',
    'Projects',
    'Awards',
    'Languages',
    'References',
  ];

  const chunks = [];
  let globalChunkIndex = 0;

  for (const sectionName of sections) {
    const section = extractSection(text, sectionName);
    if (!section || !section.content) continue;

    // Split large sections into smaller chunks
    const subChunks = splitIntoChunks(section.content);
    for (let i = 0; i < subChunks.length; i++) {
      chunks.push({
        text: subChunks[i].text,
        section: sectionName,
        chunkIndex: globalChunkIndex++,
        tokens: subChunks[i].tokens,
        source: `${sectionName}_chunk_${i + 1}_of_${subChunks.length}`,
      });
    }
  }

  // If no sections found, chunk the entire text
  if (chunks.length === 0) {
    const textChunks = splitIntoChunks(text);
    for (let i = 0; i < textChunks.length; i++) {
      chunks.push({
        text: textChunks[i].text,
        section: 'Full Text',
        chunkIndex: globalChunkIndex++,
        tokens: textChunks[i].tokens,
        source: `full_text_chunk_${i + 1}_of_${textChunks.length}`,
      });
    }
  }

  return chunks;
}

/**
 * Process intake file: chunk text and generate embeddings
 * 
 * @param {number} intakeFileId - ID of intake_files record
 * @param {number} candidateId - ID of candidates record (optional, for linking chunks to candidate)
 * @param {string} text - Raw text to chunk
 * @param {object} options - { batchSize, dryRun }
 * @returns { success: bool, chunksCreated: number, chunksWithErrors: array }
 */
async function processIntakeFileChunks(intakeFileId, candidateId, text, options = {}) {
  const { batchSize = 10, dryRun = false } = options;

  if (!text || text.trim().length === 0) {
    console.log('[documentChunker] ⚠️ Empty text provided, skipping chunking');
    return { success: false, chunksCreated: 0, chunksWithErrors: [] };
  }

  console.log(`[documentChunker] Processing chunks for intake_file ${intakeFileId}...`);

  try {
    // Step 1: Chunk the document
    const chunks = chunkDocumentBySections(text);
    console.log(`[documentChunker] Created ${chunks.length} chunks from ${text.length} characters`);

    if (chunks.length === 0) {
      console.log('[documentChunker] ⚠️ No chunks generated');
      return { success: false, chunksCreated: 0, chunksWithErrors: [] };
    }

    if (dryRun) {
      console.log('[documentChunker] DRY RUN: Would create', chunks.length, 'chunks');
      return { success: true, chunksCreated: chunks.length, chunksWithErrors: [], dryRun: true };
    }

    // Step 2: Generate embeddings and batch insert
    const chunksWithErrors = [];
    let successCount = 0;

    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, Math.min(i + batchSize, chunks.length));

      // Generate embeddings for batch
      const chunksWithEmbeddings = await Promise.all(
        batch.map(async (chunk) => {
          try {
            // Generate embedding for this chunk
            const embedding = await embeddingMapper.embedPhrase(chunk.text);
            return {
              ...chunk,
              embedding,
              embedding_model: 'all-MiniLM-L6-v2',
              embedding_source: 'chunk',
              embedding_computed_at: new Date(),
            };
          } catch (error) {
            console.error(`[documentChunker] Failed to generate embedding for chunk ${chunk.chunkIndex}:`, error.message);
            chunksWithErrors.push({
              chunkIndex: chunk.chunkIndex,
              error: error.message,
            });
            return null;
          }
        })
      );

      // Insert into document_chunks table
      const validChunks = chunksWithEmbeddings.filter(c => c !== null);

      for (const chunk of validChunks) {
        try {
          await query(
            `INSERT INTO document_chunks (
              intake_file_id,
              candidate_id,
              chunk_index,
              chunk_type,
              text,
              embedding,
              embedding_model,
              embedding_source,
              embedding_computed_at,
              embedding_normalized,
              tokens_count,
              created_at,
              updated_at
            ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
            [
              intakeFileId,
              candidateId || null,
              chunk.chunkIndex,
              chunk.section,
              chunk.text,
              JSON.stringify(chunk.embedding),
              chunk.embedding_model,
              chunk.embedding_source,
              chunk.embedding_computed_at,
              true,
              chunk.tokens,
            ]
          );
          successCount++;
        } catch (error) {
          console.error(`[documentChunker] Failed to insert chunk ${chunk.chunkIndex}:`, error.message);
          chunksWithErrors.push({
            chunkIndex: chunk.chunkIndex,
            error: error.message,
          });
        }
      }

      console.log(`[documentChunker] ✅ Processed batch ${Math.floor(i / batchSize) + 1}/${Math.ceil(chunks.length / batchSize)}`);
    }

    console.log(`[documentChunker] ✅ Created ${successCount}/${chunks.length} chunks for intake_file ${intakeFileId}`);

    return {
      success: true,
      chunksCreated: successCount,
      chunksWithErrors,
      totalChunks: chunks.length,
    };
  } catch (error) {
    console.error('[documentChunker] ❌ Fatal error processing chunks:', error.message);
    return {
      success: false,
      chunksCreated: 0,
      chunksWithErrors: [{ error: error.message }],
    };
  }
}

/**
 * Delete all chunks for an intake file
 * This is called automatically via CASCADE DELETE in the migration,
 * but provided here for explicit cleanup if needed
 */
async function deleteChunksByIntakeFileId(intakeFileId) {
  try {
    const result = await query(
      'DELETE FROM document_chunks WHERE intake_file_id = $1',
      [intakeFileId]
    );
    console.log(`[documentChunker] Deleted ${result.rowCount} chunks for intake_file ${intakeFileId}`);
    return result.rowCount;
  } catch (error) {
    console.error(`[documentChunker] Failed to delete chunks for intake_file ${intakeFileId}:`, error.message);
    throw error;
  }
}

/**
 * Search chunks by semantic similarity
 * Returns array of { id, text, chunk_index, section, distance }
 */
async function searchChunksBySimilarity(queryText, intakeFileId, limit = 10) {
  try {
    // Generate query embedding
    const queryEmbedding = await embeddingMapper.embedPhrase(queryText);

    // Search in database
    const result = await query(
      `SELECT 
        id,
        text,
        chunk_index,
        chunk_type as section,
        embedding <-> $1::vector as distance
      FROM document_chunks
      WHERE intake_file_id = $2
      ORDER BY embedding <-> $1::vector
      LIMIT $3`,
      [JSON.stringify(queryEmbedding), intakeFileId, limit]
    );

    console.log(`[documentChunker] Found ${result.rows.length} similar chunks for query in intake_file ${intakeFileId}`);
    return result.rows;
  } catch (error) {
    console.error('[documentChunker] Failed to search chunks:', error.message);
    throw error;
  }
}

/**
 * Get chunk statistics for monitoring
 */
async function getChunkStats(intakeFileId = null) {
  try {
    let sql = 'SELECT COUNT(*) as total, SUM(tokens_count) as total_tokens, AVG(tokens_count) as avg_tokens FROM document_chunks';
    const params = [];

    if (intakeFileId) {
      sql += ' WHERE intake_file_id = $1';
      params.push(intakeFileId);
    }

    const result = await query(sql, params);
    return result.rows[0];
  } catch (error) {
    console.error('[documentChunker] Failed to get chunk stats:', error.message);
    throw error;
  }
}

/**
 * Re-chunk an existing intake file (delete old chunks, create new)
 * Useful when chunking strategy changes or text is updated
 */
async function rechunkIntakeFile(intakeFileId, candidateId, text, options = {}) {
  try {
    console.log(`[documentChunker] Re-chunking intake_file ${intakeFileId}...`);

    // Delete old chunks
    await deleteChunksByIntakeFileId(intakeFileId);
    console.log(`[documentChunker] Deleted old chunks for intake_file ${intakeFileId}`);

    // Create new chunks
    const result = await processIntakeFileChunks(intakeFileId, candidateId, text, options);
    return result;
  } catch (error) {
    console.error(`[documentChunker] Failed to re-chunk intake_file ${intakeFileId}:`, error.message);
    throw error;
  }
}

module.exports = {
  // Core chunking
  splitIntoChunks,
  chunkDocumentBySections,
  estimateTokens,

  // Embedding and storage
  processIntakeFileChunks,
  deleteChunksByIntakeFileId,
  rechunkIntakeFile,

  // Search and retrieval
  searchChunksBySimilarity,
  getChunkStats,

  // Configuration
  TOKENS_PER_WORD,
  TARGET_TOKENS_PER_CHUNK,
  OVERLAP_TOKENS,
};
