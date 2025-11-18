# Remaining Migration: intakeModel.cjs & scoringModel.cjs

## Status Summary

### ✅ **COMPLETED** (5 of 7 models - 71%)
1. **authModel.cjs** - User authentication (220 lines)
2. **settingsModel.cjs** - Application settings (already migrated)
3. **candidateModel.cjs** - Candidate management (469 lines)
4. **firmModel.cjs** - Firm management (176 lines)
5. **mandateModel.cjs** - Mandate management (318 lines)

### ⏳ **REMAINING** (2 of 7 models - 29%)
6. **intakeModel.cjs** - CV intake and parsing (1399 lines) ⚠️ LARGEST & MOST COMPLEX
7. **scoringModel.cjs** - Candidate scoring (1052 lines) ⚠️ COMPLEX BUSINESS LOGIC

---

## intakeModel.cjs Migration Plan

### File Characteristics
- **Size**: 1399 lines (largest in codebase)
- **Complexity**: VERY HIGH
- **Dependencies**: 
  - File system operations (CV storage)
  - Encryption service
  - PDF/Word parsing (pdfParse, mammoth)
  - LLM integration (OpenAI API for CV analysis)
  - pdfjs-dist for PDF annotations

### Database Operations to Migrate

#### 1. **listIntakeFiles()** - Line 184
```javascript
// SQLite
const db = await initDatabase();
return db.all("SELECT * FROM intake_files ORDER BY uploaded_at DESC, id DESC");

// PostgreSQL
const result = await query("SELECT * FROM intake_files ORDER BY uploaded_at DESC, id DESC");
return result.rows;
```

#### 2. **createIntakeFiles()** - Lines 194-290
- Uses `db.prepare()` for batch inserts
- Needs conversion to PostgreSQL parameterized INSERT with multiple VALUES
- Returns `lastID` → needs `RETURNING id`

```javascript
// Pattern:
INSERT INTO intake_files (...) VALUES ($1, $2, ...) RETURNING id
```

#### 3. **updateIntakeStatus()** - Line 291
```javascript
// SQLite
await db.run(
  `UPDATE intake_files 
   SET status = ?, updated_at = CURRENT_TIMESTAMP 
   WHERE id = ?`,
  [status, id]
);
return db.get("SELECT * FROM intake_files WHERE id = ?", id);

// PostgreSQL
await query(
  `UPDATE intake_files 
   SET status = $1, updated_at = CURRENT_TIMESTAMP 
   WHERE id = $2`,
  [status, id]
);
const result = await query("SELECT * FROM intake_files WHERE id = $1", [id]);
return result.rows[0];
```

#### 4. **previewIntakeFile()** - Line 312
- Uses `db.get()` to fetch file record
- Decrypts file for preview
- Convert to `query()` with `result.rows[0]`

#### 5. **parseAndGenerateJson()** - Lines 342-882 (HUGE FUNCTION)
- **Most complex function in the file**
- Steps:
  1. Fetch file record: `db.get()` → `query()` with `result.rows[0]`
  2. Read and decrypt CV file from disk
  3. Extract text from PDF/DOCX
  4. Call OpenAI API with parsing prompt
  5. Validate JSON schema
  6. Update database with parsed data: `db.run()` → `query()`
  7. Handle scoring if auto-scoring enabled
  8. Multiple UPDATE queries throughout

**Key Database Operations:**
- Line 348: `db.get()` - Fetch intake file
- Line 371: `db.run()` - Update parsing status
- Line 710: `db.run()` - Save parsed JSON
- Line 868: `db.run()` - Update with candidate ID

#### 6. **initIntakeFilesTable()** - Lines 883-951
- Table creation (handled by setup wizard in PostgreSQL)
- Multiple `db.exec()` for ALTER TABLE (column additions)
- Uses SQLite PRAGMA to check existing columns
- **PostgreSQL Equivalent**: Query `information_schema.columns`

```javascript
// SQLite
const pragma = await db.all(`PRAGMA table_info(intake_files)`);

// PostgreSQL
const result = await query(`
  SELECT column_name 
  FROM information_schema.columns 
  WHERE table_name = 'intake_files' AND table_schema = 'public'
`);
```

#### 7. **processParsedCv()** - Lines 1074-1283 (LARGE TRANSACTION)
- **Uses explicit transactions** (BEGIN/COMMIT/ROLLBACK)
- Creates draft candidate
- Updates intake with candidate_id
- Handles auto-scoring
- Creates match scores

```javascript
// SQLite
await db.run("BEGIN TRANSACTION");
// ... operations ...
await db.run("COMMIT");
// On error:
await db.run("ROLLBACK");

// PostgreSQL
const client = await getClient();
try {
  await client.query("BEGIN");
  // ... operations with client.query() ...
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK");
  throw error;
} finally {
  client.release();
}
```

