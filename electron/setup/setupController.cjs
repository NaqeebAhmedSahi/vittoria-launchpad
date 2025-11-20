// electron/setup/setupController.cjs
// IPC handlers for database setup flow

const { ipcMain } = require('electron');
const { checkPostgresInstalled, testConnection, getInstallationInstructions } = require('./postgresChecker.cjs');
const { createDatabase, initializeSchema } = require('./databaseInitializer.cjs');
const { getSetting, setSetting } = require('../models/settingsModel.cjs');
const fs = require('fs');
const path = require('path');
const child_process = require('child_process');
const { app } = require('electron');

/**
 * Get path to local credentials file
 */
function getCredentialsFilePath() {
  return path.join(app.getPath('userData'), 'pg-credentials.json');
}

/**
 * Load credentials from local file
 */
function loadLocalCredentials() {
  const filePath = getCredentialsFilePath();
  try {
    if (fs.existsSync(filePath)) {
      const data = fs.readFileSync(filePath, 'utf8');
      return JSON.parse(data);
    }
  } catch (error) {
    console.error('[setupController] Error reading credentials file:', error.message);
  }
  return null;
}

/**
 * Save credentials to local file
 */
function saveLocalCredentials(credentials) {
  const filePath = getCredentialsFilePath();
  try {
    fs.writeFileSync(filePath, JSON.stringify(credentials, null, 2), 'utf8');
    console.log('[setupController] Credentials saved to local file');
  } catch (error) {
    console.error('[setupController] Error saving credentials file:', error.message);
    throw error;
  }
}

