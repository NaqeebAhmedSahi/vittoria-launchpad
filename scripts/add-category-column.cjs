const { Pool } = require('pg');

async function addCategoryColumn() {
  const pool = new Pool({
    user: process.env.PGUSER || 'postgres',
    host: process.env.PGHOST || 'localhost',
    database: process.env.PGDATABASE || 'vittoria_launchpad',
    password: process.env.PGPASSWORD || 'cg1234',
    port: process.env.PGPORT || 5432,
  });

  try {
    console.log('Connecting to database...');
    const client = await pool.connect();
    
    console.log('Adding category column to intake_folder_documents...');
    await client.query(`
      ALTER TABLE intake_folder_documents 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';
    `);
    
    console.log('✅ Category column added successfully!');
    
    // Verify it was added
    const result = await client.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'intake_folder_documents'
      AND column_name = 'category';
    `);
    
    if (result.rows.length > 0) {
      console.log('✅ Verified: Column exists');
      console.log(result.rows[0]);
    } else {
      console.log('⚠️  Warning: Could not verify column was added');
    }
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

addCategoryColumn();
