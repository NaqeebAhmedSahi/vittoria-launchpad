# pgvector Integration Setup & Operations Guide

This guide covers installing pgvector, running migrations, using the vector services, and testing the integration.

## Quick Start (5 minutes)

### 1. Install pgvector Extension

**PostgreSQL 15+ on Linux (Debian/Ubuntu):**
```bash
sudo apt-get update
sudo apt-get install -y postgresql-server-dev-15 postgresql-contrib-15
cd /tmp && git clone https://github.com/pgvector/pgvector.git
cd pgvector && make && sudo make install
psql -h localhost -U postgres -d vittoria_launchpad -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**Using Docker (recommended for dev):**
```bash
docker run --name pgvector-dev \
  -e POSTGRES_PASSWORD=dev \
  -e POSTGRES_DB=vittoria_launchpad \
  -p 5432:5432 \
  -d ankane/pgvector:v0.5.1

# Create extension inside container
docker exec pgvector-dev psql -U postgres -d vittoria_launchpad -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

**macOS (Homebrew):**
```bash
# If using Homebrew Postgres
brew install postgresql@15
brew install pgvector
# Start/restart postgres, then:
psql -h localhost -U postgres -d vittoria_launchpad -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

### 2. Run Database Migrations

```bash
# Migrations are run automatically on app startup (databaseInitializer.cjs)
# Or manually run:
psql -h localhost -U postgres -d vittoria_launchpad -f migrations/006_add_pgvector_embeddings.sql
```

### 3. Verify Installation

```bash
psql -h localhost -U postgres -d vittoria_launchpad -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
# Should show: vector | 0.5.1 | ...

psql -h localhost -U postgres -d vittoria_launchpad -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'intake_files' AND column_name = 'embedding';"
# Should show: embedding
```

---

## Architecture & Components

### Files Added/Modified

| File | Purpose |
|------|---------|
| `migrations/006_add_pgvector_embeddings.sql` | SQL migration to add vector columns, indexes, triggers, helper functions |
| `electron/services/vectorStore.cjs` | Low-level DB operations (upsert, search, delete, batch) |
| `electron/services/embeddingClient.cjs` | High-level client (generate → persist, search, duplicate detection) |
| `PGVECTOR_INTEGRATION_PLAN.md` | Detailed design & implementation guide |
| `scripts/test-pgvector-integration.cjs` | Integration tests (manual + automated) |
| `docs/PGVECTOR_SETUP.md` | This file |

### Database Schema Changes

#### Tables with Vector Columns
- **intake_files**: `embedding vector(384)` + metadata columns
- **candidates**: `embedding vector(384)` + metadata columns
- **mandates** (if exists): `embedding vector(384)` + metadata columns
- **document_chunks** (NEW): Stores chunked embeddings for retrieval

#### Indexes Created
- `intake_files_embedding_idx` — ivfflat index for k-NN search
- `candidates_embedding_idx` — ivfflat index
- `document_chunks_embedding_idx` — ivfflat index
- Supporting indexes on foreign keys and timestamps

#### Helper Functions (SQL)
- `find_duplicate_intake_files(id, threshold)` — Find duplicates
- `find_similar_candidates(id, limit)` — Find similar candidates
- `find_similar_chunks(embedding, intake_file_id, limit)` — Find relevant chunks

---

## Usage Examples

### 1. Generate & Persist Embedding on Ingest

```javascript
// In your intake file creation handler
const embeddingClient = require('../electron/services/embeddingClient.cjs');

async function handleIntakeFileCreated(intakeFileId, parsedText) {
  try {
    // Generate embedding and persist to DB
    await embeddingClient.generateAndPersistEmbedding(
      'intake_files',
      intakeFileId,
      parsedText,
      { source: 'parsed_text' }
    );
    console.log('✓ Embedding persisted');
  } catch (err) {
    console.error('❌ Embedding failed:', err);
  }
}
```

### 2. Search for Similar Records

```javascript
// Search for similar candidates
const results = await embeddingClient.searchByText(
  'candidates',
  'Senior manager with 15 years fintech experience',
  k=10
);

console.log(`Found ${results.length} similar candidates:`);
results.forEach(r => {
  console.log(`  - ${r.name} (distance: ${r.distance.toFixed(3)})`);
});
```

### 3. Detect Duplicates

```javascript
// Check if newly uploaded CV is a duplicate
const duplicates = await embeddingClient.detectDuplicates(
  intakeFileId,
  distanceThreshold=0.15 // tune based on your needs
);

