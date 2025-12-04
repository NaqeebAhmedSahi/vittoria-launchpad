// scripts/add-contacts-table.cjs
// Migration script to add the contacts table to the database

const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

async function addContactsTable() {
  // Load credentials
  const { app } = require('electron');
  let credentialsPath;
  
  try {
    credentialsPath = path.join(app.getPath('userData'), 'pg-credentials.json');
  } catch {
    // If not in Electron, use local path
    const os = require('os');
    credentialsPath = path.join(os.homedir(), '.vittoria-launchpad', 'pg-credentials.json');
  }

  let credentials = {
    host: 'localhost',
    port: 5432,
    database: 'vittoria_launchpad',
    user: 'postgres',
    password: 'cg1234',
  };

  if (fs.existsSync(credentialsPath)) {
    const stored = JSON.parse(fs.readFileSync(credentialsPath, 'utf8'));
    credentials = { ...credentials, ...stored };
  }

  const pool = new Pool(credentials);

  try {
    console.log('🔄 Connecting to database...');
    const client = await pool.connect();

    console.log('✅ Connected to database');

    // Check if table already exists
    const checkTable = await client.query(`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_name = 'contacts'
      );
    `);

    if (checkTable.rows[0].exists) {
      console.log('ℹ️  Contacts table already exists, skipping creation');
      client.release();
      await pool.end();
      return;
    }

    console.log('🔄 Creating contacts table...');

    await client.query(`
      CREATE TABLE IF NOT EXISTS contacts (
        id SERIAL PRIMARY KEY,
        -- Basic Information
        display_name VARCHAR(255) NOT NULL,
        given_name VARCHAR(100),
        surname VARCHAR(100),
        middle_name VARCHAR(100),
        title VARCHAR(100),
        company_name VARCHAR(255),
        department VARCHAR(100),
        job_title VARCHAR(150),
        
        -- Contact Information
        email_address VARCHAR(255),
        business_phones TEXT[],
        mobile_phone VARCHAR(50),
        home_phones TEXT[],
        
        -- Address Information
        business_address JSONB,
        home_address JSONB,
        other_address JSONB,
        
        -- Additional Details
        birthday DATE,
        personal_notes TEXT,
        categories TEXT[],
        
        -- Microsoft 365 specific fields
        microsoft_id VARCHAR(255) UNIQUE,
        change_key VARCHAR(255),
        
        -- Metadata
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        last_synced_at TIMESTAMP,
        is_synced BOOLEAN DEFAULT FALSE,
        
        -- Search optimization
        search_vector tsvector
      );
    `);

    console.log('✅ Contacts table created');

    console.log('🔄 Creating indexes...');

    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_contacts_display_name ON contacts(display_name);
      CREATE INDEX IF NOT EXISTS idx_contacts_email ON contacts(email_address);
      CREATE INDEX IF NOT EXISTS idx_contacts_company ON contacts(company_name);
      CREATE INDEX IF NOT EXISTS idx_contacts_microsoft_id ON contacts(microsoft_id);
      CREATE INDEX IF NOT EXISTS idx_contacts_search_vector ON contacts USING GIN(search_vector);
    `);

    console.log('✅ Indexes created');

    console.log('🔄 Creating triggers...');

    // Update trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_contacts_updated_at ON contacts;
      CREATE TRIGGER update_contacts_updated_at BEFORE UPDATE ON contacts
        FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
    `);

    // Search vector trigger
    await client.query(`
      DROP TRIGGER IF EXISTS update_contacts_search_vector ON contacts;
      CREATE TRIGGER update_contacts_search_vector BEFORE INSERT OR UPDATE ON contacts
        FOR EACH ROW EXECUTE FUNCTION tsvector_update_trigger(
          search_vector, 'pg_catalog.english',
          display_name, given_name, surname, email_address, company_name, job_title
        );
    `);

    console.log('✅ Triggers created');

    client.release();
    await pool.end();

    console.log('');
    console.log('✅ All changes applied successfully!');
    console.log('');
    console.log('Contacts table structure:');
    console.log('  - id (SERIAL PRIMARY KEY)');
    console.log('  - display_name, given_name, surname, middle_name, title');
    console.log('  - company_name, department, job_title');
    console.log('  - email_address, business_phones[], mobile_phone, home_phones[]');
    console.log('  - business_address, home_address, other_address (JSONB)');
    console.log('  - birthday, personal_notes, categories[]');
    console.log('  - microsoft_id (UNIQUE), change_key, is_synced, last_synced_at');
    console.log('  - created_at, updated_at');
    console.log('  - search_vector (for full-text search)');
    console.log('');
    console.log('Indexes:');
    console.log('  - idx_contacts_display_name');
    console.log('  - idx_contacts_email');
    console.log('  - idx_contacts_company');
    console.log('  - idx_contacts_microsoft_id');
    console.log('  - idx_contacts_search_vector (GIN)');
    console.log('');
    console.log('✅ Migration complete! Restart the app to use the Contacts feature.');

  } catch (error) {
    console.error('❌ Error adding contacts table:', error.message);
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  addContactsTable().catch(console.error);
}

module.exports = { addContactsTable };
