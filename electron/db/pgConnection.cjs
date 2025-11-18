// electron/db/pgConnection.cjs
// PostgreSQL connection pool manager

const { Pool } = require('pg');

let pool = null;
let credentials = null;

/**
 * Set PostgreSQL credentials (called during setup)
 */
function setCredentials(creds) {
  credentials = {
    host: creds.host || 'localhost',
    port: parseInt(creds.port) || 5432,
    database: creds.database || creds.dbName,
    user: creds.user || creds.username,
    password: creds.password
  };
  console.log('[pgConnection] Credentials set:', { 
    host: credentials.host, 
    port: credentials.port, 
    database: credentials.database, 
    user: credentials.user 
  });
  // Reset pool so it will be recreated with new credentials
  if (pool) {
    pool.end().catch(err => console.error('[pgConnection] Error closing pool:', err));
    pool = null;
  }
}

/**
 * Initialize PostgreSQL connection pool with stored credentials
 */
async function initPgPool() {
  if (pool) {
    return pool;
  }

  if (!credentials) {
    throw new Error('PostgreSQL credentials not set. Call setCredentials() first.');
  }

  try {
    pool = new Pool({
      host: credentials.host,
      port: credentials.port,
      database: credentials.database,
      user: credentials.user,
      password: credentials.password,
      max: 20, // Maximum number of clients in the pool
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000,
    });

    pool.on('error', (err) => {
      console.error('[pgConnection] Unexpected error on idle client', err);
    });

    console.log('[pgConnection] PostgreSQL connection pool initialized');
    return pool;
  } catch (error) {
    console.error('[pgConnection] Failed to initialize PostgreSQL pool:', error);
    throw error;
  }
}

/**
 * Get PostgreSQL connection pool
 * Creates pool if it doesn't exist
 */
async function getPgPool() {
  if (!pool) {
    return await initPgPool();
  }
  return pool;
}

/**
 * Close PostgreSQL connection pool
 */
async function closePgPool() {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('[pgConnection] PostgreSQL connection pool closed');
  }
}

/**
 * Execute a query with automatic connection management
 */
async function query(text, params) {
  const pool = await getPgPool();
  return pool.query(text, params);
}

/**
 * Get a client from the pool for transactions
 */
async function getClient() {
  const pool = await getPgPool();
  return pool.connect();
}

/**
 * Check if credentials are set
 */
function hasCredentials() {
  return credentials !== null;
}

module.exports = {
  setCredentials,
  initPgPool,
  getPgPool,
  closePgPool,
  query,
  getClient,
  hasCredentials
};