if (duplicates.length > 0) {
  console.log('⚠️ Duplicate(s) detected:');
  duplicates.forEach(d => {
    console.log(`  - ${d.file_name} (distance: ${d.distance.toFixed(3)})`);
  });
}
```

### 4. Find Relevant Chunks (RAG)

```javascript
// Find chunks relevant to a question (for LLM context)
const chunks = await embeddingClient.searchChunks(
  'What is the candidate\'s experience with Python?',
  intakeFileId=null,  // search all chunks, or specific intake file
  limit=5
);

// Use chunks as context for LLM prompt
const context = chunks.map(c => c.text).join('\n---\n');
const llmPrompt = `Context:\n${context}\n\nQuestion: ...`;
```

### 5. Bulk Embedding Generation

```javascript
// For bulk re-embedding or import
const records = [
  { id: 1, text: 'Senior engineer...' },
  { id: 2, text: 'Product manager...' },
  // ...
];

const result = await embeddingClient.batchGenerateAndPersist(
  'candidates',
  records,
  batchSize=50
);

console.log(`✓ Processed: ${result.succeeded} succeeded, ${result.failed} failed`);
```

---

## Integration Points (Where to Call Vector Functions)

### 1. After CV Parsing (intakeModel.cjs)
```javascript
// After parsing completes:
await embeddingClient.generateAndPersistEmbedding(
  'intake_files',
  intakeFileId,
  parsedText,
  { source: 'parsed_text' }
);
```

### 2. Before Approval → Candidate Creation (candidateModel.cjs)
```javascript
// Check duplicates
const duplicates = await embeddingClient.detectDuplicates(intakeFileId);
if (duplicates.length > 0) {
  // Alert user or auto-merge
}

// After creating candidate
await embeddingClient.generateAndPersistEmbedding(
  'candidates',
  candidateId,
  profileSummary, // concatenated name + title + firm + sectors + functions
  { source: 'parsed' }
);
```

### 3. After LLM Enrichment
```javascript
// After enrichment, re-embed with new fields
await embeddingClient.generateAndPersistEmbedding(
  'intake_files',
  intakeFileId,
  enrichedText,
  { source: 'enriched' }
);
```

### 4. Document Chunking (documentChunker.cjs - NEW)
```javascript
// After splitting into chunks
for (const chunk of chunks) {
  const embedding = await embeddingMapper.embedPhrase(chunk.text);
  await vectorStore.insertChunk({
    intakeFileId,
    chunkIndex: i,
    chunkType: 'paragraph',
    text: chunk.text,
    embedding,
    metadata: { source: 'chunk' }
  });
}
```

### 5. Search UI / API Endpoints (searchController.cjs - NEW)
```javascript
// POST /api/search/candidates-by-embedding
const similarCandidates = await embeddingClient.searchByText(
  'candidates',
  req.body.query,
  k=20
);
res.json(similarCandidates);

// POST /api/search/chunks
const relevantChunks = await embeddingClient.searchChunks(
  req.body.query,
  req.body.intakeFileId
);
res.json(relevantChunks);
```

---

## Configuration

### Environment Variables

```bash
# .env or environment setup
EMBEDDING_MODEL_NAME=all-MiniLM-L6-v2    # or all-mpnet-base-v2
EMBEDDING_DIMENSION=384                  # Match model output dim
PGVECTOR_LISTS=100                       # ivfflat lists param (tune per table size)
ENABLE_EMBEDDINGS=true                   # Enable/disable embedding pipeline
CHUNK_SIZE_TOKENS=512                    # For document chunking
```

### Tuning ivfflat Index

The `lists` parameter in `ivfflat` affects search speed vs. recall:

| Data Size | Recommended lists | Trade-off |
|-----------|-------------------|-----------|
| < 10k vectors | 10-50 | Fast, good recall |
| 10k-100k | 50-500 | Balanced |
| 100k+ | 500-2000 | More accurate, slower |

To change:
```sql
-- Drop old index
DROP INDEX intake_files_embedding_idx;

-- Create with new lists value
CREATE INDEX intake_files_embedding_idx 
  ON intake_files USING ivfflat (embedding vector_l2_ops) WITH (lists = 500);
```

---

## Monitoring & Maintenance

### Check Embedding Stats
```javascript
const stats = await embeddingClient.getStats('intake_files');
console.log(stats);
// Output: { total_rows: 1000, embedded_rows: 950, model_versions: 2 }
```

### Monitor Index Size
```sql
SELECT 
  schemaname, 
  tablename, 
  indexname,
  pg_size_pretty(pg_relation_size(indexrelname::regclass)) as index_size
FROM pg_indexes
WHERE indexname LIKE '%embedding%';
```

### Re-embedding After Model Change

```javascript
// scripts/reindex-embeddings.cjs

// 1. Create new column
await pool.query(`ALTER TABLE intake_files ADD COLUMN embedding_v2 vector(768);`);

