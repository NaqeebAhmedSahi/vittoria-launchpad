// electron/setup/setupController.cjs
// IPC handlers for database setup flow

const { ipcMain } = require('electron');
const { checkPostgresInstalled, testConnection, getInstallationInstructions } = require('./postgresChecker.cjs');
const { createDatabase, initializeSchema } = require('./databaseInitializer.cjs');
const { getSetting, setSetting } = require('../models/settingsModel.cjs');

function registerSetupIpcHandlers() {
  console.log('[setupController] Registering setup IPC handlers...');
  
  /**
   * Check if setup has been completed by verifying PostgreSQL connection
   * Instead of using SQLite flag, we check if we can connect to PostgreSQL
   */
  ipcMain.handle('setup:isCompleted', async () => {
    console.log('[setupController] setup:isCompleted called');
    try {
      const { Client } = require('pg');
      const { setCredentials } = require('../db/pgConnection.cjs');
      
      // Try to get stored PostgreSQL credentials from settings
      // First we need to check if we have a settings table at all
      let dbHost, dbPort, dbName, dbUsername, dbPassword;
      
      try {
        dbHost = await getSetting('db_host');
        dbPort = await getSetting('db_port');
        dbName = await getSetting('db_name');
        dbUsername = await getSetting('db_username');
        dbPassword = await getSetting('db_password');
      } catch (error) {
        // If getSetting fails, it means PostgreSQL isn't set up yet
        console.log('[setupController] No credentials found - setup not complete');
        return {
          success: true,
          completed: false
        };
      }
      
      // If no credentials stored, setup is not complete
      if (!dbHost || !dbPort || !dbName || !dbUsername || !dbPassword) {
        console.log('[setupController] No PostgreSQL credentials found - setup not complete');
        return {
          success: true,
          completed: false
        };
      }
      
      console.log('[setupController] Found credentials, setting them and testing connection...');
      
      // Set credentials for pgConnection
      setCredentials({
        host: dbHost,
        port: dbPort,
        database: dbName,
        username: dbUsername,
        password: dbPassword
      });
      
      // Try to connect to PostgreSQL
      const client = new Client({
        host: dbHost,
        port: parseInt(dbPort),
        user: dbUsername,
        password: dbPassword,
        database: dbName,
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

      try {
        // Check if user already exists
        const userCheck = await client.query(
          "SELECT 1 FROM pg_roles WHERE rolname = $1",
          [newUser.username]
        );

        if (userCheck.rows.length > 0) {
          // User exists, update password
          console.log('[setupController] User exists, updating password');
          await client.query(
            `ALTER USER "${newUser.username}" WITH PASSWORD $1`,
            [newUser.password]
          );
        } else {
          // Create new user with CREATEDB privilege
          console.log('[setupController] Creating new user');
          await client.query(
            `CREATE USER "${newUser.username}" WITH PASSWORD $1 CREATEDB`,
            [newUser.password]
          );
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
   * Generate SQL script for creating user manually
   */
  ipcMain.handle('setup:generateUserScript', async (_event, { newUser }) => {
    try {
      const script = `-- Run this command in your terminal to create the PostgreSQL user
-- Copy and paste this into your terminal:

sudo -u postgres psql -c "CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}' CREATEDB;"

-- Or if you prefer to do it interactively:
-- 1. sudo -u postgres psql
-- 2. CREATE USER ${newUser.username} WITH PASSWORD '${newUser.password}' CREATEDB;
-- 3. \\q
`;

      return {
        success: true,
        script
      };
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
      
      // First, set credentials in pgConnection so it can connect
      setCredentials({
        host: config.host || 'localhost',
        port: config.port || 5432,
        database: config.dbName || 'vittoria_launchpad',
        username: config.username,
        password: config.password
      });
      
      // Now save to PostgreSQL settings table
      await setSetting('db_host', config.host || 'localhost');
      await setSetting('db_port', config.port || 5432);
      await setSetting('db_name', config.dbName || 'vittoria_launchpad');
      await setSetting('db_username', config.username);
      await setSetting('db_password', config.password);
      await setSetting('setup_completed', 'true');
      
      console.log('[setupController] Configuration saved successfully to PostgreSQL');
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

  console.log('[setupController] Setup IPC handlers registered');
}

module.exports = { registerSetupIpcHandlers };
