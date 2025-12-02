// electron/services/embeddingClient.cjs
// Client for generating embeddings and persisting them to the database
// Uses embeddingMapper for generation + vectorStore for persistence

const embeddingMapper = require('./embeddingMapper.cjs');
const vectorStore = require('./vectorStore.cjs');

/**
 * Generate embedding from text and persist to database
 * @param {string} table - Table name (intake_files, candidates, mandates)
 * @param {number|string} id - Row ID
 * @param {string} text - Text to embed
 * @param {object} options - { source, model, skipPersist }
 * @returns {Promise<Float32Array>} The generated embedding
 */
async function generateAndPersistEmbedding(table, id, text, options = {}) {
  if (!table || !id || !text) {
    throw new Error('table, id, and text are required');
  }

  const source = options.source || 'parsed';
  const skipPersist = options.skipPersist === true;

  try {
    console.log(`[embeddingClient] Generating embedding for ${table}.${id}`);

    // Generate embedding using embeddingMapper
    const embedding = await embeddingMapper.embedPhrase(text);

    if (!skipPersist) {
      // Persist to database
      await vectorStore.upsertEmbedding(table, id, embedding, {
        model: 'all-MiniLM-L6-v2', // default; could be configurable
        source,
        normalized: true,
        computedAt: new Date().toISOString()
      });
      console.log(`[embeddingClient] ✓ Embedding persisted for ${table}.${id}`);
    }

    return embedding;
  } catch (err) {
    console.error(`[embeddingClient] Failed to generate embedding: ${err.message}`);
    throw err;
  }
}

/**
 * Generate embedding for a semantic fit computation (candidate + mandate)
 * and persist both embeddings
 * @param {object} candidate - Candidate object with name, title, firm, etc.
 * @param {object} mandate - Mandate object with location, sectors, etc.
 * @param {object} options - { skipCandidatePersist, skipMandatePersist }
 * @returns {Promise<{candidateEmbedding, mandateEmbedding, fit}>}
 */
async function computeAndPersistSemanticFit(candidate, mandate, options = {}) {
  try {
    console.log('[embeddingClient] Computing semantic fit with embeddings...');

    // Compute semantic fit using existing function
    const fit = await embeddingMapper.computeSemanticFit(candidate, mandate);

    // For now, persist at the candidate/mandate level if IDs are provided
    // (This is for future enhancement when we have IDs in the fit context)
    // TODO: Extend candidateModel/mandateModel to call persistEmbedding on save

    return fit;
  } catch (err) {
    console.error(`[embeddingClient] Semantic fit computation failed: ${err.message}`);
    throw err;
  }
}

/**
 * Search for similar records by embedding
 * @param {string} table - Table name
 * @param {string} text - Text query
 * @param {number} k - Number of results
 * @param {object} filters - Optional filters by column
 * @returns {Promise<Array>} k-NN results with distance
 */
async function searchByText(table, text, k = 10, filters = {}) {
  try {
    console.log(`[embeddingClient] Searching ${table} for similar records...`);

    // Generate query embedding
    const queryEmbedding = await embeddingMapper.embedPhrase(text);

    // Perform k-NN search
    const results = await vectorStore.knnSearch(table, queryEmbedding, k, filters);

    console.log(`[embeddingClient] ✓ Found ${results.length} similar records`);
    return results;
  } catch (err) {
    console.error(`[embeddingClient] Search failed: ${err.message}`);
    throw err;
  }
}

/**
 * Detect duplicates for an intake file
 * @param {number} intakeFileId - Intake file ID
 * @param {number} distanceThreshold - Threshold for duplicate (0-1, default 0.15)
 * @returns {Promise<Array>} Duplicate records
 */
async function detectDuplicates(intakeFileId, distanceThreshold = 0.15) {
  try {
    console.log(`[embeddingClient] Detecting duplicates for intake_files.${intakeFileId}`);

    const duplicates = await vectorStore.findDuplicateIntakeFiles(intakeFileId, distanceThreshold);

    console.log(`[embeddingClient] ✓ Found ${duplicates.length} potential duplicates`);
    return duplicates;
  } catch (err) {
    console.error(`[embeddingClient] Duplicate detection failed: ${err.message}`);
    throw err;
  }
}

/**
 * Find similar candidates
 * @param {number} candidateId - Candidate ID
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Similar candidates with distance
 */
async function findSimilarCandidates(candidateId, limit = 10) {
  try {
    console.log(`[embeddingClient] Finding similar candidates to ${candidateId}`);

    const results = await vectorStore.findSimilarCandidates(candidateId, limit);

    console.log(`[embeddingClient] ✓ Found ${results.length} similar candidates`);
    return results;
  } catch (err) {
    console.error(`[embeddingClient] Similar candidates search failed: ${err.message}`);
    throw err;
  }
}

/**
 * Search for relevant chunks (for RAG/document retrieval)
 * @param {string} query - Text query
 * @param {number} intakeFileId - Optional: filter by intake file
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Relevant chunks with distance
 */
async function searchChunks(query, intakeFileId = null, limit = 5) {
  try {
    console.log(`[embeddingClient] Searching chunks for: "${query}"`);

    const queryEmbedding = await embeddingMapper.embedPhrase(query);
    const results = await vectorStore.findSimilarChunks(queryEmbedding, intakeFileId, limit);

    console.log(`[embeddingClient] ✓ Found ${results.length} relevant chunks`);
    return results;
  } catch (err) {
    console.error(`[embeddingClient] Chunk search failed: ${err.message}`);
    throw err;
  }
}

/**
 * Batch persist embeddings for bulk operations
 * @param {string} table - Table name
 * @param {Array<{id, text}>} records - Records with text to embed
 * @param {number} batchSize - Batch size
 * @returns {Promise<{succeeded, failed, errors}>}
 */
async function batchGenerateAndPersist(table, records, batchSize = 50) {
  if (!records || records.length === 0) {
    throw new Error('records array is required');
  }

  console.log(`[embeddingClient] Batch processing ${records.length} records...`);

  const rows = [];
  let embeddingErrors = 0;

  // Generate embeddings for all records
  for (const record of records) {
    try {
      const embedding = await embeddingMapper.embedPhrase(record.text);
      rows.push({
        id: record.id,
        embedding,
        metadata: {
          model: 'all-MiniLM-L6-v2',
          source: 'batch_import',
          normalized: true
        }
      });
    } catch (err) {
      console.error(`[embeddingClient] Failed to embed record ${record.id}: ${err.message}`);
      embeddingErrors++;
    }
  }

  console.log(`[embeddingClient] Generated ${rows.length} embeddings (${embeddingErrors} errors)`);

  // Batch upsert to database
  const result = await vectorStore.batchUpsertEmbeddings(table, rows, batchSize);

  return {
    ...result,
    embeddingErrors
  };
}

/**
 * Get embedding statistics for a table
 * @param {string} table - Table name
 * @returns {Promise<object>} Stats on embeddings
 */
async function getStats(table) {
  try {
    const stats = await vectorStore.getEmbeddingStats(table);
    console.log(`[embeddingClient] Stats for ${table}:`, stats);
    return stats;
  } catch (err) {
    console.error(`[embeddingClient] Failed to get stats: ${err.message}`);
    throw err;
  }
}

module.exports = {
  generateAndPersistEmbedding,
  computeAndPersistSemanticFit,
  searchByText,
  detectDuplicates,
  findSimilarCandidates,
  searchChunks,
  batchGenerateAndPersist,
  getStats,
};
