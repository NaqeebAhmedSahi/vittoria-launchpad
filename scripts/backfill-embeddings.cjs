#!/usr/bin/env node
// scripts/backfill-embeddings.cjs
// Backfill embeddings for all tables that have embedding columns but NULL values

const path = require('path');
const fs = require('fs');
const embeddingClient = require('../electron/services/embeddingClient.cjs');
const db = require('../electron/db/pgConnection.cjs');

// Load database credentials
function loadCredentials() {
  const possiblePaths = [
    path.join(require('os').homedir(), '.config', 'vittoria-launchpad', 'db_credentials.json'),
    path.join(__dirname, '..', 'db_credentials.json'),
    '/tmp/vittoria_db_credentials.json'
  ];

  for (const credPath of possiblePaths) {
    if (fs.existsSync(credPath)) {
      try {
        const creds = JSON.parse(fs.readFileSync(credPath, 'utf-8'));
        db.setCredentials(creds);
        console.log(`✓ Loaded credentials from: ${credPath}`);
        return true;
      } catch (err) {
        console.error(`Failed to load credentials from ${credPath}: ${err.message}`);
      }
    }
  }

  // Fallback to default postgres credentials
  console.log('⚠️  No credentials file found, using default postgres credentials');
  db.setCredentials({
    host: 'localhost',
    port: 5432,
    user: 'postgres',
    password: '',
    database: 'vittoria_launchpad'
  });
  return true;
}

// Configuration for each table: what text to embed
const TABLE_CONFIGS = {
  emails: {
    textFields: ['subject', 'sender', 'body'],
    source: 'email_content',
    generateText: (row) => {
      const parts = [];
      if (row.subject) parts.push(`Subject: ${row.subject}`);
      if (row.sender) parts.push(`From: ${row.sender}`);
      if (row.body) parts.push(row.body.substring(0, 500)); // Limit body length
      return parts.join('\n');
    }
  },
  contacts: {
    textFields: ['display_name', 'company_name', 'job_title', 'email_address'],
    source: 'contact_profile',
    generateText: (row) => {
      const parts = [];
      if (row.display_name) parts.push(row.display_name);
      if (row.company_name) parts.push(`Company: ${row.company_name}`);
      if (row.job_title) parts.push(`Title: ${row.job_title}`);
      if (row.email_address) parts.push(`Email: ${row.email_address}`);
      if (row.department) parts.push(`Department: ${row.department}`);
      return parts.join(' | ');
    }
  },
  calendar_events: {
    textFields: ['title', 'description', 'location'],
    source: 'event_details',
    generateText: (row) => {
      const parts = [];
      if (row.title) parts.push(row.title);
      if (row.description) parts.push(row.description.substring(0, 300));
      if (row.location) parts.push(`Location: ${row.location}`);
      if (row.organizer) parts.push(`Organizer: ${row.organizer}`);
      return parts.join(' - ');
    }
  },
  candidates: {
    textFields: ['name', 'current_title', 'current_firm', 'location'],
    source: 'parsed',
    generateText: (row) => {
      const parts = [];
      if (row.name) parts.push(row.name);
      if (row.current_title) parts.push(row.current_title);
      if (row.current_firm) parts.push(`at ${row.current_firm}`);
      if (row.location) parts.push(row.location);
      if (row.profile_summary_for_embedding) parts.push(row.profile_summary_for_embedding);
      return parts.join(' ');
    }
  },
  mandates: {
    textFields: ['name', 'location', 'primary_sector'],
    source: 'mandate',
    generateText: (row) => {
      const parts = [];
      if (row.name) parts.push(row.name);
      if (row.location) parts.push(row.location);
      if (row.primary_sector) parts.push(row.primary_sector);
      if (row.sectors) parts.push(JSON.stringify(row.sectors));
      if (row.functions) parts.push(JSON.stringify(row.functions));
      return parts.join(' ');
    }
  },
  firms: {
    textFields: ['name', 'short_name', 'website'],
    source: 'firm_profile',
    generateText: (row) => {
      const parts = [];
      if (row.name) parts.push(row.name);
      if (row.short_name) parts.push(row.short_name);
      if (row.website) parts.push(row.website);
      if (row.sector_focus) parts.push(JSON.stringify(row.sector_focus));
      if (row.notes_text) parts.push(row.notes_text.substring(0, 200));
      return parts.join(' ');
    }
  }
};

async function backfillTable(tableName, config) {
  console.log(`\n[Backfill] Processing table: ${tableName}`);
  console.log('━'.repeat(60));

  try {
    // Get all rows without embeddings
    const query = `
      SELECT * FROM ${tableName}
      WHERE embedding IS NULL
      ORDER BY id
    `;
    const result = await db.query(query);
    const rows = result.rows;

    if (rows.length === 0) {
      console.log(`✓ No rows need embedding generation`);
      return { success: true, processed: 0, failed: 0 };
    }

    console.log(`Found ${rows.length} rows without embeddings`);

    let processed = 0;
    let failed = 0;

    for (const row of rows) {
      try {
        const text = config.generateText(row);
        
        if (!text || text.trim().length === 0) {
          console.log(`⊘ Skipping ${tableName}.id=${row.id} - no text to embed`);
          continue;
        }

        console.log(`Processing ${tableName}.id=${row.id}...`);
        
        await embeddingClient.generateAndPersistEmbedding(
          tableName,
          row.id,
          text,
          { source: config.source }
        );

        processed++;
        console.log(`  ✓ Generated embedding for ${tableName}.id=${row.id}`);
        
        // Small delay to avoid overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (err) {
        failed++;
        console.error(`  ✗ Failed for ${tableName}.id=${row.id}: ${err.message}`);
      }
    }

    console.log(`\n${tableName} Summary:`);
    console.log(`  ✓ Processed: ${processed}`);
    console.log(`  ✗ Failed: ${failed}`);
    console.log(`  ⊘ Skipped: ${rows.length - processed - failed}`);

    return { success: true, processed, failed };
  } catch (err) {
    console.error(`[Backfill] Error processing ${tableName}: ${err.message}`);
    return { success: false, error: err.message };
  }
}

async function main() {
  console.log('\n' + '='.repeat(60));
  console.log('EMBEDDING BACKFILL SCRIPT');
  console.log('='.repeat(60));
  console.log('This script will generate embeddings for all rows that are missing them.');
  console.log('');

  // Load credentials first
  if (!loadCredentials()) {
    console.error('Failed to load database credentials');
    process.exit(1);
  }

  const tables = process.argv.slice(2);
  const tablesToProcess = tables.length > 0 ? tables : Object.keys(TABLE_CONFIGS);

  console.log(`Tables to process: ${tablesToProcess.join(', ')}`);
  console.log('');

  const results = {};

  for (const tableName of tablesToProcess) {
    const config = TABLE_CONFIGS[tableName];
    
    if (!config) {
      console.log(`\n⚠️  Unknown table: ${tableName} - skipping`);
      continue;
    }

    const result = await backfillTable(tableName, config);
    results[tableName] = result;
  }

  console.log('\n' + '='.repeat(60));
  console.log('BACKFILL COMPLETE');
  console.log('='.repeat(60));
  
  Object.entries(results).forEach(([table, result]) => {
    if (result.success) {
      console.log(`${table}: ${result.processed} processed, ${result.failed} failed`);
    } else {
      console.log(`${table}: ERROR - ${result.error}`);
    }
  });

  console.log('');
  process.exit(0);
}

// Run if called directly
if (require.main === module) {
  main().catch(err => {
    console.error('Fatal error:', err);
    process.exit(1);
  });
}

module.exports = { backfillTable, TABLE_CONFIGS };
