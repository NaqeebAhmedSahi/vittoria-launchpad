// scripts/add-contacts-embedding.cjs
// Migration script to add vector embedding column to contacts table

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function addContactsEmbedding() {
  // Load credentials - try multiple locations
  const os = require('os');
  const possiblePaths = [
    path.join(os.homedir(), '.config', 'vittoria-launchpad', 'pg-credentials.json'),
    path.join(os.homedir(), '.vittoria-launchpad', 'pg-credentials.json'),
    path.join(__dirname, '..', '.pg-credentials.json'),
  ];

  let credentials = {
    host: 'localhost',
    port: 5432,
    database: 'vittoria_launchpad',
    user: 'postgres',
    password: '',
  };

  for (const credPath of possiblePaths) {
    if (fs.existsSync(credPath)) {
      console.log(`📄 Loading credentials from: ${credPath}`);
      const stored = JSON.parse(fs.readFileSync(credPath, 'utf8'));
      credentials = { 
        host: stored.host || credentials.host,
        port: stored.port || credentials.port,
        database: stored.database || stored.dbName || credentials.database,
        user: stored.user || stored.username || credentials.user,
        password: stored.password || credentials.password,
      };
      break;
    }
  }

  console.log(`📡 Connecting to: ${credentials.user}@${credentials.host}:${credentials.port}/${credentials.database}`);

  const pool = new Pool(credentials);

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected to database');

    // Check if embedding column already exists
    const checkColumn = await client.query(`
      SELECT column_name 
      FROM information_schema.columns 
      WHERE table_name = 'contacts' AND column_name = 'embedding';
    `);

    if (checkColumn.rows.length > 0) {
      console.log('ℹ️  Embedding column already exists, skipping...');
      client.release();
      await pool.end();
      return;
    }

    console.log('🔄 Adding embedding column to contacts table...');

    await client.query(`
      ALTER TABLE contacts 
      ADD COLUMN IF NOT EXISTS embedding vector(1536);
    `);

    console.log('✅ Embedding column added');

    console.log('🔄 Creating vector index...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_embedding 
      ON contacts USING ivfflat (embedding vector_cosine_ops) 
      WITH (lists = 100);
    `);

    console.log('✅ Vector index created');

    client.release();
    await pool.end();

    console.log('');
    console.log('✅ All changes applied successfully!');
    console.log('');
    console.log('Added to contacts table:');
    console.log('  - embedding vector(1536) column');
    console.log('  - idx_contacts_embedding index (ivfflat with cosine similarity)');
    console.log('');
    console.log('✅ Migration complete! Contacts now support vector embeddings for semantic search.');

  } catch (error) {
    console.error('❌ Error adding contacts embedding:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addContactsEmbedding().catch(console.error);
}

module.exports = { addContactsEmbedding };
