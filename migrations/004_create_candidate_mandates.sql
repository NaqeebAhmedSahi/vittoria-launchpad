-- Migration: Create candidate_mandates junction table
-- Description: Many-to-many relationship between candidates and mandates

CREATE TABLE IF NOT EXISTS candidate_mandates (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  mandate_id INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',  -- ACTIVE, SHORTLISTED, PRESENTED, REJECTED, PLACED
  added_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  
  CHECK (status IN ('ACTIVE', 'SHORTLISTED', 'PRESENTED', 'REJECTED', 'PLACED')),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
  FOREIGN KEY (mandate_id) REFERENCES mandates(id) ON DELETE CASCADE,
  UNIQUE(candidate_id, mandate_id)  -- Prevent duplicate assignments
);

CREATE INDEX IF NOT EXISTS idx_candidate_mandates_candidate_id ON candidate_mandates(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_mandates_mandate_id ON candidate_mandates(mandate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_mandates_status ON candidate_mandates(status);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_candidate_mandates_updated_at
  AFTER UPDATE ON candidate_mandates
  FOR EACH ROW
  BEGIN
    UPDATE candidate_mandates SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
