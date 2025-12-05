// electron/services/migrationRunner.cjs
// Runs database migrations programmatically from Node.js
// No dependency on psql CLI - works on any platform

const fs = require('fs');
const path = require('path');
const { getClient } = require('../db/pgConnection.cjs');

/**
 * Read migration file
 * @param {string} migrationName - Migration filename (e.g., '006_add_pgvector_embeddings.sql')
 * @returns {Promise<string>} Migration SQL content
 */
async function readMigration(migrationName) {
  const migrationPath = path.join(__dirname, '../../migrations', migrationName);
  
  if (!fs.existsSync(migrationPath)) {
    throw new Error(`Migration file not found: ${migrationPath}`);
  }
  
  return fs.readFileSync(migrationPath, 'utf8');
}

/**
 * Split SQL migration into individual statements
 * Handles PL/pgSQL DO blocks and multi-line statements
 * @param {string} sql - SQL content
 * @returns {string[]} Array of SQL statements
 */
function splitSqlStatements(sql) {
  const statements = [];
  let currentStatement = '';
  let inDoBlock = false;
  let inString = false;
  let stringChar = null;
  let i = 0;

  while (i < sql.length) {
    const char = sql[i];
    const nextThreeChars = sql.substring(i, i + 3);
    const nextTwoChars = sql.substring(i, i + 2);

    // Handle string literals
    if ((char === "'" || char === '"') && (i === 0 || sql[i - 1] !== '\\')) {
      if (!inString) {
        inString = true;
        stringChar = char;
      } else if (char === stringChar) {
        inString = false;
        stringChar = null;
      }
    }

    // Track DO blocks
    if (!inString && nextThreeChars === 'DO ') {
      inDoBlock = true;
    }

    currentStatement += char;

    // Statement ends with ; (but not inside DO block or string)
    if (char === ';' && !inString && !inDoBlock) {
      statements.push(currentStatement.trim());
      currentStatement = '';
      inDoBlock = false;
    }

    // DO blocks end after the final semicolon
    if (inDoBlock && char === ';' && !inString) {
      // Check if we're at the end of a $$ block
      const lastDollarIndex = currentStatement.lastIndexOf('$$');
      if (lastDollarIndex > 0) {
        statements.push(currentStatement.trim());
        currentStatement = '';
        inDoBlock = false;
      }
    }

    i++;
  }

  // Add any remaining statement
  if (currentStatement.trim().length > 0) {
    statements.push(currentStatement.trim());
  }

  // Filter out empty statements and comments-only statements
  return statements.filter(stmt => {
    const cleaned = stmt.replace(/--.*$/gm, '').trim();
    return cleaned.length > 0 && !cleaned.startsWith('--');
  });
}

/**
 * Check if migration has already been applied
 * @param {string} migrationName - Migration name
 * @returns {Promise<boolean>} true if already applied
 */
