const { Pool } = require('pg');

async function fixIntakeFolderDocuments() {
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
    
    console.log('1. Adding category column if not exists...');
    await client.query(`
      ALTER TABLE intake_folder_documents 
      ADD COLUMN IF NOT EXISTS category VARCHAR(50) DEFAULT 'other';
    `);
    console.log('✅ Category column added/verified');
    
    console.log('2. Dropping foreign key constraint on folder_id...');
    await client.query(`
      ALTER TABLE intake_folder_documents 
      DROP CONSTRAINT IF EXISTS intake_folder_documents_folder_id_fkey;
    `);
    console.log('✅ Foreign key constraint removed');
    
    console.log('3. Making folder_id nullable...');
    await client.query(`
      ALTER TABLE intake_folder_documents 
      ALTER COLUMN folder_id DROP NOT NULL;
    `);
    console.log('✅ folder_id is now nullable');
    
    // Verify changes
    const result = await client.query(`
      SELECT 
        column_name, 
        data_type, 
        is_nullable,
        column_default
      FROM information_schema.columns
      WHERE table_name = 'intake_folder_documents'
      AND column_name IN ('category', 'folder_id')
      ORDER BY column_name;
    `);
    
    console.log('\n✅ All changes applied successfully!');
    console.log('\nColumn details:');
    result.rows.forEach(row => {
      console.log(`  ${row.column_name}: ${row.data_type}, nullable=${row.is_nullable}, default=${row.column_default}`);
    });
    
    client.release();
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error);
  } finally {
    await pool.end();
  }
}

fixIntakeFolderDocuments();
