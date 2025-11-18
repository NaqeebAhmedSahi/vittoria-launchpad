# PostgreSQL Migration Status

## Overview
Migrating Vittoria Launchpad from SQLite to PostgreSQL for better scalability and concurrent access.

## Migration Strategy
1. **Keep SQLite code commented** - For reference and potential rollback
2. **PostgreSQL connection pooling** - Using `pg` library with connection pool
3. **Query syntax changes**:
   - SQLite: `?` placeholders → PostgreSQL: `$1, $2, $3` placeholders
   - SQLite: `INTEGER PRIMARY KEY AUTOINCREMENT` → PostgreSQL: `SERIAL PRIMARY KEY`
   - SQLite: `is_active INTEGER` (0/1) → PostgreSQL: `is_active BOOLEAN` (true/false)
   - SQLite: `CURRENT_TIMESTAMP` → PostgreSQL: `CURRENT_TIMESTAMP`
   - SQLite: `db.get()`, `db.all()`, `db.run()` → PostgreSQL: `query()` returning `result.rows`

## Files Modified

### ✅ Core Infrastructure
- [x] **electron/db/pgConnection.cjs** - NEW: PostgreSQL connection pool manager
- [x] **electron/models/settingsModel.cjs** - Migrated to PostgreSQL
- [x] **electron/setup/setupController.cjs** - Now checks PostgreSQL connection instead of SQLite flag

### 🔄 Models to Migrate
- [ ] **electron/models/authModel.cjs** - Users, sessions, authentication
- [ ] **electron/models/candidateModel.cjs** - Candidate management
- [ ] **electron/models/firmModel.cjs** - Firm management
- [ ] **electron/models/mandateModel.cjs** - Mandate management
- [ ] **electron/models/intakeModel.cjs** - CV intake and processing
- [ ] **electron/models/scoringModel.cjs** - Candidate scoring and matching

### 🔄 Controllers to Update
- [ ] Review all controllers to ensure they work with new model structure

## Key Differences: SQLite vs PostgreSQL

### Query Execution
```javascript
// SQLite
const db = await initDatabase();
const row = await db.get("SELECT * FROM users WHERE id = ?", [id]);
const rows = await db.all("SELECT * FROM users");
await db.run("INSERT INTO users (name) VALUES (?)", [name]);

// PostgreSQL
const { query } = require("../db/pgConnection.cjs");
const result = await query("SELECT * FROM users WHERE id = $1", [id]);
const row = result.rows[0]; // Single row
const rows = result.rows;   // Multiple rows
await query("INSERT INTO users (name) VALUES ($1)", [name]);
```

### Boolean Values
```javascript
// SQLite
is_active INTEGER DEFAULT 1  // 0 or 1
WHERE is_active = 1

// PostgreSQL
is_active BOOLEAN DEFAULT true  // true or false
WHERE is_active = true
```

### Auto-increment
```javascript
// SQLite
id INTEGER PRIMARY KEY AUTOINCREMENT

// PostgreSQL
id SERIAL PRIMARY KEY
// or
id INTEGER GENERATED ALWAYS AS IDENTITY PRIMARY KEY
```

### UPSERT (Insert or Update)
```javascript
// SQLite
const existing = await db.get("SELECT id FROM settings WHERE key = ?", [key]);
if (existing) {
  await db.run("UPDATE settings SET value = ? WHERE key = ?", [value, key]);
} else {
  await db.run("INSERT INTO settings (key, value) VALUES (?, ?)", [key, value]);
}

// PostgreSQL (much cleaner!)
await query(`
  INSERT INTO settings (key, value) 
  VALUES ($1, $2)
  ON CONFLICT (key) 
  DO UPDATE SET value = $2
`, [key, value]);
```

### Transactions
```javascript
// SQLite
const db = await initDatabase();
await db.run("BEGIN TRANSACTION");
try {
  await db.run("INSERT...");
  await db.run("UPDATE...");
  await db.run("COMMIT");
} catch (error) {
  await db.run("ROLLBACK");
  throw error;
}

// PostgreSQL
const { getClient } = require("../db/pgConnection.cjs");
const client = await getClient();
try {
  await client.query("BEGIN");
  await client.query("INSERT...");
  await client.query("UPDATE...");
  await client.query("COMMIT");
} finally {
  client.release();
}
```

## Migration Checklist

### For Each Model File:
- [ ] Import PostgreSQL query function instead of SQLite initDatabase
- [ ] Convert all `?` placeholders to `$1, $2, $3` format
- [ ] Change `db.get()` to `query()` and access `result.rows[0]`
- [ ] Change `db.all()` to `query()` and access `result.rows`
- [ ] Change `db.run()` to `query()`
- [ ] Convert INTEGER (0/1) to BOOLEAN (true/false)
- [ ] Update AUTOINCREMENT to SERIAL
- [ ] Comment out SQLite version with clear markers
- [ ] Test all functions

## Testing Strategy
1. Run setup wizard to create PostgreSQL database
2. Test each model's CRUD operations
3. Verify data integrity
4. Check transaction handling
5. Test error scenarios

## Rollback Plan
If issues occur:
1. All SQLite code is preserved in comments
2. Uncomment SQLite sections
3. Comment out PostgreSQL sections
4. Restore SQLite database from backup

## Benefits of PostgreSQL
✅ Better concurrent access (multiple users)
✅ ACID compliance for complex transactions
✅ Better JSON support
✅ More powerful indexing
✅ Better full-text search
✅ No file locking issues
✅ Industry-standard database
✅ Better scalability

## Next Steps
1. Migrate authModel.cjs (authentication is critical)
2. Migrate candidateModel.cjs
3. Migrate firmModel.cjs
4. Migrate mandateModel.cjs
5. Migrate intakeModel.cjs
6. Migrate scoringModel.cjs
7. Test end-to-end functionality
8. Update documentation
