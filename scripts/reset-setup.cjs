#!/usr/bin/env node
// scripts/reset-setup.cjs
// Cross-platform reset of local setup: clears PostgreSQL credentials from the app sqlite DB

const fs = require('fs');
const path = require('path');
const os = require('os');
const sqlite3 = require('sqlite3').verbose();
const { open } = require('sqlite');

async function main() {
  try {
    const pkg = require('../package.json');
    const appName = pkg.name || 'vite_react_shadcn_ts';

    // Candidate locations where Electron's app.getPath('userData') typically points
    const candidates = [];

    // Linux/XDG
    candidates.push(path.join(os.homedir(), '.config', appName, 'vittoria.db'));

    // macOS
    candidates.push(path.join(os.homedir(), 'Library', 'Application Support', appName, 'vittoria.db'));

    // Windows: APPDATA or LOCALAPPDATA
    if (process.env.APPDATA) {
      candidates.push(path.join(process.env.APPDATA, appName, 'vittoria.db'));
    }
    if (process.env.LOCALAPPDATA) {
      candidates.push(path.join(process.env.LOCALAPPDATA, appName, 'vittoria.db'));
    }

    // Fallback: common legacy location
    candidates.push(path.join(os.homedir(), '.config', 'vite_react_shadcn_ts', 'vittoria.db'));

    // Unique-ify candidate list
    const uniq = Array.from(new Set(candidates));

    let foundPath = null;
    for (const p of uniq) {
      if (!p) continue;
      if (fs.existsSync(p)) {
        foundPath = p;
        break;
      }
    }

    if (!foundPath) {
      console.error('❌ Could not find vittoria.db in common locations.\nSearched:\n' + uniq.join('\n'));
      process.exitCode = 2;
      return;
    }

    console.log('📍 Found database at:', foundPath);

    // Open DB and remove PostgreSQL credentials
    const db = await open({ filename: foundPath, driver: sqlite3.Database });

    const keys = ['db_host', 'db_port', 'db_name', 'db_username', 'db_password', 'setup_completed'];
    const placeholders = keys.map(() => '?').join(',');

    await db.run(`DELETE FROM settings WHERE key IN (${placeholders})`, keys);

    console.log('\n✅ Setup has been reset (PostgreSQL credentials removed).\n');

    const rows = await db.all("SELECT key, value FROM settings WHERE key LIKE 'db_%' OR key = 'setup_completed'");
    if (!rows || rows.length === 0) {
      console.log('(No PostgreSQL credentials found - setup wizard will appear)');
    } else {
      console.log('Current PostgreSQL settings:');
      console.table(rows);
    }

    await db.close();
    console.log('\n🚀 You can now run `npm run electron:dev` to see the setup wizard again.');
  } catch (err) {
    console.error('Error resetting setup:', err && err.message ? err.message : err);
    process.exitCode = 1;
  }
}

main();
