#!/bin/bash

# Script to apply pgvector migration to Vittoria Launchpad database
# Usage: ./scripts/apply-pgvector-migration.sh [database-name]

set -e

# Configuration
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
DB_USER="${DB_USER:-postgres}"
DB_NAME="${1:-vittoria_launchpad}"

echo "╔════════════════════════════════════════════════════════════════════════════╗"
echo "║                  Applying pgvector Migration                               ║"
echo "╚════════════════════════════════════════════════════════════════════════════╝"
echo ""
echo "📊 Configuration:"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  User: $DB_USER"
echo "  Database: $DB_NAME"
echo ""

# Check if PostgreSQL is accessible
echo "🔍 Checking PostgreSQL connection..."
if ! psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1;" > /dev/null 2>&1; then
    echo "❌ Error: Cannot connect to PostgreSQL"
    echo "   Make sure PostgreSQL is running and credentials are correct"
    exit 1
fi
echo "✅ PostgreSQL connection successful"
echo ""

# Check if database exists
echo "🔍 Checking if database exists..."
if ! psql -h "$DB_HOST" -U "$DB_USER" -d postgres -c "SELECT 1 FROM pg_database WHERE datname = '$DB_NAME';" | grep -q 1; then
    echo "❌ Error: Database '$DB_NAME' does not exist"
    exit 1
fi
echo "✅ Database '$DB_NAME' exists"
echo ""

# Check if pgvector extension is already installed
echo "🔍 Checking pgvector extension..."
if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM pg_extension WHERE extname = 'vector';" | grep -q vector; then
    echo "✅ pgvector extension already installed"
else
    echo "⚠️  pgvector extension not found, migration will install it"
fi
echo ""

# Apply migration
echo "📝 Applying migration 006_add_pgvector_embeddings.sql..."
echo ""

migration_file="migrations/006_add_pgvector_embeddings.sql"

if [ ! -f "$migration_file" ]; then
    echo "❌ Error: Migration file not found: $migration_file"
    exit 1
fi

if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -f "$migration_file" 2>&1; then
    echo ""
    echo "✅ Migration applied successfully!"
    echo ""
    
    # Verify migration
    echo "🔍 Verifying migration..."
    echo ""
    
    # Check pgvector extension
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT * FROM pg_extension WHERE extname = 'vector';" | grep -q vector; then
        echo "✅ pgvector extension installed"
    fi
    
    # Check embedding columns on firms table
    if psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -c "SELECT column_name FROM information_schema.columns WHERE table_name='firms' AND column_name='embedding';" | grep -q embedding; then
        echo "✅ Embedding columns added to firms table"
    fi
    
    # Count tables with embedding columns
    table_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT COUNT(DISTINCT table_name) FROM information_schema.columns 
      WHERE column_name = 'embedding' AND table_schema = 'public';
    " | tr -d ' ')
    echo "✅ Embedding columns added to $table_count tables"
    
    # Check ivfflat indexes
    index_count=$(psql -h "$DB_HOST" -U "$DB_USER" -d "$DB_NAME" -t -c "
      SELECT COUNT(*) FROM pg_indexes 
      WHERE indexname LIKE '%embedding_idx' AND schemaname = 'public';
    " | tr -d ' ')
    echo "✅ Created $index_count ivfflat indexes"
    
    echo ""
    echo "╔════════════════════════════════════════════════════════════════════════════╗"
    echo "║                   ✅ MIGRATION COMPLETE                                    ║"
    echo "╚════════════════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "📋 Next steps:"
    echo "  1. Test embedding generation:"
    echo "     node scripts/test-pgvector-integration.cjs"
    echo ""
    echo "  2. Start the application:"
    echo "     npm run electron:dev"
    echo ""
else
    echo ""
    echo "❌ Migration failed!"
    exit 1
fi