#### 8. **handleCvUpload()** - Lines 1285-1332
- Updates intake status
- Triggers scoring
- Multiple UPDATE queries

#### 9. **createCandidateFromIntake()** - Lines 1334-end
- Transaction-based candidate creation
- Updates intake file with candidate reference

---

## scoringModel.cjs Migration Plan

### File Characteristics
- **Size**: 1052 lines (second largest)
- **Complexity**: HIGH (complex business logic)
- **Purpose**: Calculate candidate-mandate match scores

### Database Operations to Migrate

**Estimated Operations:**
- Multiple `db.get()` - Fetch scoring config
- Multiple `db.all()` - Fetch candidates/mandates for batch scoring
- Multiple `db.run()` - Save/update match scores
- Likely uses transactions for bulk operations

### Migration Strategy
1. Read full file structure
2. Identify all `db.get/all/run/exec` calls
3. Convert to `query()` with proper placeholders
4. Handle transactions with `getClient()`
5. Test scoring algorithm thoroughly (most critical business logic)

---

## Migration Approach

### Option 1: Complete Manual Migration (RECOMMENDED)
**Time**: 2-3 hours
**Steps**:
1. Read intakeModel.cjs in sections (200-300 lines at a time)
2. Identify each database operation
3. Replace systematically with PostgreSQL equivalents
4. Test each function after migration
5. Repeat for scoringModel.cjs
6. End-to-end testing

### Option 2: Automated Search-Replace + Manual Verification
**Time**: 1-2 hours
**Steps**:
1. Use regex to find all database operations
2. Create replacement mapping
3. Apply changes in batches
4. Manual verification of complex sections
5. Transaction handling special attention
6. Thorough testing

### Option 3: Hybrid Approach (FASTEST)
**Time**: 1 hour
**Steps**:
1. Keep imports updated (already done for intakeModel)
2. Use grep to find all database calls
3. Migrate simple queries in bulk
4. Handle complex queries (transactions, parseAndGenerateJson) manually
5. Focus testing on critical paths (CV upload, parsing, scoring)

---

## Testing Checklist (After Migration)

### Critical Paths
- [ ] Upload CV (PDF)
- [ ] Upload CV (DOCX)
- [ ] Upload CV (encrypted)
- [ ] Parse CV with OpenAI
- [ ] Handle parsing errors gracefully
- [ ] Create candidate from parsed CV
- [ ] Auto-score candidate against mandates
- [ ] Manual candidate creation
- [ ] Candidate-mandate matching
- [ ] Score calculation accuracy
- [ ] Transaction rollback on errors

### Data Integrity
- [ ] Verify all candidates migrated correctly
- [ ] Verify all intake files accessible
- [ ] Verify encrypted files decrypt properly
- [ ] Verify scores calculated correctly
- [ ] Verify relationships maintained (candidate ↔ intake ↔ scores)

---

## Next Steps

1. **Continue intakeModel.cjs migration**:
   - Read file in sections
   - Migrate `listIntakeFiles()` (simple)
   - Migrate `createIntakeFiles()` (batch insert)
   - Migrate `updateIntakeStatus()` (simple UPDATE)
   - Migrate `previewIntakeFile()` (simple SELECT)
   - Migrate `parseAndGenerateJson()` (complex, split into sub-operations)
   - Migrate transaction-heavy functions (`processParsedCv`, `createCandidateFromIntake`)
   - Migrate table initialization (use information_schema instead of PRAGMA)

2. **Migrate scoringModel.cjs**:
   - Read full file structure
   - Map all database operations
   - Migrate systematically
   - **Extra attention**: Scoring algorithm must remain identical (business-critical)

3. **Testing**:
   - Unit test each migrated function
   - Integration test full workflows
   - Performance test (PostgreSQL should be faster than SQLite)
   - Error handling test (rollback behavior)

4. **Documentation**:
   - Update MIGRATION_STATUS.md
   - Document any PostgreSQL-specific optimizations
   - Create rollback instructions if needed

---

## Risk Mitigation

### High-Risk Areas
1. **parseAndGenerateJson()**: 540 lines, LLM integration, complex state management
2. **processParsedCv()**: Transaction-heavy, multi-table updates
3. **Scoring algorithm**: Business logic must remain identical

### Mitigation Strategies
- Migrate in small, testable chunks
- Keep SQLite code in comments for comparison
- Test with real CV files
- Verify scoring results match SQLite version
- Have rollback plan ready

---

## Current Status

✅ **5 models migrated successfully** (auth, settings, candidate, firm, mandate)
⏳ **2 models remaining** (intake, scoring)
🎯 **Migration Progress**: 71% complete by count, ~45% by complexity
⏱️ **Estimated Completion Time**: 2-3 hours for full migration + testing

**All infrastructure ready**: PostgreSQL connection pool, setup wizard, schema initialization
**Testing environment**: Need to test with actual CV upload and scoring workflows
