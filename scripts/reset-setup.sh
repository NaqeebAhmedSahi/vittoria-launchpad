#!/bin/bash
# Reset Vittoria Launchpad Setup
# This script clears PostgreSQL credentials to show the setup wizard again

DB_PATH="$HOME/.config/vite_react_shadcn_ts/vittoria.db"

echo "🔄 Resetting Vittoria Launchpad Setup..."

if [ ! -f "$DB_PATH" ]; then
    echo "❌ Database not found at: $DB_PATH"
    echo "The app may not have been run yet."
    exit 1
fi

echo "📍 Found database at: $DB_PATH"

# Clear PostgreSQL credentials (setup completion is now checked via PostgreSQL connection)
echo "🔧 Clearing PostgreSQL credentials..."
sqlite3 "$DB_PATH" "DELETE FROM settings WHERE key IN ('db_host', 'db_port', 'db_name', 'db_username', 'db_password', 'setup_completed');"

# Verify
echo ""
echo "✅ Setup has been reset!"
echo ""
echo "Current PostgreSQL settings:"
sqlite3 "$DB_PATH" "SELECT key, value FROM settings WHERE key LIKE 'db_%' OR key = 'setup_completed';"

if [ -z "$(sqlite3 "$DB_PATH" "SELECT key FROM settings WHERE key LIKE 'db_%' LIMIT 1;")" ]; then
    echo "(No PostgreSQL credentials found - setup wizard will appear)"
fi

echo ""
echo "🚀 You can now run 'npm run electron:dev' to see the setup wizard again."
