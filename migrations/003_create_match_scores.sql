-- Migration: Create match_scores table
-- Description: Stores fit scores between candidates and mandates

CREATE TABLE IF NOT EXISTS match_scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL,
  mandate_id INTEGER,                -- NULL for dummy/test matches
  final_score REAL NOT NULL,         -- 0.0 to 100.0
  dimension_scores TEXT NOT NULL,    -- JSON stored as TEXT: { sector, function, assetClass, geography, seniority }
  created_at TEXT DEFAULT CURRENT_TIMESTAMP,
  updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
  
  CHECK (final_score >= 0 AND final_score <= 100),
  FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id ON match_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_mandate_id ON match_scores(mandate_id);
CREATE INDEX IF NOT EXISTS idx_match_scores_final_score ON match_scores(final_score DESC);
CREATE INDEX IF NOT EXISTS idx_match_scores_created_at ON match_scores(created_at);

-- Trigger to update updated_at timestamp
CREATE TRIGGER IF NOT EXISTS trigger_match_scores_updated_at
  AFTER UPDATE ON match_scores
  FOR EACH ROW
  BEGIN
    UPDATE match_scores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
  END;
