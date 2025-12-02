#!/usr/bin/env node
// scripts/run-migrations.cjs
// CLI tool to run migrations programmatically
// Usage: node scripts/run-migrations.cjs [--migration NAME] [--force]

const path = require('path');
const fs = require('fs');
const migrationRunner = require('../electron/services/migrationRunner.cjs');
const pgConnection = require('../electron/db/pgConnection.cjs');

// Parse command line arguments
const args = process.argv.slice(2);
let migrationName = null;
let force = false;

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--migration' && args[i + 1]) {
    migrationName = args[i + 1];
    i++;
  }
  if (args[i] === '--force') {
    force = true;
  }
  if (args[i] === '--help' || args[i] === '-h') {
    console.log(`
CLI Migration Runner for Vittoria Launchpad

Usage:
  node scripts/run-migrations.cjs [options]

Options:
  --migration NAME    Run specific migration by name
  --force             Force re-run even if already applied
  --help, -h          Show this help message

Examples:
  # Run all migrations
  node scripts/run-migrations.cjs

  # Run specific migration
  node scripts/run-migrations.cjs --migration 006_add_pgvector_embeddings.sql

  # Force re-run all
  node scripts/run-migrations.cjs --force

  # Force re-run specific
  node scripts/run-migrations.cjs --migration 006_add_pgvector_embeddings.sql --force
`);
    process.exit(0);
  }
}

// Change to project root directory so migrations path is correct
process.chdir(path.join(__dirname, '..'));

/**
 * Main entry point
 */
async function main() {
  try {
    // Set up PostgreSQL credentials from multiple sources
    let dbConfig = null;

    // Priority 1: Try to load from credentials JSON file (like the app does)
    try {
      // Determine app data path based on platform
      let appDataPath;
      if (process.platform === 'win32') {
        appDataPath = process.env.APPDATA || path.join(process.env.USERPROFILE || '', 'AppData', 'Roaming');
      } else if (process.platform === 'darwin') {
        appDataPath = path.join(process.env.HOME || '', 'Library', 'Application Support');
      } else {
        // Linux
        appDataPath = path.join(process.env.HOME || '', '.config');
      }
      
      const credentialsPath = path.join(appDataPath, 'vittoria-launchpad', 'pg-credentials.json');
      
      if (fs.existsSync(credentialsPath)) {
        try {
          const data = fs.readFileSync(credentialsPath, 'utf8');
          const creds = JSON.parse(data);
          
          if (creds.host && creds.database) {
            dbConfig = {
              host: creds.host,
              port: creds.port || 5432,
              database: creds.database || creds.dbName,
              user: creds.username || creds.user || 'postgres',
              password: creds.password || ''
            };
            console.log(`\n[migrationRunner] ✓ Loaded credentials from JSON file`);
            console.log(`  Path: ${credentialsPath}`);
          }
        } catch (parseError) {
          console.log(`[migrationRunner] Warning: Could not parse credentials JSON:`, parseError.message);
        }
      }
    } catch (error) {
      // Continue to next priority
    }

    // Priority 2: Fall back to environment variables
    if (!dbConfig) {
      dbConfig = {
        host: process.env.DB_HOST || 'localhost',
        port: parseInt(process.env.DB_PORT || '5432'),
        database: process.env.DB_NAME || process.env.DATABASE_NAME || 'vittoria_launchpad',
        user: process.env.DB_USER || process.env.DATABASE_USER || 'vittoria_admin',
        password: process.env.DB_PASSWORD || process.env.DATABASE_PASSWORD || 'vittoria_launchpad'
      };
      console.log(`\n[migrationRunner] Using environment variables for database config`);
    }

    console.log(`\n[migrationRunner] Connecting to PostgreSQL:`);
    console.log(`  Host:     ${dbConfig.host}`);
    console.log(`  Port:     ${dbConfig.port}`);
    console.log(`  Database: ${dbConfig.database}`);
    console.log(`  User:     ${dbConfig.user}`);
    console.log(`  Password: ${dbConfig.password ? '(set)' : '(empty)'}\n`);
    
    pgConnection.setCredentials(dbConfig);

    if (migrationName) {
      console.log(`\nRunning migration: ${migrationName}`);
      if (force) console.log('(Force mode: re-running even if already applied)');
      
      const result = await migrationRunner.runMigration(migrationName, force);
      
      if (result.success) {
        console.log(`\n✅ Success: ${result.message}`);
        process.exit(0);
      } else {
        console.error(`\n❌ Failed: ${result.message}`);
        process.exit(1);
      }
    } else {
      console.log('\nRunning all migrations...');
      if (force) console.log('(Force mode: re-running all migrations)');
      
      const result = await migrationRunner.runAllMigrations();
      
      if (result.success) {
        console.log(`\n✅ Success: All migrations completed`);
        process.exit(0);
      } else {
        console.error(`\n❌ Failed: Some migrations had errors`);
        process.exit(1);
      }
    }
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

main();
