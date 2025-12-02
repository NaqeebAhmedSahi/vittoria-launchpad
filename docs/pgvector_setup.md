# pgVector Extension Setup

## Automatic Setup (No Commands Needed!)

The application will **automatically** try to create the pgvector extension when you first run it. In most cases, no manual intervention is needed.

## What Happens on First Run?

1. **App tries to create extension with your user** ✅
2. **If that fails, app tries with `postgres` superuser** ✅  
3. **If both fail, app creates a helper script** 📜

### When Helper Script is Created

If the app cannot create the extension automatically, it will:

1. Create a script at: `~/.config/Vittoria Launchpad/create-pgvector-extension.sh`
2. Show you the path in the console
3. Continue running (all features work except embeddings)

### Running the Helper Script

```bash
# The app will tell you the exact path, but typically:
bash ~/.config/Vittoria\ Launchpad/create-pgvector-extension.sh
```

After running the script once, **restart the app** and embeddings will work! ✨

## Manual Setup (If Needed)

If you prefer to do it manually:

```bash
# On Linux
sudo -u postgres psql -d vittoria_launchpad -c "CREATE EXTENSION IF NOT EXISTS vector;"
```

## Prerequisites

Make sure pgvector is installed:

```bash
# Ubuntu/Debian
sudo apt install postgresql-16-pgvector

# Or for other PostgreSQL versions
sudo apt install postgresql-15-pgvector  # for PostgreSQL 15
sudo apt install postgresql-14-pgvector  # for PostgreSQL 14
```

## Summary

**✅ In 99% of cases**: Just run the app, it handles everything automatically!

**📜 If helper script is needed**: Run it once, restart app, done!

**🎉 Result**: Embeddings work on ANY PC without manual SQL commands!
