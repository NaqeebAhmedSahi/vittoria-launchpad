#!/usr/bin/env node
// Verify all embedding columns were created successfully

const { Client } = require('pg');

const tables = [
  'intake_files',
  'candidates',
  'mandates',
  'firms',
  'sources',
  'finance_transactions',
  'people',
  'employments',
  'documents',
  'audit_log',
  'mandate_outcomes',
  'match_scores',
  'recommendation_events',
  'teams'
];

async function verifyEmbeddings() {
  const client = new Client({
    host: 'localhost',
    port: 5432,
    database: 'vittoria_launchpad',
    user: 'vittoria_admin',
    password: 'vittoria_admin'
  });

  try {
    await client.connect();
    console.log('✅ Connected to database\n');
    console.log('📊 Verifying embedding columns on all tables:\n');
    
    let successCount = 0;
    let failCount = 0;
    
    for (const table of tables) {
      const query = `
        SELECT column_name 
        FROM information_schema.columns 
        WHERE table_name = $1 AND column_name = 'embedding'
      `;
      
      const result = await client.query(query, [table]);
      
      if (result.rows.length > 0) {
        console.log(`✅ ${table.padEnd(25)} - embedding column exists`);
        successCount++;
      } else {
        console.log(`❌ ${table.padEnd(25)} - embedding column MISSING`);
        failCount++;
      }
    }
    
    console.log(`\n📈 Summary: ${successCount}/${tables.length} tables have embedding columns`);
    
    if (failCount === 0) {
      console.log('\n🎉 SUCCESS! All tables have embedding columns!');
    } else {
      console.log(`\n⚠️  WARNING: ${failCount} tables are missing embedding columns`);
    }
    
    await client.end();
    
  } catch (err) {
    console.error('❌ Error:', err.message);
    process.exit(1);
  }
}

verifyEmbeddings();
