-- Migration: Create candidates table
-- Description: Stores candidate profiles parsed from CVs

CREATE TABLE IF NOT EXISTS candidates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  current_title TEXT,
  current_firm TEXT,
  location TEXT,
  sectors TEXT DEFAULT '[]',             -- JSON array stored as TEXT
  functions TEXT DEFAULT '[]',           -- JSON array stored as TEXT
  asset_classes TEXT DEFAULT '[]',       -- JSON array stored as TEXT
  geographies TEXT DEFAULT '[]',         -- JSON array stored as TEXT
  seniority TEXT,
  status TEXT NOT NULL DEFAULT 'DRAFT',  -- DRAFT, ACTIVE, ARCHIVED
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (status IN ('DRAFT', 'ACTIVE', 'ARCHIVED'))
);

CREATE INDEX IF NOT EXISTS idx_candidates_status ON candidates(status);
CREATE INDEX IF NOT EXISTS idx_candidates_name ON candidates(name);
CREATE INDEX IF NOT EXISTS idx_candidates_current_firm ON candidates(current_firm);
CREATE INDEX IF NOT EXISTS idx_candidates_seniority ON candidates(seniority);
CREATE INDEX IF NOT EXISTS idx_candidates_created_at ON candidates(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_candidates_updated_at
  AFTER UPDATE ON candidates
  FOR EACH ROW
  BEGIN
    UPDATE candidates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
