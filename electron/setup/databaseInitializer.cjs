// electron/setup/databaseInitializer.cjs
// Creates and initializes the Vittoria Launchpad database

const fs = require('fs');
const path = require('path');

/**
 * Create the application database if it doesn't exist
 */
async function createDatabase({ host = 'localhost', port = 5432, username, password, dbName = 'vittoria_launchpad' }) {
  console.log(`[databaseInitializer] Creating database: ${dbName}`);
  
  const { Client } = require('pg');
  
  // Connect to default 'postgres' database to create our app database
  const adminClient = new Client({
    host,
    port,
    user: username,
    password,
    database: 'postgres',
    connectionTimeoutMillis: 10000,
  });

  try {
    await adminClient.connect();
    
    // Check if database already exists
    const checkQuery = `SELECT 1 FROM pg_database WHERE datname = $1`;
    const result = await adminClient.query(checkQuery, [dbName]);
    
    if (result.rows.length > 0) {
      console.log(`[databaseInitializer] Database '${dbName}' already exists`);
      await adminClient.end();
      return { success: true, existed: true, message: 'Database already exists' };
    }

    // Create database
    await adminClient.query(`CREATE DATABASE ${dbName} WITH ENCODING 'UTF8'`);
    console.log(`[databaseInitializer] ✓ Database '${dbName}' created successfully`);
    
    await adminClient.end();
    return { success: true, existed: false, message: 'Database created successfully' };

  } catch (error) {
    console.error('[databaseInitializer] Error creating database:', error.message);
    try {
      await adminClient.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return {
      success: false,
      error: error.message,
      message: 'Failed to create database'
    };
  }
}

/**
 * Initialize database schema (tables, indexes, etc.)
 */
async function initializeSchema({ host = 'localhost', port = 5432, username, password, dbName = 'vittoria_launchpad' }) {
  console.log(`[databaseInitializer] Initializing schema for: ${dbName}`);
  
  const { Client } = require('pg');
  
  const client = new Client({
    host,
    port,
    user: username,
    password,
    database: dbName,
    connectionTimeoutMillis: 10000,
  });

  try {
    await client.connect();
    console.log('[databaseInitializer] Connected to database');

    // Read schema file
    const schemaPath = path.join(__dirname, 'schema.sql');
    let schema;
    
    if (fs.existsSync(schemaPath)) {
      schema = fs.readFileSync(schemaPath, 'utf-8');
      console.log('[databaseInitializer] Loaded schema from schema.sql');
    } else {
      // Fallback to inline schema
      schema = getInlineSchema();
      console.log('[databaseInitializer] Using inline schema');
    }

    // Execute schema
    await client.query(schema);
    console.log('[databaseInitializer] ✓ Schema initialized successfully');

    // Run migrations to add any missing columns
    await runMigrations(client);

    // Insert default settings
    await insertDefaultSettings(client);
    
    // Create default admin user
    await createDefaultAdminUser(client);
    
    await client.end();
    return { success: true, message: 'Schema initialized successfully' };

  } catch (error) {
    console.error('[databaseInitializer] Error initializing schema:', error.message);
    try {
      await client.end();
    } catch (e) {
      // Ignore cleanup errors
    }
    return {
      success: false,
      error: error.message,
      message: 'Failed to initialize schema'
    };
  }
}

/**
 * Run migrations to add missing columns to existing tables
 */
async function runMigrations(client) {
  console.log('[databaseInitializer] Running migrations...');
  
  try {
    // Check if salt column exists in users table
    const saltCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'salt'
    `);
    
    if (saltCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding salt column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN salt VARCHAR(255) DEFAULT '' NOT NULL
      `);
      console.log('[databaseInitializer] ✓ Added salt column');
    }
    
    // Check if is_active column exists
    const isActiveCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'is_active'
    `);
    
    if (isActiveCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding is_active column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN is_active BOOLEAN DEFAULT true
      `);
      console.log('[databaseInitializer] ✓ Added is_active column');
    }
    
    // Check if last_login column exists
    const lastLoginCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name = 'last_login'
    `);
    
    if (lastLoginCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding last_login column to users table...');
      await client.query(`
        ALTER TABLE users 
        ADD COLUMN last_login TIMESTAMP
      `);
      console.log('[databaseInitializer] ✓ Added last_login column');
    }
    
    console.log('[databaseInitializer] ✓ Migrations completed');
  } catch (error) {
    console.error('[databaseInitializer] Migration error:', error.message);
    // Don't fail the whole setup if migrations fail
  }
  
  // Add missing columns to intake_files table
  try {
    console.log('[databaseInitializer] Checking intake_files table columns...');
    
    // Check if file_path column exists
    const filePathCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'file_path'
    `);
    
    if (filePathCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding file_path column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN file_path TEXT`);
      console.log('[databaseInitializer] ✓ Added file_path column');
    }
    
    // Check if is_encrypted column exists
    const isEncryptedCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'is_encrypted'
    `);
    
    if (isEncryptedCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding is_encrypted column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN is_encrypted BOOLEAN DEFAULT false`);
      console.log('[databaseInitializer] ✓ Added is_encrypted column');
    }
    
    // Check if encryption_version column exists
    const encryptionVersionCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'encryption_version'
    `);
    
    if (encryptionVersionCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding encryption_version column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN encryption_version VARCHAR(50)`);
      console.log('[databaseInitializer] ✓ Added encryption_version column');
    }
    
    // Check if parsed_at column exists
    const parsedAtCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'parsed_at'
    `);
    
    if (parsedAtCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding parsed_at column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN parsed_at TIMESTAMP`);
      console.log('[databaseInitializer] ✓ Added parsed_at column');
    }
    
  } catch (error) {
    console.error('[databaseInitializer] Error adding intake_files columns:', error.message);
  }
  
  // Fix sequences for all tables (important after manual inserts or migrations)
  try {
    console.log('[databaseInitializer] Fixing table sequences...');
    
    const tables = ['users', 'firms', 'mandates', 'candidates', 'intake_files', 'match_scores', 'sources'];
    for (const table of tables) {
      await client.query(`
        SELECT setval(pg_get_serial_sequence('${table}', 'id'), COALESCE(MAX(id), 1), true) FROM ${table}
      `);
    }
    
    console.log('[databaseInitializer] ✓ Sequences fixed');
  } catch (error) {
    console.error('[databaseInitializer] Error fixing sequences:', error.message);
  }
}

/**
 * Insert default application settings
 */
async function insertDefaultSettings(client) {
  console.log('[databaseInitializer] Inserting default settings...');
  
  const defaultSettings = [
    { key: 'setup_completed', value: 'true' },
    { key: 'app_version', value: '1.0.0' },
    { key: 'llm_provider', value: 'openai' },
  ];

  for (const setting of defaultSettings) {
    await client.query(
      `INSERT INTO settings (key, value) VALUES ($1, $2) ON CONFLICT (key) DO NOTHING`,
      [setting.key, setting.value]
    );
  }
  
  console.log('[databaseInitializer] Default settings inserted');
}

/**
 * Create default admin user (admin/admin123)
 */
async function createDefaultAdminUser(client) {
  console.log('[databaseInitializer] Creating default admin user...');
  
  try {
    const crypto = require('crypto');
    
    // Check if admin user already exists
    const existingUser = await client.query(
      `SELECT id FROM users WHERE username = $1`,
      ['admin']
    );
    
    if (existingUser.rows.length > 0) {
      console.log('[databaseInitializer] Admin user already exists, skipping...');
      return;
    }
    
    // Generate salt and hash password (using SHA-256 to match authModel)
    const salt = crypto.randomBytes(16).toString('hex');
    const password = 'admin123';
    const passwordHash = crypto.pbkdf2Sync(password, salt, 10000, 64, 'sha256').toString('hex');
    
    // Insert admin user
    await client.query(
      `INSERT INTO users (username, password_hash, salt, full_name, role, is_active) 
       VALUES ($1, $2, $3, $4, $5, $6)`,
      ['admin', passwordHash, salt, 'System Administrator', 'admin', true]
    );
    
    console.log('[databaseInitializer] ✓ Default admin user created (admin/admin123)');
  } catch (error) {
    console.error('[databaseInitializer] Error creating admin user:', error.message);
    // Don't fail setup if admin creation fails
  }
}

/**
 * Inline schema (fallback if schema.sql is missing)
 */
function getInlineSchema() {
  return `
    -- Settings table
    CREATE TABLE IF NOT EXISTS settings (
      key VARCHAR(255) PRIMARY KEY,
      value TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Users/Auth table
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username VARCHAR(100) UNIQUE NOT NULL,
      password_hash VARCHAR(255) NOT NULL,
      salt VARCHAR(255) NOT NULL,
      full_name VARCHAR(255),
      role VARCHAR(50) DEFAULT 'user',
      is_active BOOLEAN DEFAULT true,
      session_token VARCHAR(255),
      last_login TIMESTAMP,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      CHECK (role IN ('admin', 'user'))
    );

    CREATE INDEX IF NOT EXISTS idx_users_username ON users(username);

    -- Firms table
    CREATE TABLE IF NOT EXISTS firms (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      short_name VARCHAR(100),
      sector_focus JSONB DEFAULT '[]',
      asset_classes JSONB DEFAULT '[]',
      regions JSONB DEFAULT '[]',
      platform_type VARCHAR(100),
      website VARCHAR(500),
      notes_text TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Mandates table
    CREATE TABLE IF NOT EXISTS mandates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      location VARCHAR(255),
      primary_sector VARCHAR(100),
      sectors JSONB DEFAULT '[]',
      functions JSONB DEFAULT '[]',
      asset_classes JSONB DEFAULT '[]',
      regions JSONB DEFAULT '[]',
      seniority_min VARCHAR(50),
      seniority_max VARCHAR(50),
      status VARCHAR(50) DEFAULT 'OPEN',
      candidate_ids JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Candidates table
    CREATE TABLE IF NOT EXISTS candidates (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      current_title VARCHAR(255),
      current_firm VARCHAR(255),
      location VARCHAR(255),
      sectors JSONB DEFAULT '[]',
      functions JSONB DEFAULT '[]',
      asset_classes JSONB DEFAULT '[]',
      geographies JSONB DEFAULT '[]',
      seniority VARCHAR(50),
      status VARCHAR(50) DEFAULT 'ACTIVE',
      mandate_ids JSONB DEFAULT '[]',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Intake files table
    CREATE TABLE IF NOT EXISTS intake_files (
      id SERIAL PRIMARY KEY,
      file_name VARCHAR(500) NOT NULL,
      file_path TEXT,
      candidate VARCHAR(255),
      type VARCHAR(100) DEFAULT 'CV',
      source VARCHAR(100) DEFAULT 'Upload',
      uploaded_by VARCHAR(255),
      uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status VARCHAR(50) DEFAULT 'pending',
      variant VARCHAR(100),
      quality_score DECIMAL(5, 4),
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE SET NULL,
      candidate_status VARCHAR(50),
      avg_fit_score DECIMAL(5, 2),
      match_count INTEGER DEFAULT 0,
      parsed_json JSONB,
      parsed_at TIMESTAMP,
      json JSONB,
      json_candidate JSONB,
      is_encrypted BOOLEAN DEFAULT false,
      encryption_version VARCHAR(50),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Match scores table
    CREATE TABLE IF NOT EXISTS match_scores (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
      mandate_id INTEGER REFERENCES mandates(id) ON DELETE CASCADE,
      final_score DECIMAL(5, 2) NOT NULL CHECK (final_score >= 0 AND final_score <= 100),
      dimension_scores JSONB NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Sources table
    CREATE TABLE IF NOT EXISTS sources (
      id SERIAL PRIMARY KEY,
      name VARCHAR(128) NOT NULL,
      email VARCHAR(128),
      role VARCHAR(64) NOT NULL,
      organisation VARCHAR(128) NOT NULL,
      sectors JSONB NOT NULL DEFAULT '[]',
      geographies JSONB NOT NULL DEFAULT '[]',
      seniority_level VARCHAR(64) NOT NULL,
      created_at TIMESTAMP DEFAULT NOW()
    );

    -- Indexes
    CREATE INDEX IF NOT EXISTS idx_mandates_firm_id ON mandates(firm_id);
    CREATE INDEX IF NOT EXISTS idx_mandates_status ON mandates(status);
    CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
    CREATE INDEX IF NOT EXISTS idx_intake_files_status ON intake_files(status);
    CREATE INDEX IF NOT EXISTS idx_intake_files_candidate_id ON intake_files(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id ON match_scores(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_match_scores_mandate_id ON match_scores(mandate_id);
    CREATE INDEX IF NOT EXISTS idx_match_scores_final_score ON match_scores(final_score DESC);

    -- Updated_at trigger function
    CREATE OR REPLACE FUNCTION update_updated_at_column()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply triggers (using DROP IF EXISTS to handle re-runs)
    DROP TRIGGER IF EXISTS update_settings_updated_at ON settings;
    CREATE TRIGGER update_settings_updated_at BEFORE UPDATE ON settings
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_users_updated_at ON users;
    CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_firms_updated_at ON firms;
    CREATE TRIGGER update_firms_updated_at BEFORE UPDATE ON firms
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_mandates_updated_at ON mandates;
    CREATE TRIGGER update_mandates_updated_at BEFORE UPDATE ON mandates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_candidates_updated_at ON candidates;
    CREATE TRIGGER update_candidates_updated_at BEFORE UPDATE ON candidates
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_intake_files_updated_at ON intake_files;
    CREATE TRIGGER update_intake_files_updated_at BEFORE UPDATE ON intake_files
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_match_scores_updated_at ON match_scores;
    CREATE TRIGGER update_match_scores_updated_at BEFORE UPDATE ON match_scores
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
  `;
}

/**
 * Ensure all tables exist (standalone function for app startup)
 * This can be called independently without full schema initialization
 */
async function ensureAllTablesExist() {
  console.log('[databaseInitializer] Checking if all tables exist...');
  
  const db = require('../db/pgConnection.cjs');
  
  try {
    // Check if sources table exists
    const sourcesTableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'sources'
    `);
    
    if (sourcesTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating sources table...');
      await db.query(`
        CREATE TABLE sources (
          id SERIAL PRIMARY KEY,
          name VARCHAR(128) NOT NULL,
          email VARCHAR(128),
          role VARCHAR(64) NOT NULL,
          organisation VARCHAR(128) NOT NULL,
          sectors JSONB NOT NULL DEFAULT '[]',
          geographies JSONB NOT NULL DEFAULT '[]',
          seniority_level VARCHAR(64) NOT NULL,
          created_at TIMESTAMP DEFAULT NOW()
        );
      `);
      console.log('[databaseInitializer] ✓ Sources table created');
    } else {
      console.log('[databaseInitializer] Sources table already exists');
    }
    
    // Check if recommendation_events table exists
    const recommendationTableCheck = await db.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
        AND table_name = 'recommendation_events'
    `);
    
    if (recommendationTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating recommendation_events table...');
      await db.query(`
        CREATE TABLE recommendation_events (
          id SERIAL PRIMARY KEY,
          source_id INTEGER NOT NULL REFERENCES sources(id) ON DELETE CASCADE,
          candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          mandate_id INTEGER NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
          strength VARCHAR(20) NOT NULL CHECK (strength IN ('strong', 'neutral', 'weak')),
          comment TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );
        
        CREATE INDEX IF NOT EXISTS idx_recommendation_events_source_id ON recommendation_events(source_id);
        CREATE INDEX IF NOT EXISTS idx_recommendation_events_candidate_id ON recommendation_events(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_recommendation_events_mandate_id ON recommendation_events(mandate_id);
      `);
      console.log('[databaseInitializer] ✓ Recommendation events table created');
    } else {
      console.log('[databaseInitializer] Recommendation events table already exists');
    }
    
    console.log('[databaseInitializer] ✓ All tables verified');
  } catch (error) {
    console.error('[databaseInitializer] Error ensuring tables exist:', error.message);
    throw error;
  }
}

module.exports = {
  createDatabase,
  initializeSchema,
  ensureAllTablesExist
};
