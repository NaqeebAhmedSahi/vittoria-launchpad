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
    
    // Check if ocr_progress column exists
    const ocrProgressCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'ocr_progress'
    `);
    
    if (ocrProgressCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding ocr_progress column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN ocr_progress INTEGER DEFAULT 0`);
      console.log('[databaseInitializer] ✓ Added ocr_progress column');
    }
    
    // Check if ocr_method column exists
    const ocrMethodCheck = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'intake_files' 
        AND column_name = 'ocr_method'
    `);
    
    if (ocrMethodCheck.rows.length === 0) {
      console.log('[databaseInitializer] Adding ocr_method column to intake_files...');
      await client.query(`ALTER TABLE intake_files ADD COLUMN ocr_method VARCHAR(50)`);
      console.log('[databaseInitializer] ✓ Added ocr_method column');
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
      ocr_progress INTEGER DEFAULT 0,
      ocr_method VARCHAR(50),
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

    -- Teams table
    CREATE TABLE IF NOT EXISTS teams (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      description TEXT,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- People table
    CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY,
      first_name VARCHAR(100),
      last_name VARCHAR(100),
      email VARCHAR(255) UNIQUE,
      phone VARCHAR(50),
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      role VARCHAR(255),
      linkedin_url VARCHAR(500),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Employments table
    CREATE TABLE IF NOT EXISTS employments (
      id SERIAL PRIMARY KEY,
      person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
      job_title VARCHAR(255),
      start_date TIMESTAMP,
      end_date TIMESTAMP,
      status VARCHAR(50) DEFAULT 'Active',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Documents table
    CREATE TABLE IF NOT EXISTS documents (
      id SERIAL PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      description TEXT,
      file_path VARCHAR(1000) NOT NULL,
      file_type VARCHAR(100),
      file_size INTEGER,
      category VARCHAR(100),
      tags TEXT[],
      uploaded_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
      related_entity_type VARCHAR(50),
      related_entity_id INTEGER,
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      mandate_id INTEGER REFERENCES mandates(id) ON DELETE CASCADE,
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
      is_confidential BOOLEAN DEFAULT false,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Finance Transactions table
    CREATE TABLE IF NOT EXISTS finance_transactions (
      id SERIAL PRIMARY KEY,
      transaction_type VARCHAR(50) NOT NULL,
      category VARCHAR(100),
      amount DECIMAL(15, 2) NOT NULL,
      currency VARCHAR(10) DEFAULT 'GBP',
      description TEXT,
      transaction_date DATE NOT NULL,
      firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
      mandate_id INTEGER REFERENCES mandates(id) ON DELETE CASCADE,
      candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
      invoice_number VARCHAR(100),
      payment_status VARCHAR(50) DEFAULT 'Pending',
      payment_method VARCHAR(50),
      payment_date DATE,
      tax_amount DECIMAL(15, 2),
      notes TEXT,
      created_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- Audit Log table
    CREATE TABLE IF NOT EXISTS audit_log (
      id SERIAL PRIMARY KEY,
      entity_type VARCHAR(100) NOT NULL,
      entity_id INTEGER NOT NULL,
      action VARCHAR(50) NOT NULL,
      performed_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
      changes JSONB,
      ip_address VARCHAR(45),
      user_agent TEXT,
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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
    CREATE INDEX IF NOT EXISTS idx_teams_firm_id ON teams(firm_id);
    CREATE INDEX IF NOT EXISTS idx_people_firm_id ON people(firm_id);
    CREATE INDEX IF NOT EXISTS idx_people_team_id ON people(team_id);
    CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
    CREATE INDEX IF NOT EXISTS idx_employments_person_id ON employments(person_id);
    CREATE INDEX IF NOT EXISTS idx_employments_firm_id ON employments(firm_id);
    CREATE INDEX IF NOT EXISTS idx_employments_team_id ON employments(team_id);
    CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
    CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON documents(firm_id);
    CREATE INDEX IF NOT EXISTS idx_documents_mandate_id ON documents(mandate_id);
    CREATE INDEX IF NOT EXISTS idx_documents_candidate_id ON documents(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
    CREATE INDEX IF NOT EXISTS idx_documents_related_entity ON documents(related_entity_type, related_entity_id);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_firm_id ON finance_transactions(firm_id);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_mandate_id ON finance_transactions(mandate_id);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_candidate_id ON finance_transactions(candidate_id);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_transaction_date ON finance_transactions(transaction_date DESC);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_payment_status ON finance_transactions(payment_status);
    CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);
    CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
    CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
    CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
    CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);

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
    
    DROP TRIGGER IF EXISTS update_teams_updated_at ON teams;
    CREATE TRIGGER update_teams_updated_at BEFORE UPDATE ON teams
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_people_updated_at ON people;
    CREATE TRIGGER update_people_updated_at BEFORE UPDATE ON people
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_employments_updated_at ON employments;
    CREATE TRIGGER update_employments_updated_at BEFORE UPDATE ON employments
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_documents_updated_at ON documents;
    CREATE TRIGGER update_documents_updated_at BEFORE UPDATE ON documents
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    
    DROP TRIGGER IF EXISTS update_finance_transactions_updated_at ON finance_transactions;
    CREATE TRIGGER update_finance_transactions_updated_at BEFORE UPDATE ON finance_transactions
      FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

    -- ============================================
    -- AUDIT LOGGING TRIGGERS
    -- ============================================
    
    -- Create audit logging function
    CREATE OR REPLACE FUNCTION audit_trigger_function()
    RETURNS TRIGGER AS $$
    DECLARE
      old_data JSONB;
      new_data JSONB;
      changes JSONB;
    BEGIN
      -- For INSERT
      IF (TG_OP = 'INSERT') THEN
        new_data := to_jsonb(NEW);
        INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
        VALUES (TG_TABLE_NAME, NEW.id, 'CREATE', new_data, CURRENT_TIMESTAMP);
        RETURN NEW;
      
      -- For UPDATE
      ELSIF (TG_OP = 'UPDATE') THEN
        old_data := to_jsonb(OLD);
        new_data := to_jsonb(NEW);
        -- Only log if data actually changed
        IF old_data IS DISTINCT FROM new_data THEN
          changes := jsonb_build_object(
            'old', old_data,
            'new', new_data
          );
          INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
          VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', changes, CURRENT_TIMESTAMP);
        END IF;
        RETURN NEW;
      
      -- For DELETE
      ELSIF (TG_OP = 'DELETE') THEN
        old_data := to_jsonb(OLD);
        INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, CURRENT_TIMESTAMP);
        RETURN OLD;
      END IF;
      
      RETURN NULL;
    END;
    $$ LANGUAGE plpgsql;

    -- Apply audit triggers to important tables
    
    -- Firms audit trigger
    DROP TRIGGER IF EXISTS audit_firms_trigger ON firms;
    CREATE TRIGGER audit_firms_trigger
      AFTER INSERT OR UPDATE OR DELETE ON firms
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Mandates audit trigger
    DROP TRIGGER IF EXISTS audit_mandates_trigger ON mandates;
    CREATE TRIGGER audit_mandates_trigger
      AFTER INSERT OR UPDATE OR DELETE ON mandates
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Candidates audit trigger
    DROP TRIGGER IF EXISTS audit_candidates_trigger ON candidates;
    CREATE TRIGGER audit_candidates_trigger
      AFTER INSERT OR UPDATE OR DELETE ON candidates
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Intake files audit trigger
    DROP TRIGGER IF EXISTS audit_intake_files_trigger ON intake_files;
    CREATE TRIGGER audit_intake_files_trigger
      AFTER INSERT OR UPDATE OR DELETE ON intake_files
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Teams audit trigger
    DROP TRIGGER IF EXISTS audit_teams_trigger ON teams;
    CREATE TRIGGER audit_teams_trigger
      AFTER INSERT OR UPDATE OR DELETE ON teams
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- People audit trigger
    DROP TRIGGER IF EXISTS audit_people_trigger ON people;
    CREATE TRIGGER audit_people_trigger
      AFTER INSERT OR UPDATE OR DELETE ON people
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Documents audit trigger
    DROP TRIGGER IF EXISTS audit_documents_trigger ON documents;
    CREATE TRIGGER audit_documents_trigger
      AFTER INSERT OR UPDATE OR DELETE ON documents
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Finance transactions audit trigger
    DROP TRIGGER IF EXISTS audit_finance_transactions_trigger ON finance_transactions;
    CREATE TRIGGER audit_finance_transactions_trigger
      AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    
    -- Users audit trigger (for security)
    DROP TRIGGER IF EXISTS audit_users_trigger ON users;
    CREATE TRIGGER audit_users_trigger
      AFTER INSERT OR UPDATE OR DELETE ON users
      FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
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

    const outcomesTableCheck = await db.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name = 'mandate_outcomes'
    `);

    if (outcomesTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating mandate_outcomes table...');
      await db.query(`
        CREATE TABLE mandate_outcomes (
          id SERIAL PRIMARY KEY,
          candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
          mandate_id INTEGER NOT NULL REFERENCES mandates(id) ON DELETE CASCADE,
          stage VARCHAR(20) NOT NULL CHECK (stage IN ('round 1','round 2','final','offer','selected','rejected')),
          result VARCHAR(20) NOT NULL CHECK (result IN ('pass','fail','selected','rejected')),
          notes TEXT,
          created_at TIMESTAMP DEFAULT NOW()
        );

        CREATE INDEX IF NOT EXISTS idx_mandate_outcomes_candidate ON mandate_outcomes(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_mandate_outcomes_mandate ON mandate_outcomes(mandate_id);
      `);
      console.log('[databaseInitializer] ✓ Mandate outcomes table created');
    } else {
      console.log('[databaseInitializer] Mandate outcomes table already exists');
    }
    
    // Check if teams table exists
    const teamsTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'teams'
    `);
    
    if (teamsTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating teams table...');
      await db.query(`
        CREATE TABLE teams (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
          description TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_teams_firm_id ON teams(firm_id);
      `);
      console.log('[databaseInitializer] ✓ Teams table created');
    }
    
    // Check if people table exists
    const peopleTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'people'
    `);
    
    if (peopleTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating people table...');
      await db.query(`
        CREATE TABLE people (
          id SERIAL PRIMARY KEY,
          first_name VARCHAR(100),
          last_name VARCHAR(100),
          email VARCHAR(255) UNIQUE,
          phone VARCHAR(50),
          firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
          team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
          role VARCHAR(255),
          linkedin_url VARCHAR(500),
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_people_firm_id ON people(firm_id);
        CREATE INDEX IF NOT EXISTS idx_people_team_id ON people(team_id);
        CREATE INDEX IF NOT EXISTS idx_people_email ON people(email);
      `);
      console.log('[databaseInitializer] ✓ People table created');
    }
    
    // Check if employments table exists
    const employmentsTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'employments'
    `);
    
    if (employmentsTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating employments table...');
      await db.query(`
        CREATE TABLE employments (
          id SERIAL PRIMARY KEY,
          person_id INTEGER REFERENCES people(id) ON DELETE CASCADE,
          firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
          team_id INTEGER REFERENCES teams(id) ON DELETE CASCADE,
          job_title VARCHAR(255),
          start_date TIMESTAMP,
          end_date TIMESTAMP,
          status VARCHAR(50) DEFAULT 'Active',
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_employments_person_id ON employments(person_id);
        CREATE INDEX IF NOT EXISTS idx_employments_firm_id ON employments(firm_id);
        CREATE INDEX IF NOT EXISTS idx_employments_team_id ON employments(team_id);
      `);
      console.log('[databaseInitializer] ✓ Employments table created');
    }
    
    // Check if documents table exists
    const documentsTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'documents'
    `);
    
    if (documentsTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating documents table...');
      await db.query(`
        CREATE TABLE documents (
          id SERIAL PRIMARY KEY,
          name VARCHAR(255) NOT NULL,
          description TEXT,
          file_path VARCHAR(1000) NOT NULL,
          file_type VARCHAR(100),
          file_size INTEGER,
          category VARCHAR(100),
          tags TEXT[],
          uploaded_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
          related_entity_type VARCHAR(50),
          related_entity_id INTEGER,
          firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
          mandate_id INTEGER REFERENCES mandates(id) ON DELETE CASCADE,
          candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
          is_confidential BOOLEAN DEFAULT false,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON documents(uploaded_by);
        CREATE INDEX IF NOT EXISTS idx_documents_firm_id ON documents(firm_id);
        CREATE INDEX IF NOT EXISTS idx_documents_mandate_id ON documents(mandate_id);
        CREATE INDEX IF NOT EXISTS idx_documents_candidate_id ON documents(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_documents_category ON documents(category);
        CREATE INDEX IF NOT EXISTS idx_documents_related_entity ON documents(related_entity_type, related_entity_id);
      `);
      console.log('[databaseInitializer] ✓ Documents table created');
    }
    
    // Check if finance_transactions table exists
    const financeTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'finance_transactions'
    `);
    
    if (financeTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating finance_transactions table...');
      await db.query(`
        CREATE TABLE finance_transactions (
          id SERIAL PRIMARY KEY,
          transaction_type VARCHAR(50) NOT NULL,
          category VARCHAR(100),
          amount DECIMAL(15, 2) NOT NULL,
          currency VARCHAR(10) DEFAULT 'GBP',
          description TEXT,
          transaction_date DATE NOT NULL,
          firm_id INTEGER REFERENCES firms(id) ON DELETE CASCADE,
          mandate_id INTEGER REFERENCES mandates(id) ON DELETE CASCADE,
          candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
          invoice_number VARCHAR(100),
          payment_status VARCHAR(50) DEFAULT 'Pending',
          payment_method VARCHAR(50),
          payment_date DATE,
          tax_amount DECIMAL(15, 2),
          notes TEXT,
          created_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
          updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_firm_id ON finance_transactions(firm_id);
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_mandate_id ON finance_transactions(mandate_id);
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_candidate_id ON finance_transactions(candidate_id);
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_transaction_date ON finance_transactions(transaction_date DESC);
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_payment_status ON finance_transactions(payment_status);
        CREATE INDEX IF NOT EXISTS idx_finance_transactions_type ON finance_transactions(transaction_type);
      `);
      console.log('[databaseInitializer] ✓ Finance transactions table created');
    }
    
    // Check if audit_log table exists
    const auditTableCheck = await db.query(`
      SELECT table_name FROM information_schema.tables 
      WHERE table_schema = 'public' AND table_name = 'audit_log'
    `);
    
    if (auditTableCheck.rows.length === 0) {
      console.log('[databaseInitializer] Creating audit_log table...');
      await db.query(`
        CREATE TABLE audit_log (
          id SERIAL PRIMARY KEY,
          entity_type VARCHAR(100) NOT NULL,
          entity_id INTEGER NOT NULL,
          action VARCHAR(50) NOT NULL,
          performed_by INTEGER REFERENCES people(id) ON DELETE SET NULL,
          changes JSONB,
          ip_address VARCHAR(45),
          user_agent TEXT,
          timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        );
        CREATE INDEX IF NOT EXISTS idx_audit_log_entity ON audit_log(entity_type, entity_id);
        CREATE INDEX IF NOT EXISTS idx_audit_log_performed_by ON audit_log(performed_by);
        CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp DESC);
        CREATE INDEX IF NOT EXISTS idx_audit_log_action ON audit_log(action);
      `);
      console.log('[databaseInitializer] ✓ Audit log table created');
    }
    
    // Ensure audit trigger function and triggers exist
    console.log('[databaseInitializer] Setting up audit triggers...');
    await db.query(`
      -- Create or replace audit logging function
      CREATE OR REPLACE FUNCTION audit_trigger_function()
      RETURNS TRIGGER AS $$
      DECLARE
        old_data JSONB;
        new_data JSONB;
        changes JSONB;
      BEGIN
        -- For INSERT
        IF (TG_OP = 'INSERT') THEN
          new_data := to_jsonb(NEW);
          INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
          VALUES (TG_TABLE_NAME, NEW.id, 'CREATE', new_data, CURRENT_TIMESTAMP);
          RETURN NEW;
        
        -- For UPDATE
        ELSIF (TG_OP = 'UPDATE') THEN
          old_data := to_jsonb(OLD);
          new_data := to_jsonb(NEW);
          -- Only log if data actually changed
          IF old_data IS DISTINCT FROM new_data THEN
            changes := jsonb_build_object(
              'old', old_data,
              'new', new_data
            );
            INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
            VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', changes, CURRENT_TIMESTAMP);
          END IF;
          RETURN NEW;
        
        -- For DELETE
        ELSIF (TG_OP = 'DELETE') THEN
          old_data := to_jsonb(OLD);
          INSERT INTO audit_log (entity_type, entity_id, action, changes, timestamp)
          VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', old_data, CURRENT_TIMESTAMP);
          RETURN OLD;
        END IF;
        
        RETURN NULL;
      END;
      $$ LANGUAGE plpgsql;

      -- Apply audit triggers to important tables (using DROP IF EXISTS for idempotency)
      
      DROP TRIGGER IF EXISTS audit_firms_trigger ON firms;
      CREATE TRIGGER audit_firms_trigger
        AFTER INSERT OR UPDATE OR DELETE ON firms
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_mandates_trigger ON mandates;
      CREATE TRIGGER audit_mandates_trigger
        AFTER INSERT OR UPDATE OR DELETE ON mandates
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_candidates_trigger ON candidates;
      CREATE TRIGGER audit_candidates_trigger
        AFTER INSERT OR UPDATE OR DELETE ON candidates
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_intake_files_trigger ON intake_files;
      CREATE TRIGGER audit_intake_files_trigger
        AFTER INSERT OR UPDATE OR DELETE ON intake_files
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_teams_trigger ON teams;
      CREATE TRIGGER audit_teams_trigger
        AFTER INSERT OR UPDATE OR DELETE ON teams
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_people_trigger ON people;
      CREATE TRIGGER audit_people_trigger
        AFTER INSERT OR UPDATE OR DELETE ON people
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_documents_trigger ON documents;
      CREATE TRIGGER audit_documents_trigger
        AFTER INSERT OR UPDATE OR DELETE ON documents
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_finance_transactions_trigger ON finance_transactions;
      CREATE TRIGGER audit_finance_transactions_trigger
        AFTER INSERT OR UPDATE OR DELETE ON finance_transactions
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
      
      DROP TRIGGER IF EXISTS audit_users_trigger ON users;
      CREATE TRIGGER audit_users_trigger
        AFTER INSERT OR UPDATE OR DELETE ON users
        FOR EACH ROW EXECUTE FUNCTION audit_trigger_function();
    `);
    console.log('[databaseInitializer] ✓ Audit triggers configured');
    
    // Run migrations to add any missing columns
    console.log('[databaseInitializer] Running migrations to add missing columns...');
    const client = await db.getClient();
    try {
      await runMigrations(client);
      console.log('[databaseInitializer] ✓ Migrations completed');
    } finally {
      client.release();
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