function registerSetupIpcHandlers() {
  console.log('[setupController] Registering setup IPC handlers...');
  
  /**
   * Check if setup has been completed by checking local credentials file
   */
  ipcMain.handle('setup:isCompleted', async () => {
    console.log('[setupController] setup:isCompleted called');
    try {
      const { Client } = require('pg');
      const { setCredentials } = require('../db/pgConnection.cjs');
      
      // Try to load credentials from local file
      const credentials = loadLocalCredentials();
      
      if (!credentials || !credentials.host || !credentials.database || !credentials.username) {
        console.log('[setupController] No credentials file found - setup not complete');
        return {
          success: true,
          completed: false
        };
      }
      
      console.log('[setupController] Found credentials file, setting and testing connection...');
      
      // Set credentials for pgConnection
      setCredentials({
        host: credentials.host,
        port: credentials.port,
        database: credentials.database,
        username: credentials.username,
        password: credentials.password
      });
      
      // Try to connect to PostgreSQL
      const client = new Client({
        host: credentials.host,
        port: parseInt(credentials.port),
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectionTimeoutMillis: 5000
      });

      try {
        await client.connect();
        console.log('[setupController] Successfully connected to PostgreSQL');
        
        // Verify database exists and has our tables
        const result = await client.query(
          "SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'settings' LIMIT 1"
        );
        
        await client.end();
        
        const hasSchema = result.rows.length > 0;
        console.log('[setupController] Database schema check:', hasSchema ? 'exists' : 'missing');
        
        return {
          success: true,
          completed: hasSchema
        };
      } catch (error) {
        console.log('[setupController] PostgreSQL connection failed:', error.message);
        try { await client.end(); } catch (e) { /* ignore */ }
        return {
          success: true,
          completed: false
        };
      }
    } catch (error) {
      // If any error (including settings read error), setup is not complete
      console.log('[setupController] Error checking setup, assuming not complete:', error.message);
      return { success: true, completed: false };
    }
  });

  /**
   * Check if PostgreSQL is installed on the system
   */
  ipcMain.handle('setup:checkPostgres', async () => {
    try {
      const result = await checkPostgresInstalled();
      return { success: true, ...result };
    } catch (error) {
      console.error('[setupController] Error checking postgres:', error);
      return {
        success: false,
        error: error.message,
        installed: false
      };
    }
  });

  /**
   * Get installation instructions for current platform
   */
  ipcMain.handle('setup:getInstructions', async () => {
    try {
      const instructions = getInstallationInstructions();
      return { success: true, instructions };
    } catch (error) {
      console.error('[setupController] Error getting instructions:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Test connection to PostgreSQL with provided credentials
   */
  ipcMain.handle('setup:testConnection', async (_event, credentials) => {
    try {
      const result = await testConnection(credentials);
      return result;
    } catch (error) {
      console.error('[setupController] Error testing connection:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to test connection'
      };
    }
  });

  /**
   * Create a new PostgreSQL user
   * Uses superuser credentials to create a new user with specified credentials
   */
  ipcMain.handle('setup:createUser', async (_event, { superuser, newUser }) => {
    try {
      console.log('[setupController] Creating new PostgreSQL user:', newUser.username);
      
      const { Client } = require('pg');
      
      // Try to connect as superuser (typically 'postgres')
      const client = new Client({
        host: superuser.host || 'localhost',
        port: parseInt(superuser.port) || 5432,
        user: superuser.username,
        password: superuser.password,
        database: 'postgres' // Connect to default postgres database
      });

      await client.connect();
      console.log('[setupController] Connected as superuser');

      // Helpers to safely quote identifiers and literals for DDL statements
      function escapeIdentifier(id) {
        return '"' + String(id).replace(/"/g, '""') + '"';
      }

      function escapeLiteral(val) {
        return "'" + String(val).replace(/'/g, "''") + "'";
      }

      try {
        // Check if user already exists
        const userCheck = await client.query(
          "SELECT 1 FROM pg_roles WHERE rolname = $1",
          [newUser.username]
        );

        if (userCheck.rows.length > 0) {
          // User exists, update password
          console.log('[setupController] User exists, updating password');
          const alterSql = `ALTER USER ${escapeIdentifier(newUser.username)} WITH PASSWORD ${escapeLiteral(newUser.password)}`;
          await client.query(alterSql);
        } else {
          // Create new user with CREATEDB privilege
          console.log('[setupController] Creating new user');
          const createSql = `CREATE USER ${escapeIdentifier(newUser.username)} WITH PASSWORD ${escapeLiteral(newUser.password)} CREATEDB`;
          await client.query(createSql);
        }

        await client.end();
        console.log('[setupController] User created/updated successfully');

        return {
          success: true,
          message: `User '${newUser.username}' created successfully`
        };
      } catch (error) {
        await client.end();
        throw error;
      }
    } catch (error) {
      console.error('[setupController] Error creating user:', error);
      return {
        success: false,
        error: error.message,
        code: error.code,
        message: 'Failed to create PostgreSQL user'
      };
    }
  });

  /**
   * Create PostgreSQL user on Windows using elevated helper (automated UAC flow)
   * This will prompt the OS for elevation and attempt to temporarily set trust
   * on loopback addresses to create the user, then restore the config.
   */
  ipcMain.handle('setup:createUserWindows', async (_event, { newUser, serviceName }) => {
    if (process.platform !== 'win32') {
      return { success: false, error: 'This handler is only for Windows' };
    }

    try {
      const helperPath = path.join(__dirname, 'windowsPostgresHelper.cjs');
      const node = process.execPath;

      // Spawn the helper and capture stdout/stderr so we can return logs to the renderer
      const proc = child_process.spawn(node, [helperPath, newUser.username, newUser.password, serviceName || ''], {
        windowsHide: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      let stdout = '';
      let stderr = '';

      proc.stdout && proc.stdout.on('data', (chunk) => { stdout += chunk.toString(); });
      proc.stderr && proc.stderr.on('data', (chunk) => { stderr += chunk.toString(); });

      const os = require('os');

      return await new Promise((resolve) => {
        proc.on('close', async (code) => {
          const combined = (stdout || '') + (stderr ? '\nERRORS:\n' + stderr : '');

          // Try to find the helper log file in temp folder and include its contents for better diagnostics
          let logContent = '';
          try {
            const tmp = os.tmpdir();
            const files = fs.readdirSync(tmp).filter(f => f.startsWith('vittoria_create_user_') && f.endsWith('.log'));
            if (files.length > 0) {
              // choose newest
              const newest = files.map(f => ({ f, t: fs.statSync(path.join(tmp, f)).mtimeMs })).sort((a,b)=>b.t-a.t)[0].f;
              logContent = fs.readFileSync(path.join(tmp, newest), 'utf8');
            }
          } catch (e) {
            logContent = combined; // fallback to captured stdout/stderr
          }

          const result = (code === 0) ? { success: true, message: 'User created (or already exists).', logs: logContent || combined } : { success: false, code, message: 'Helper exited with non-zero code', logs: logContent || combined };
          resolve(result);
        });
        proc.on('error', (err) => {
          resolve({ success: false, error: err.message });
        });
      });
    } catch (error) {
      console.error('[setupController] Error creating user on Windows:', error);
      return { success: false, error: error.message };
    }
  });

  /**
   * Generate SQL script for creating user manually
   */
  ipcMain.handle('setup:generateUserScript', async (_event, { newUser }) => {
    try {
      // Provide platform-specific script/instructions
      const platform = process.platform;
      let script;

      if (platform === 'win32') {
        script = `-- Windows (PowerShell/CMD) instructions to create PostgreSQL user
-- Open "SQL Shell (psql)" or run psql from the PostgreSQL bin directory.
-- Example (from an elevated Command Prompt or PowerShell where psql is in PATH):
psql -U postgres -c "CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}';"

-- If you need CREATEDB privilege as well:
psql -U postgres -c "CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}' CREATEDB;"

-- Alternatively, open psql interactively and run the CREATE USER command.
`;
      } else {
        // Unix-like platforms (Linux / macOS)
        script = `-- Run this command in your terminal to create the PostgreSQL user
-- Copy and paste this into your terminal:

sudo -u postgres psql -c "CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}' CREATEDB;"

-- Or if you prefer to do it interactively:
-- 1. sudo -u postgres psql
-- 2. CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}' CREATEDB;
-- 3. \\q
`;
      }

      return { success: true, script };
    } catch (error) {
      console.error('[setupController] Error generating script:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * Create database with provided credentials
   */
  ipcMain.handle('setup:createDatabase', async (_event, config) => {
    try {
      const result = await createDatabase(config);
      return result;
    } catch (error) {
      console.error('[setupController] Error creating database:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to create database'
      };
    }
  });

  /**
   * Initialize database schema
   */
  ipcMain.handle('setup:initializeSchema', async (_event, config) => {
    try {
      const result = await initializeSchema(config);
      return result;
    } catch (error) {
      console.error('[setupController] Error initializing schema:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to initialize schema'
      };
    }
  });

  /**
   * Save database configuration
   */
  ipcMain.handle('setup:saveConfig', async (_event, config) => {
    try {
      const { setCredentials } = require('../db/pgConnection.cjs');
      
      const credentials = {
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.dbName || 'vittoria_launchpad',
        username: config.username,
        password: config.password
      };
      
      // First, save credentials to local file
      saveLocalCredentials(credentials);
      
      // Then set credentials in pgConnection so it can connect
      setCredentials(credentials);
      
      // Now save to PostgreSQL settings table (for backup/sync)
      await setSetting('db_host', credentials.host);
      await setSetting('db_port', credentials.port);
      await setSetting('db_name', credentials.database);
      await setSetting('db_username', credentials.username);
      await setSetting('db_password', credentials.password);
      await setSetting('setup_completed', 'true');
      
      console.log('[setupController] Configuration saved successfully');
      return {
        success: true,
        message: 'Configuration saved successfully'
      };
    } catch (error) {
      console.error('[setupController] Error saving config:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to save configuration'
      };
    }
  });

  /**
   * Complete setup process
   * Note: Setup completion is now determined by PostgreSQL connection + schema existence
   * This handler is kept for compatibility but doesn't set any flags
   */
  ipcMain.handle('setup:complete', async () => {
    try {
      console.log('[setupController] Setup completion called - verification will be done via PostgreSQL connection');
      return {
        success: true,
        message: 'Setup completed successfully'
      };
    } catch (error) {
      console.error('[setupController] Error completing setup:', error);
      return {
        success: false,
        error: error.message,
        message: 'Failed to complete setup'
      };
    }
  });

  /**
   * Reset setup (for development/testing)
   * Clears PostgreSQL credentials to force setup wizard
   */
  ipcMain.handle('setup:reset', async () => {
    try {
      await setSetting('db_host', null);
      await setSetting('db_port', null);
      await setSetting('db_name', null);
      await setSetting('db_username', null);
      await setSetting('db_password', null);
      console.log('[setupController] Setup reset - PostgreSQL credentials cleared');
      return {
        success: true,
        message: 'Setup reset successfully'
      };
    } catch (error) {
      console.error('[setupController] Error resetting setup:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  /**
   * List all databases in PostgreSQL
   */
  ipcMain.handle('setup:listDatabases', async (_event, { host = 'localhost', port = 5432, username, password }) => {
    try {
      const { Client } = require('pg');
      
      const client = new Client({
        host,
        port,
        user: username,
        password,
        database: 'postgres',
        connectionTimeoutMillis: 10000,
      });

      await client.connect();
      
      const result = await client.query(`
        SELECT datname as name, 
               pg_size_pretty(pg_database_size(datname)) as size,
               datcollate as collation
        FROM pg_database 
        WHERE datistemplate = false 
        ORDER BY datname
      `);
      
      await client.end();
      
      console.log(`[setupController] Found ${result.rows.length} databases`);
      
      return {
        success: true,
        databases: result.rows
      };
    } catch (error) {
      console.error('[setupController] Error listing databases:', error);
      return {
        success: false,
        error: error.message,
        databases: []
      };
    }
  });

  /**
   * Check database schema (list tables)
   */
  ipcMain.handle('setup:checkDatabaseSchema', async (_event, { host = 'localhost', port = 5432, username, password, dbName }) => {
    try {
      const { Client } = require('pg');
      
      const client = new Client({
        host,
        port,
        user: username,
        password,
        database: dbName,
        connectionTimeoutMillis: 10000,
      });

      await client.connect();
      
      // Get all tables
      const tablesResult = await client.query(`
        SELECT table_name, 
               pg_size_pretty(pg_total_relation_size(quote_ident(table_name)::regclass)) as size
        FROM information_schema.tables 
        WHERE table_schema = 'public' 
          AND table_type = 'BASE TABLE'
        ORDER BY table_name
      `);
      
      // Get row counts for each table
      const tables = [];
      for (const table of tablesResult.rows) {
        try {
          const countResult = await client.query(`SELECT COUNT(*) as count FROM ${table.table_name}`);
          tables.push({
            name: table.table_name,
            size: table.size,
            rows: parseInt(countResult.rows[0].count)
          });
        } catch (e) {
          tables.push({
            name: table.table_name,
            size: table.size,
            rows: 0
          });
        }
      }
      
      await client.end();
      
      console.log(`[setupController] Found ${tables.length} tables in database ${dbName}`);
      
      return {
        success: true,
        database: dbName,
        tables
      };
    } catch (error) {
      console.error('[setupController] Error checking database schema:', error);
      return {
        success: false,
        error: error.message,
        tables: []
      };
    }
  });

  /**
   * Get current database connection info
   */
  ipcMain.handle('setup:getDatabaseInfo', async () => {
    try {
      const credentials = loadLocalCredentials();
      
      if (!credentials) {
        return {
          success: false,
          connected: false,
          message: 'No database connection configured'
        };
      }
      
      const { Client } = require('pg');
      const client = new Client({
        host: credentials.host,
        port: parseInt(credentials.port),
        user: credentials.username,
        password: credentials.password,
        database: credentials.database,
        connectionTimeoutMillis: 5000
      });
      
      try {
        await client.connect();
        
        // Get database version
        const versionResult = await client.query('SELECT version()');
        const version = versionResult.rows[0].version;
        
        // Get database size
        const sizeResult = await client.query(
          `SELECT pg_size_pretty(pg_database_size($1)) as size`,
          [credentials.database]
        );
        const size = sizeResult.rows[0].size;
        
        // Get table count
        const tableCountResult = await client.query(
          `SELECT COUNT(*) as count FROM information_schema.tables WHERE table_schema = 'public'`
        );
        const tableCount = parseInt(tableCountResult.rows[0].count);
        
        await client.end();
        
        return {
          success: true,
          connected: true,
          host: credentials.host,
          port: credentials.port,
          database: credentials.database,
          username: credentials.username,
          version: version.split(' ')[1], // Extract version number
          size: size,
          tableCount: tableCount
        };
      } catch (error) {
        try { await client.end(); } catch (e) { /* ignore */ }
        return {
          success: false,
          connected: false,
          error: error.message
        };
      }
    } catch (error) {
      return {
        success: false,
        connected: false,
        error: error.message
      };
    }
  });

  /**
   * Disconnect database (delete credentials file)
   */
  ipcMain.handle('setup:disconnect', async () => {
    try {
      const filePath = getCredentialsFilePath();
      
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log('[setupController] Credentials file deleted - database disconnected');
      }
      
      // Clear credentials from memory
      const { setCredentials } = require('../db/pgConnection.cjs');
      setCredentials(null);
      
      return {
        success: true,
        message: 'Database disconnected successfully'
      };
    } catch (error) {
      console.error('[setupController] Error disconnecting database:', error);
      return {
        success: false,
        error: error.message
      };
    }
  });

  console.log('[setupController] Setup IPC handlers registered');
}

module.exports = { registerSetupIpcHandlers };
