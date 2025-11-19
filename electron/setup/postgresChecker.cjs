// electron/setup/postgresChecker.cjs
// Checks if PostgreSQL is installed and accessible on the system

const { exec } = require('child_process');
const { promisify } = require('util');
const execAsync = promisify(exec);
const fs = require('fs');
const path = require('path');

// Extract a sensible version string from command output (stdout or stderr)
function extractVersion(output) {
  if (!output) return null;
  const text = String(output);
  // Common patterns like: "psql (PostgreSQL) 16.11" or "PostgreSQL 16.11"
  let m = text.match(/PostgreSQL\)?\s*([0-9]+(?:\.[0-9]+)*)/i);
  if (m && m[1]) return m[1];
  // Fallback: first version-like token
  m = text.match(/([0-9]+\.[0-9]+(?:\.[0-9]+)?)/);
  return m ? m[1] : null;
}

/**
 * Detect if PostgreSQL is installed on the system
 * Checks common installation paths and commands
 */
async function checkPostgresInstalled() {
  console.log('[postgresChecker] Checking if PostgreSQL is installed...');
  
  const checks = {
    installed: false,
    version: null,
    path: null,
    platform: process.platform,
    methods: []
  };

  try {
    // Method 1: Check psql command
    try {
      const { stdout, stderr } = await execAsync('psql --version', { timeout: 5000 });
      const combined = `${stdout || ''}\n${stderr || ''}`;
      const version = extractVersion(combined);
      if (version) {
        checks.installed = true;
        checks.version = version;
        checks.methods.push('psql-command');
        console.log(`[postgresChecker] ✓ Found via psql: PostgreSQL ${checks.version}`);
      } else {
        console.log('[postgresChecker] psql present but no version parsed');
      }
    } catch (err) {
      console.log('[postgresChecker] psql command not found or failed to run');
    }

    // Additional fallback on Windows: use `where psql` to locate executables and try them
    if (!checks.installed && process.platform === 'win32') {
      try {
        const whereResult = await execAsync('where psql', { timeout: 4000 });
        const candidates = String(whereResult.stdout || '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
        for (const candidate of candidates) {
          try {
            const { stdout, stderr } = await execAsync(`"${candidate}" --version`, { timeout: 3000 });
            const version = extractVersion(`${stdout || ''}\n${stderr || ''}`);
            if (version) {
              checks.installed = true;
              checks.version = version;
              checks.path = candidate;
              checks.methods.push('where-exec');
              console.log(`[postgresChecker] ✓ Found via where-exec: PostgreSQL ${checks.version} at ${checks.path}`);
              break;
            }
          } catch (e) {
            // try next candidate
          }
        }
      } catch (e) {
        // where may not find anything or fail; continue to other checks
      }
    }

    // If psql wasn't found via direct exec, try scanning PATH entries for psql.exe
    if (!checks.installed && process.platform === 'win32') {
      try {
        const pathEnv = process.env.PATH || process.env.Path || '';
        console.log('[postgresChecker] PATH length:', (pathEnv || '').length);
        const parts = pathEnv.split(';').filter(Boolean);
        for (const part of parts) {
          try {
            const candidate = path.join(part, 'psql.exe');
            if (fs.existsSync(candidate)) {
              try {
                const { stdout, stderr } = await execAsync(`"${candidate}" --version`, { timeout: 3000 });
                const version = extractVersion(`${stdout || ''}\n${stderr || ''}`);
                if (version) {
                  checks.installed = true;
                  checks.version = version;
                  checks.path = candidate;
                  checks.methods.push('path-scan');
                  console.log(`[postgresChecker] ✓ Found via PATH scan: PostgreSQL ${checks.version} at ${checks.path}`);
                  break;
                }
              } catch (err) {
                // ignore
              }
            }
          } catch (e) {
            // ignore malformed path entries
          }
        }
      } catch (e) {
        console.log('[postgresChecker] Error scanning PATH for psql:', e && e.message);
      }
    }

    // Method 2: Check postgres command
    if (!checks.installed) {
      try {
        const { stdout, stderr } = await execAsync('postgres --version', { timeout: 5000 });
        const version = extractVersion(`${stdout || ''}\n${stderr || ''}`);
        if (version) {
          checks.installed = true;
          checks.version = version;
          checks.methods.push('postgres-command');
          console.log(`[postgresChecker] ✓ Found via postgres: PostgreSQL ${checks.version}`);
        }
      } catch (err) {
        console.log('[postgresChecker] postgres command not found');
      }
    }

    // Method 3: Platform-specific checks
    if (!checks.installed) {
      if (process.platform === 'win32') {
        // Windows: Check common installation paths
        try {
          // First try `where` which checks PATH
          try {
            const { stdout } = await execAsync('where psql', { timeout: 5000 });
            if (stdout && stdout.trim()) {
              checks.installed = true;
              checks.path = stdout.trim().split('\n')[0];
              checks.methods.push('windows-where');
              console.log(`[postgresChecker] ✓ Found via where: ${checks.path}`);
            }
          } catch (e) {
            console.log('[postgresChecker] where psql failed or not found in PATH');
          }

          // If not found in PATH, check common Program Files installation folders (non-recursive top-level)
          if (!checks.installed) {
            const possibleRoots = [process.env.PROGRAMFILES, process.env['PROGRAMFILES(X86)'], process.env.PROGRAMW6432, 'C:\\Program Files\\PostgreSQL'];
            const versionsToCheck = ['17','16','15','14','13','12','11','10','9.6','9.5'];

            for (const root of possibleRoots) {
              if (!root) continue;
              // ensure base points to a folder that contains Postgres installs
              let base = root;
              if (!base.toLowerCase().includes('postgres')) {
                base = path.join(base, 'PostgreSQL');
              }

              for (const ver of versionsToCheck) {
                const candidate = path.join(base, ver, 'bin', 'psql.exe');
                try {
                  if (!fs.existsSync(candidate)) continue;
                  // attempt to run psql --version from the candidate path
                  const { stdout, stderr } = await execAsync(`"${candidate}" --version`, { timeout: 3000 });
                  const version = extractVersion(`${stdout || ''}\n${stderr || ''}`);
                  if (version) {
                    checks.installed = true;
                    checks.version = version;
                    checks.path = candidate;
                    checks.methods.push('program-files-scan');
                    console.log(`[postgresChecker] ✓ Found via Program Files: PostgreSQL ${checks.version} at ${checks.path}`);
                    break;
                  }
                } catch (err) {
                  // candidate not present or failed; continue
                }
              }
              if (checks.installed) break;
            }
          }
        } catch (err) {
          console.log('[postgresChecker] Windows where check failed');
        }
      } else {
        // Unix/Mac: Check common binary locations
        const commonPaths = [
          '/usr/bin/psql',
          '/usr/local/bin/psql',
          '/opt/homebrew/bin/psql',
          '/Library/PostgreSQL/*/bin/psql'
        ];
        
        for (const path of commonPaths) {
          try {
            await execAsync(`test -f ${path}`, { timeout: 2000 });
            checks.installed = true;
            checks.path = path;
            checks.methods.push('unix-path-check');
            console.log(`[postgresChecker] ✓ Found at: ${path}`);
            break;
          } catch (err) {
            // Path doesn't exist, continue
          }
        }
      }
    }

    // Method 4: Check if PostgreSQL service is running
    if (checks.installed) {
      try {
        let serviceCheck;
        if (process.platform === 'win32') {
          serviceCheck = await execAsync('sc query postgresql-x64-* | findstr STATE', { timeout: 5000 });
        } else if (process.platform === 'darwin') {
          serviceCheck = await execAsync('brew services list | grep postgres', { timeout: 5000 });
        } else {
          serviceCheck = await execAsync('systemctl is-active postgresql || service postgresql status', { timeout: 5000 });
        }
        
        checks.running = serviceCheck.stdout.includes('RUNNING') || 
                         serviceCheck.stdout.includes('active') || 
                         serviceCheck.stdout.includes('started');
        console.log(`[postgresChecker] Service running: ${checks.running}`);
      } catch (err) {
        console.log('[postgresChecker] Could not determine service status');
        checks.running = false;
      }
    }

  } catch (error) {
    console.error('[postgresChecker] Error during detection:', error.message);
  }

  console.log('[postgresChecker] Final result:', checks);
  return checks;
}

/**
 * Test connection to PostgreSQL with provided credentials
 */
async function testConnection({ host = 'localhost', port = 5432, username, password, database = 'postgres' }) {
  console.log(`[postgresChecker] Testing connection to ${host}:${port} as ${username}...`);
  
  try {
    const { Client } = require('pg');
    const client = new Client({
      host,
      port,
      user: username,
      password,
      database,
      connectionTimeoutMillis: 10000,
    });

    await client.connect();
    const result = await client.query('SELECT version()');
    await client.end();

    console.log('[postgresChecker] ✓ Connection successful');
    console.log('[postgresChecker] Server version:', result.rows[0].version);

    return {
      success: true,
      version: result.rows[0].version,
      message: 'Successfully connected to PostgreSQL'
    };
  } catch (error) {
    console.error('[postgresChecker] ✗ Connection failed:', error.message);
    return {
      success: false,
      error: error.message,
      code: error.code,
      message: getErrorMessage(error)
    };
  }
}

/**
 * Get user-friendly error message
 */
function getErrorMessage(error) {
  if (error.code === 'ECONNREFUSED') {
    return 'PostgreSQL server is not running or not accepting connections';
  } else if (error.code === '28P01') {
    return 'Invalid username or password';
  } else if (error.code === '3D000') {
    return 'Database does not exist';
  } else if (error.code === 'ETIMEDOUT') {
    return 'Connection timed out. Check host and port';
  } else {
    return error.message;
  }
}

/**
 * Get installation instructions based on platform
 */
function getInstallationInstructions() {
  const platform = process.platform;
  
  const instructions = {
    win32: {
      title: 'Install PostgreSQL on Windows',
      steps: [
        'Download PostgreSQL installer from: https://www.postgresql.org/download/windows/',
        'Run the installer and follow the setup wizard',
        'Remember the password you set for the postgres user',
        'Ensure PostgreSQL service is running',
        'Add PostgreSQL bin directory to PATH (usually C:\\Program Files\\PostgreSQL\\<version>\\bin)'
      ],
      downloadUrl: 'https://www.postgresql.org/download/windows/'
    },
    darwin: {
      title: 'Install PostgreSQL on macOS',
      steps: [
        'Using Homebrew (recommended): brew install postgresql@15',
        'Or download from: https://www.postgresql.org/download/macosx/',
        'Start PostgreSQL: brew services start postgresql@15',
        'Initialize if needed: initdb /usr/local/var/postgres'
      ],
      downloadUrl: 'https://www.postgresql.org/download/macosx/'
    },
    linux: {
      title: 'Install PostgreSQL on Linux',
      steps: [
        'Ubuntu/Debian: sudo apt update && sudo apt install postgresql postgresql-contrib',
        'Fedora/RHEL: sudo dnf install postgresql postgresql-server',
        'Start service: sudo systemctl start postgresql',
        'Enable on boot: sudo systemctl enable postgresql'
      ],
      downloadUrl: 'https://www.postgresql.org/download/linux/'
    }
  };

  return instructions[platform] || instructions.linux;
}

module.exports = {
  checkPostgresInstalled,
  testConnection,
  getInstallationInstructions
};
