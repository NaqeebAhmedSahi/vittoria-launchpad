#!/usr/bin/env node
// electron/setup/windowsPostgresHelper.cjs
// Helper that builds and runs an elevated PowerShell script to temporarily allow trust
// on loopback, create a Postgres user, then restore the original pg_hba.conf.

const fs = require('fs');
const os = require('os');
const path = require('path');
const child_process = require('child_process');

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error('Usage: node windowsPostgresHelper.cjs <username> <password> [serviceName]');
    process.exit(2);
  }

  const [username, password, serviceName] = args;

  const tmpDir = os.tmpdir();
  const ps1Path = path.join(tmpDir, `vittoria_create_user_${Date.now()}.ps1`);
  const logPath = path.join(tmpDir, `vittoria_create_user_${Date.now()}.log`);

  // PowerShell script that will run elevated. It performs:
  // - locate pg_hba.conf
  // - backup
  // - prepend trust lines for loopback
  // - restart service
  // - run psql to create user
  // - restore backup
  // - restart service

  const psScript = `
param(
  [string]$Username,
  [string]$Password,
  [string]$ServiceName
)
 
  function Write-Log { param($m) Add-Content -Path '${logPath.replace(/\\/g,'\\\\')}' -Value (Get-Date -Format o); Add-Content -Path '${logPath.replace(/\\/g,'\\\\')}' -Value $m }

  Write-Log "Starting Vittoria PostgreSQL user create helper"
  # 1) find pg_hba.conf quickly via the PostgreSQL Windows service (fast)
  Write-Log "Searching for PostgreSQL service to locate config paths..."
  $svc = Get-CimInstance Win32_Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'Postgres' } | Select-Object -First 1

  $pg = $null
  $exeDir = $null
  if ($svc) {
    Write-Log "Found service: $($svc.Name) -> $($svc.PathName)"
    $pathName = $svc.PathName
    # Extract executable directory
    $exe = $pathName -replace '"', '' -split ' ' | Select-Object -First 1
    $exeDir = Split-Path -Parent $exe

    # Try to find data dir from -D arg in service command line
    $dataMatch = [regex]::Match($pathName, '-D\s+"([^"]+)"')
    $candidates = @()
    if ($dataMatch.Success) { $candidates += $dataMatch.Groups[1].Value }

    # Common sibling data dir
    if ($exeDir) {
      $maybeData = Join-Path (Split-Path $exeDir -Parent) 'data'
      $candidates += $maybeData
    }

    # Check candidates for pg_hba.conf
    foreach ($cand in $candidates) {
      if ($cand -and (Test-Path (Join-Path $cand 'pg_hba.conf'))) {
        $pg = Join-Path $cand 'pg_hba.conf'
        break
      }
    }
  }

  # Fallback: check first-level version folders under Program Files\PostgreSQL (fast)
  if (-not $pg) {
    Write-Log "Service-based discovery failed; checking Program Files\PostgreSQL top-level folders..."
    try {
      $versions = Get-ChildItem -Path 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue
      foreach ($v in $versions) {
        $candidate = Join-Path $v.FullName 'data\pg_hba.conf'
        if (Test-Path $candidate) { $pg = $candidate; break }
      }
    } catch { }
  }

  if (-not $pg) {
    Write-Log "ERROR: Could not find pg_hba.conf via service or Program Files shortcuts."
    Write-Error "Could not find pg_hba.conf. Ensure PostgreSQL is installed or run manually."
    exit 3
  }

  Write-Log "Using pg_hba.conf at: $pg"

  # 2) Backup
  $bak = "$pg.bak.vittoria"
  Copy-Item -Path $pg -Destination $bak -Force
  Write-Log "Backup created: $bak"

  # 3) Read and modify: ensure trust lines for loopback are at top
  $content = Get-Content $pg -Raw
  # Remove existing explicit loopback host lines to avoid duplicates
  $lines = Get-Content $pg | Where-Object { $_ -notmatch '^\s*host\s+all\s+all\s+127\.0\.0\.1/32' -and $_ -notmatch '^\s*host\s+all\s+all\s+::1/128' }
  $prepend = @('host all all 127.0.0.1/32 trust', 'host all all ::1/128 trust')
  $new = $prepend + $lines
  $new | Set-Content $pg -NoNewline
  Write-Log "Prepended trust lines to pg_hba.conf"

# 4) Restart service
if (-not $ServiceName -or $ServiceName -eq '') {
  # attempt to find a postgres service
  $svc = Get-Service | Where-Object { $_.Name -match 'postgres' -or $_.DisplayName -match 'Postgres' } | Select-Object -First 1
  if ($svc) { $ServiceName = $svc.Name }
}

if ($ServiceName) {
  Write-Log "Restarting service: $ServiceName"
  try {
    Restart-Service -Name $ServiceName -Force -ErrorAction Stop
    # Wait until service reports Running (give up after ~10s)
    $attempts = 0
    while ($attempts -lt 10) {
      $status = (Get-Service -Name $ServiceName -ErrorAction SilentlyContinue).Status
      Write-Log "Service status: $status"
      if ($status -eq 'Running') { break }
      Start-Sleep -Seconds 1
      $attempts++
    }
    Write-Log 'Service restart attempted'
  } catch { Write-Log "Failed to restart service: $_" }
} else { Write-Log 'Could not determine service name; proceeding without restart' }

# 5) Find psql
$psql = (Get-Command psql -ErrorAction SilentlyContinue).Path
if (-not $psql) {
  # try to find in Program Files PostgreSQL <version>\bin
  $bin = Get-ChildItem 'C:\Program Files\PostgreSQL' -Directory -ErrorAction SilentlyContinue | ForEach-Object { Join-Path $_.FullName 'bin\psql.exe' } | Where-Object { Test-Path $_ } | Select-Object -First 1
  if ($bin) { $psql = $bin }
}

if (-not $psql) { Write-Log 'ERROR: psql not found in PATH or Program Files'; Write-Error 'psql not found. Please install psql or add it to PATH.'; exit 4 }
Write-Log "Found psql at: $psql"

# 6) Run CREATE USER
Write-Log "Dumping top of pg_hba.conf for verification"
try { Get-Content $pg -TotalCount 40 | ForEach-Object { Write-Log $_ } } catch { Write-Log "Failed dumping pg_hba.conf: $_" }

# 6) Ensure user exists and set password (try CREATE, then always ALTER to set password)
# Escape single quotes in password for SQL literal
$safePassword = $Password -replace "'", "''"

Write-Log "Attempting to CREATE USER (if not exists)"
try {
  $outCreate = & $psql -U postgres -h 127.0.0.1 -c "CREATE USER \"$Username\" WITH PASSWORD '$safePassword' CREATEDB;" 2>&1
  Write-Log "psql create output: $outCreate"
} catch {
  Write-Log "psql create failed (might already exist): $_"
}

Write-Log "Running ALTER USER to set password"
try {
  $outAlter = & $psql -U postgres -h 127.0.0.1 -c "ALTER USER \"$Username\" WITH PASSWORD '$safePassword';" 2>&1
  Write-Log "psql alter output: $outAlter"
  if ($LASTEXITCODE -ne 0) {
    Write-Log "psql exit code after ALTER: $LASTEXITCODE"
    throw "psql alter failed"
  }
} catch {
  Write-Log "psql execution failed during ALTER: $_"
  # Restore backup before exiting
  Copy-Item -Path $bak -Destination $pg -Force
  if ($ServiceName) { Restart-Service -Name $ServiceName -Force }
  Write-Error 'psql command failed; restored pg_hba.conf'
  exit 5
}

# 7) Restore original pg_hba.conf
Copy-Item -Path $bak -Destination $pg -Force
Write-Log "Restored original pg_hba.conf from backup"
if ($ServiceName) { Restart-Service -Name $ServiceName -Force; Write-Log 'Service restarted after restore' }

Write-Log 'User creation completed successfully'
exit 0
`;

  try {
    fs.writeFileSync(ps1Path, psScript, { encoding: 'utf8' });
  } catch (err) {
    console.error('Failed to write temp PowerShell script:', err.message);
    process.exit(1);
  }

  // Run the PowerShell script elevated using Start-Process -Verb runAs
  const command = `powershell -NoProfile -ExecutionPolicy Bypass -Command "Start-Process -FilePath powershell -ArgumentList '-NoProfile -ExecutionPolicy Bypass -File \"${ps1Path}\" -Username \"${username}\" -Password \"${password}\" -ServiceName \"${serviceName || ''}\"' -Verb runAs -Wait -PassThru"`;

  try {
    console.log('Launching elevated PowerShell to create the PostgreSQL user (UAC prompt expected)');
    child_process.execSync(command, { stdio: 'inherit' });
    console.log('PowerShell helper finished. Check log if any issues:', logPath);
    process.exit(0);
  } catch (err) {
    console.error('Elevated PowerShell script failed or was cancelled:', err.message || err);
    console.error('If UAC was cancelled, try running the following command in an elevated PowerShell manually:');
    console.error(`powershell -File "${ps1Path}" -Username "${username}" -Password "${password}" -ServiceName "${serviceName || ''}"`);
    process.exit(1);
  }
}

main();