async function isMigrationApplied(migrationName) {
  const client = await getClient();
  try {
    // Check if migrations table exists
    const result = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'schema_migrations'
      );
    `);

    if (!result.rows[0].exists) {
      return false;
    }

    // Check if this migration was applied
    const migrationResult = await client.query(
      'SELECT * FROM schema_migrations WHERE name = $1',
      [migrationName]
    );

    return migrationResult.rows.length > 0;
  } catch (error) {
    // If schema_migrations table doesn't exist, migration hasn't been applied
    return false;
  } finally {
    client.release();
  }
}

/**
 * Record migration as applied
 * @param {string} migrationName - Migration name
 */
async function recordMigration(migrationName) {
  const client = await getClient();
  try {
    // Create schema_migrations table if it doesn't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL UNIQUE,
        applied_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Record this migration
    await client.query(
      'INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT (name) DO NOTHING',
      [migrationName]
    );
  } finally {
    client.release();
  }
}

/**
 * Run a single migration
 * @param {string} migrationName - Migration filename
 * @param {boolean} force - Force re-run even if already applied
 * @returns {Promise<{success: boolean, message: string, statements: number}>}
 */
async function runMigration(migrationName, force = false) {
  console.log(`\n[migrationRunner] Starting migration: ${migrationName}`);

  // Check if already applied
  const alreadyApplied = await isMigrationApplied(migrationName);
  if (alreadyApplied && !force) {
    console.log(`[migrationRunner] ⏭️  Migration already applied: ${migrationName}`);
    return {
      success: true,
      message: 'Migration already applied',
      statements: 0,
      skipped: true
    };
  }

  if (alreadyApplied && force) {
    console.log(`[migrationRunner] 🔄 Re-running migration (force): ${migrationName}`);
  }

  try {
    // Read migration file
    const sqlContent = await readMigration(migrationName);
    console.log(`[migrationRunner] 📖 Read ${sqlContent.length} bytes`);

    // Split into statements
    const statements = splitSqlStatements(sqlContent);
    console.log(`[migrationRouter] 📋 Found ${statements.length} SQL statements`);

    // Execute each statement
    const client = await getClient();
    try {
      await client.query('BEGIN');

      let successCount = 0;
      for (let i = 0; i < statements.length; i++) {
        const statement = statements[i];
        
        // Skip empty statements
        if (!statement.trim()) continue;

        try {
          await client.query(statement);
          successCount++;
          
          // Show progress every 5 statements
          if (successCount % 5 === 0) {
            console.log(`[migrationRunner] ✓ Executed ${successCount}/${statements.length} statements`);
          }
        } catch (error) {
          // Some statements might fail if they already exist (e.g., CREATE IF NOT EXISTS)
          // Log as warning but continue
          console.warn(`[migrationRunner] ⚠️  Statement ${i + 1} warning:`, error.message);
        }
      }

      await client.query('COMMIT');
      console.log(`[migrationRunner] ✅ Migration completed: ${successCount} statements executed`);

      // Record migration as applied
      await recordMigration(migrationName);
      console.log(`[migrationRunner] 📝 Recorded migration: ${migrationName}`);

      return {
        success: true,
        message: `Migration completed: ${successCount}/${statements.length} statements executed`,
        statements: successCount
      };
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    console.error(`[migrationRunner] ❌ Migration failed:`, error.message);
    return {
      success: false,
      message: error.message,
      statements: 0,
      error: error
    };
  }
}

/**
 * Run all pending migrations
 * @returns {Promise<{success: boolean, applied: string[], failed: string[]}>}
 */
async function runAllMigrations() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                       Running All Migrations                                 ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const migrationsDir = path.join(__dirname, '../../migrations');
  const migrationFiles = fs.readdirSync(migrationsDir)
    .filter(file => file.endsWith('.sql'))
    .sort();

  console.log(`[migrationRunner] Found ${migrationFiles.length} migration files\n`);

  const results = {
    success: true,
    applied: [],
    failed: [],
    skipped: []
  };

  for (const file of migrationFiles) {
    try {
      const result = await runMigration(file);
      if (result.success) {
        if (result.skipped) {
          results.skipped.push(file);
        } else {
          results.applied.push(file);
        }
      } else {
        results.failed.push(file);
        results.success = false;
      }
    } catch (error) {
      console.error(`[migrationRunner] Error running ${file}:`, error);
      results.failed.push(file);
      results.success = false;
    }
  }

  // Print summary
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                         Migration Summary                                    ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  if (results.applied.length > 0) {
    console.log(`✅ Applied: ${results.applied.length}`);
    results.applied.forEach(f => console.log(`   • ${f}`));
  }

  if (results.skipped.length > 0) {
    console.log(`⏭️  Skipped: ${results.skipped.length} (already applied)`);
    results.skipped.forEach(f => console.log(`   • ${f}`));
  }

  if (results.failed.length > 0) {
    console.log(`❌ Failed: ${results.failed.length}`);
    results.failed.forEach(f => console.log(`   • ${f}`));
  }

  console.log('\n');
  return results;
}

/**
 * Initialize database (create schema_migrations table, run all migrations)
 * This is typically called during app startup or setup wizard
 * @param {boolean} force - Force re-run all migrations
 * @returns {Promise<{success: boolean, details: object}>}
 */
async function initializeDatabase(force = false) {
  try {
    console.log('[migrationRunner] Initializing database...');
    
    const results = await runAllMigrations();
    
    if (results.success) {
      console.log('[migrationRunner] ✅ Database initialized successfully');
      return {
        success: true,
        details: results
      };
    } else {
      console.error('[migrationRunner] ❌ Database initialization had failures');
      return {
        success: false,
        details: results,
        error: 'Some migrations failed'
      };
    }
  } catch (error) {
    console.error('[migrationRunner] ❌ Database initialization error:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  readMigration,
  splitSqlStatements,
  isMigrationApplied,
  recordMigration,
  runMigration,
  runAllMigrations,
  initializeDatabase
};
