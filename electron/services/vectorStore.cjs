// electron/services/vectorStore.cjs
// Vector database operations: upsert, search, delete, bulk operations
// Supports: intake_files, candidates, mandates, document_chunks

const { getClient, query: queryFn } = require('../db/pgConnection.cjs');

/**
 * Upsert embedding for a row with metadata
 * @param {string} table - Table name (intake_files, candidates, mandates, document_chunks)
 * @param {number|string} id - Row ID
 * @param {Float32Array|Array<number>} embedding - Embedding vector
 * @param {object} metadata - { model, source, normalized } optional
 * @returns {Promise<void>}
 */
async function upsertEmbedding(table, id, embedding, metadata = {}) {
  if (!table || !id) throw new Error('table and id are required');
  if (!embedding || embedding.length === 0) throw new Error('embedding cannot be empty');

  const embeddingArray = Array.isArray(embedding) ? embedding : Array.from(embedding);
  
  // Format as pgvector string: [value1,value2,value3,...]
  const vectorString = `[${embeddingArray.join(',')}]`;
  
  const model = metadata.model || 'all-MiniLM-L6-v2';
  const source = metadata.source || 'parsed';
  const normalized = metadata.normalized !== undefined ? metadata.normalized : true;
  const computedAt = metadata.computedAt || new Date().toISOString();

  // Build dynamic UPDATE based on table (all tables have same embedding columns)
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const updateQuery = `
      UPDATE ${table}
      SET embedding = $1::vector,
          embedding_model = $2,
          embedding_source = $3,
          embedding_normalized = $4,
          embedding_computed_at = $5,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $6
    `;
    const result = await client.query(updateQuery, [
      vectorString,
      model,
      source,
      normalized,
      computedAt,
      id
    ]);
    await client.query('COMMIT');

    if (result.rowCount === 0) {
      console.warn(`[vectorStore] Row not found: ${table}.id=${id}`);
    }
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`[vectorStore] Failed to upsert embedding: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Delete embedding (sets to NULL) for a row
 * @param {string} table - Table name
 * @param {number|string} id - Row ID
 * @returns {Promise<void>}
 */
async function deleteEmbedding(table, id) {
  if (!table || !id) throw new Error('table and id are required');

  const client = await getClient();
  try {
    await client.query('BEGIN');
    await client.query(
      `UPDATE ${table} SET embedding = NULL WHERE id = $1`,
      [id]
    );
    await client.query('COMMIT');
  } catch (err) {
    await client.query('ROLLBACK');
    throw new Error(`[vectorStore] Failed to delete embedding: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * K-NN search: find k nearest neighbors
 * @param {string} table - Table name
 * @param {Float32Array|Array<number>} queryEmbedding - Query vector
 * @param {number} k - Number of results to return
 * @param {object} filters - Optional filters (e.g., { status: 'APPROVED' })
 * @returns {Promise<Array>} Rows with distance score
 */
async function knnSearch(table, queryEmbedding, k = 10, filters = {}) {
  if (!table || !queryEmbedding) throw new Error('table and queryEmbedding are required');

  const embeddingArray = Array.isArray(queryEmbedding) ? queryEmbedding : Array.from(queryEmbedding);
  
  // Format as pgvector string
  const vectorString = `[${embeddingArray.join(',')}]`;

  // Build WHERE clause from filters
  let whereClause = `${table}.embedding IS NOT NULL`;
  const filterValues = [];
  let paramCount = 2; // params 1 is embedding

  Object.entries(filters).forEach(([key, value]) => {
    paramCount++;
    whereClause += ` AND ${table}.${key} = $${paramCount}`;
    filterValues.push(value);
  });

  const sql = `
    SELECT *,
           ${table}.embedding <-> $1::vector AS distance
    FROM ${table}
    WHERE ${whereClause}
    ORDER BY ${table}.embedding <-> $1::vector
    LIMIT $2
  `;

  const client = await getClient();
  try {
    const result = await client.query(sql, [vectorString, k, ...filterValues]);
    return result.rows;
  } catch (err) {
    throw new Error(`[vectorStore] k-NN search failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Hybrid search: combine full-text + vector ranking
 * @param {string} table - Table name
 * @param {string} textQuery - Text query for full-text search
 * @param {Float32Array|Array<number>} vectorQuery - Query embedding
 * @param {number} k - Number of results
 * @param {object} options - { textWeight, vectorWeight, textColumn }
 * @returns {Promise<Array>} Ranked results
 */
async function hybridSearch(table, textQuery, vectorQuery, k = 20, options = {}) {
  if (!table || !textQuery || !vectorQuery) {
    throw new Error('table, textQuery, and vectorQuery are required');
  }

  const textWeight = options.textWeight || 0.4;
  const vectorWeight = options.vectorWeight || 0.6;
  const textColumn = options.textColumn || 'parsed_text'; // adjust per table

  const embeddingArray = Array.isArray(vectorQuery) ? vectorQuery : Array.from(vectorQuery);
  
  // Format as pgvector string
  const vectorString = `[${embeddingArray.join(',')}]`;

  // Build a search-for-text query using ts_rank with vector re-ranking
  const sql = `
    WITH text_search AS (
      SELECT *,
             ts_rank_cd(to_tsvector('english', ${textColumn}), plainto_tsquery('english', $1)) AS text_rank
      FROM ${table}
      WHERE to_tsvector('english', ${textColumn}) @@ plainto_tsquery('english', $1)
    )
    SELECT *,
           text_rank,
           ${table}.embedding <-> $2::vector AS vec_distance,
           (
             ${textWeight} * (1 - text_rank) +
             ${vectorWeight} * COALESCE((${table}.embedding <-> $2::vector) / 2.0, 0.5)
           ) AS combined_score
    FROM text_search
    WHERE ${table}.embedding IS NOT NULL
    ORDER BY combined_score ASC
    LIMIT $3
  `;

  const client = await getClient();
  try {
    const result = await client.query(sql, [textQuery, vectorString, k]);
    return result.rows;
  } catch (err) {
    throw new Error(`[vectorStore] Hybrid search failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Batch upsert embeddings (for bulk operations)
 * @param {string} table - Table name
 * @param {Array<{id, embedding, metadata}>} rows - Rows to upsert
 * @param {number} batchSize - Batch size for committing
 * @returns {Promise<{succeeded: number, failed: number, errors: Array}>}
 */
async function batchUpsertEmbeddings(table, rows, batchSize = 100) {
  if (!table || !rows || rows.length === 0) {
    throw new Error('table and non-empty rows array are required');
  }

  let succeeded = 0;
  let failed = 0;
  const errors = [];

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, Math.min(i + batchSize, rows.length));
    const client = await getClient();

    try {
      await client.query('BEGIN');

      for (const row of batch) {
        try {
          const embeddingArray = Array.isArray(row.embedding)
            ? row.embedding
            : Array.from(row.embedding);
          
          // Format as pgvector string
          const vectorString = `[${embeddingArray.join(',')}]`;
          
          const metadata = row.metadata || {};
          const model = metadata.model || 'all-MiniLM-L6-v2';
          const source = metadata.source || 'parsed';
          const normalized = metadata.normalized !== undefined ? metadata.normalized : true;
          const computedAt = metadata.computedAt || new Date().toISOString();

          await client.query(
            `UPDATE ${table}
             SET embedding = $1::vector,
                 embedding_model = $2,
                 embedding_source = $3,
                 embedding_normalized = $4,
                 embedding_computed_at = $5,
                 updated_at = CURRENT_TIMESTAMP
             WHERE id = $6`,
            [vectorString, model, source, normalized, computedAt, row.id]
          );
          succeeded++;
        } catch (rowErr) {
          failed++;
          errors.push({ id: row.id, error: rowErr.message });
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      failed += batch.length;
      errors.push({ batch: i, error: err.message });
    } finally {
      client.release();
    }
  }

  console.log(
    `[vectorStore] Batch upsert: ${succeeded} succeeded, ${failed} failed`
  );
  return { succeeded, failed, errors };
}

/**
 * Find duplicate intake files by embedding similarity
 * @param {number} intakeFileId - Intake file ID
 * @param {number} distanceThreshold - Distance threshold for duplicate (default 0.15)
 * @returns {Promise<Array>} Duplicate records with distance
 */
async function findDuplicateIntakeFiles(intakeFileId, distanceThreshold = 0.15) {
  const sql = `
    SELECT id, file_name, status, quality_score,
           embedding <-> (SELECT embedding FROM intake_files WHERE id = $1) AS distance
    FROM intake_files
    WHERE id != $1
      AND embedding IS NOT NULL
      AND embedding <-> (SELECT embedding FROM intake_files WHERE id = $1) < $2
    ORDER BY distance ASC
    LIMIT 10
  `;

  const client = await getClient();
  try {
    const result = await client.query(sql, [intakeFileId, distanceThreshold]);
    return result.rows;
  } catch (err) {
    throw new Error(`[vectorStore] Duplicate detection failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Find similar candidates
 * @param {number} candidateId - Candidate ID
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Similar candidates with distance
 */
async function findSimilarCandidates(candidateId, limit = 10) {
  const sql = `
    SELECT id, name, current_title, current_firm, location,
           embedding <-> (SELECT embedding FROM candidates WHERE id = $1) AS distance
    FROM candidates
    WHERE id != $1
      AND embedding IS NOT NULL
    ORDER BY embedding <-> (SELECT embedding FROM candidates WHERE id = $1)
    LIMIT $2
  `;

  const client = await getClient();
  try {
    const result = await client.query(sql, [candidateId, limit]);
    return result.rows;
  } catch (err) {
    throw new Error(`[vectorStore] Similar candidates search failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Find chunks by similarity
 * @param {Float32Array|Array<number>} queryEmbedding - Query embedding
 * @param {number} intakeFileId - Optional filter by intake file
 * @param {number} limit - Number of results
 * @returns {Promise<Array>} Similar chunks with distance
 */
async function findSimilarChunks(queryEmbedding, intakeFileId = null, limit = 5) {
  const embeddingArray = Array.isArray(queryEmbedding)
    ? queryEmbedding
    : Array.from(queryEmbedding);

  let sql = `
    SELECT id, intake_file_id, chunk_index, chunk_type, text,
           embedding <-> $1 AS distance
    FROM document_chunks
    WHERE embedding IS NOT NULL
  `;
  const params = [embeddingArray];

  if (intakeFileId) {
    sql += ` AND intake_file_id = $${params.length + 1}`;
    params.push(intakeFileId);
  }

  sql += ` ORDER BY embedding <-> $1 LIMIT $${params.length + 1}`;
  params.push(limit);

  const client = await getClient();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } catch (err) {
    throw new Error(`[vectorStore] Chunk search failed: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Delete all chunks for an intake file
 * @param {number} intakeFileId - Intake file ID
 * @returns {Promise<number>} Number of deleted chunks
 */
async function deleteChunksByIntakeId(intakeFileId) {
  const client = await getClient();
  try {
    const result = await client.query(
      'DELETE FROM document_chunks WHERE intake_file_id = $1',
      [intakeFileId]
    );
    return result.rowCount;
  } catch (err) {
    throw new Error(`[vectorStore] Failed to delete chunks: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Delete all chunks for a candidate
 * @param {number} candidateId - Candidate ID
 * @returns {Promise<number>} Number of deleted chunks
 */
async function deleteChunksByCandidateId(candidateId) {
  const client = await getClient();
  try {
    const result = await client.query(
      'DELETE FROM document_chunks WHERE candidate_id = $1',
      [candidateId]
    );
    return result.rowCount;
  } catch (err) {
    throw new Error(`[vectorStore] Failed to delete chunks: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Insert chunk with embedding
 * @param {object} chunk - { intakeFileId, candidateId, chunkIndex, chunkType, text, embedding, metadata }
 * @returns {Promise<number>} Inserted chunk ID
 */
async function insertChunk(chunk) {
  if (!chunk.intakeFileId || !chunk.chunkIndex || !chunk.text) {
    throw new Error('intakeFileId, chunkIndex, and text are required');
  }

  const embeddingArray = chunk.embedding ? (Array.isArray(chunk.embedding) ? chunk.embedding : Array.from(chunk.embedding)) : null;
  const metadata = chunk.metadata || {};
  const model = metadata.model || 'all-MiniLM-L6-v2';
  const source = metadata.source || 'chunk';
  const normalized = metadata.normalized !== undefined ? metadata.normalized : true;
  const computedAt = metadata.computedAt || new Date().toISOString();
  const chunkType = chunk.chunkType || 'paragraph';
  const tokensCount = chunk.tokensCount || null;

  const client = await getClient();
  try {
    const result = await client.query(
      `INSERT INTO document_chunks (
        intake_file_id, candidate_id, chunk_index, chunk_type, text,
        embedding, embedding_model, embedding_source, embedding_normalized,
        embedding_computed_at, tokens_count
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING id`,
      [
        chunk.intakeFileId,
        chunk.candidateId || null,
        chunk.chunkIndex,
        chunkType,
        chunk.text,
        embeddingArray,
        model,
        source,
        normalized,
        computedAt,
        tokensCount
      ]
    );
    return result.rows[0].id;
  } catch (err) {
    throw new Error(`[vectorStore] Failed to insert chunk: ${err.message}`);
  } finally {
    client.release();
  }
}

/**
 * Get embedding statistics for a table
 * @param {string} table - Table name
 * @returns {Promise<object>} { total_rows, embedded_rows, model_versions }
 */
async function getEmbeddingStats(table) {
  const sql = `
    SELECT
      COUNT(*) as total_rows,
      COUNT(embedding) as embedded_rows,
      COUNT(DISTINCT embedding_model) as model_versions,
      array_agg(DISTINCT embedding_model) as models
    FROM ${table}
  `;

  const client = await getClient();
  try {
    const result = await client.query(sql);
    return result.rows[0];
  } catch (err) {
    throw new Error(`[vectorStore] Failed to get stats: ${err.message}`);
  } finally {
    client.release();
  }
}

module.exports = {
  upsertEmbedding,
  deleteEmbedding,
  knnSearch,
  hybridSearch,
  batchUpsertEmbeddings,
  findDuplicateIntakeFiles,
  findSimilarCandidates,
  findSimilarChunks,
  deleteChunksByIntakeId,
  deleteChunksByCandidateId,
  insertChunk,
  getEmbeddingStats,
};