// 2. Generate new embeddings (with new model)
// Set EMBEDDING_MODEL_NAME=all-mpnet-base-v2 and EMBEDDING_DIMENSION=768

const records = await pool.query(`
  SELECT id, parsed_text FROM intake_files 
  WHERE parsed_text IS NOT NULL LIMIT 100
`);

for (const record of records.rows) {
  const embedding = await generateEmbedding(record.parsed_text);
  await pool.query(
    `UPDATE intake_files SET embedding_v2 = $1 WHERE id = $2`,
    [embedding, record.id]
  );
}

// 3. Test performance

// 4. Switch
await pool.query(`ALTER TABLE intake_files RENAME COLUMN embedding TO embedding_old;`);
await pool.query(`ALTER TABLE intake_files RENAME COLUMN embedding_v2 TO embedding;`);

// 5. Drop old index and create new one
// ...
```

---

## Performance Tuning

### Query Latency Benchmarks

**Typical Latency (with well-tuned index):**
- k-NN search (10 results): 5-50ms (depends on table size and lists)
- Embedding generation (MiniLM on CPU): 50-200ms
- Hybrid search (BM25 + vector): 20-100ms

**Optimization Tips:**
1. **Pre-filter with exact match** before vector search (status, location, etc.)
2. **Use appropriate `lists` value** for your table size
3. **Build index after bulk insert** (faster than incremental indexing)
4. **Monitor query plans**: `EXPLAIN ANALYZE SELECT ... ORDER BY embedding <-> ...`
5. **Consider GPU** for embedding generation if throughput is bottleneck

---

## Troubleshooting

### Issue: "function pg_trgm.word_similarity(text, text) does not exist"
- Solution: `CREATE EXTENSION IF NOT EXISTS pg_trgm;` in databaseInitializer

### Issue: "ivfflat index query is slow"
- Check: Table size vs. `lists` value (might be too large or too small)
- Rebuild: `REINDEX INDEX intake_files_embedding_idx;`

### Issue: "Out of memory during index creation"
- Solution: Reduce `lists` value, or build index on smaller batch of data

### Issue: "Embedding dimension mismatch"
- Check: EMBEDDING_DIMENSION env var matches your model output (usually 384 for MiniLM)
- Recreate column: `ALTER TABLE ... ADD COLUMN embedding vector(384);`

---

## Testing

### Run Integration Tests
```bash
node scripts/test-pgvector-integration.cjs
```

### Manual Test: Duplicate Detection
```bash
# 1. Upload a CV (intake_file_id = 1)
# 2. Upload the same CV again (intake_file_id = 2)
# 3. Run:
node -e "
const embeddingClient = require('./electron/services/embeddingClient.cjs');
embeddingClient.detectDuplicates(1, 0.15).then(dups => console.log(dups));
"
# Should return intake_file_id = 2 with low distance
```

### Manual Test: k-NN Search
```bash
node -e "
const embeddingClient = require('./electron/services/embeddingClient.cjs');
embeddingClient.searchByText(
  'candidates',
  'Senior software engineer with 10 years Node.js',
  k=5
).then(results => console.log(results));
"
```

---

## Best Practices

1. **Always normalize vectors** — Store `embedding_normalized = true` and use L2 distance
2. **Track metadata** — Know which model, source, and timestamp created each embedding
3. **Batch operations** — Use `batchUpsertEmbeddings()` for bulk inserts
4. **Version embeddings** — If model changes, create new column and migrate incrementally
5. **Monitor staleness** — Alert if embeddings are older than N days
6. **Test threshold empirically** — Duplicate threshold depends on your model and data
7. **Backup embeddings** — Include in regular DB backups (no additional storage needed)
8. **Document changes** — Log when models or dimensions change

---

## Next Steps

1. ✅ Install pgvector extension
2. ✅ Run migrations (006_add_pgvector_embeddings.sql)
3. ⏳ Update candidateModel.cjs to call `embeddingClient.generateAndPersistEmbedding()` on CREATE
4. ⏳ Update intakeModel.cjs to persist embeddings on OCR/parsing completion
5. ⏳ Create searchController.cjs with /api/search/candidates, /api/search/chunks endpoints
6. ⏳ Implement document chunking service (documentChunker.cjs)
7. ⏳ Run integration tests and benchmark performance
8. ⏳ Monitor in production: query latency, index size, embedding staleness

---

## Resources

- [pgvector Documentation](https://github.com/pgvector/pgvector)
- [Sentence-Transformers](https://www.sbert.net/)
- [PostgreSQL JSON Functions](https://www.postgresql.org/docs/current/functions-json.html)
- [PostgreSQL FTS Documentation](https://www.postgresql.org/docs/current/textsearch.html)

---

End of pgvector Setup Guide.
