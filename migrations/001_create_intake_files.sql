-- Migration: Create intake_files table
-- Description: Stores uploaded CV files and their parsing status

CREATE TABLE IF NOT EXISTS intake_files (
  id SERIAL PRIMARY KEY,
  file_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'NEW',  -- NEW, PARSING, PARSED, NEEDS_REVIEW, APPROVED, REJECTED
  quality_score REAL,                   -- 0.0 to 1.0
  parsed_json TEXT,                     -- JSON stored as TEXT
  candidate_id INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,

  CHECK (status IN ('NEW', 'PARSING', 'PARSED', 'NEEDS_REVIEW', 'APPROVED', 'REJECTED')),
  CHECK (quality_score IS NULL OR (quality_score >= 0 AND quality_score <= 1))
);

CREATE INDEX IF NOT EXISTS idx_intake_files_status ON intake_files(status);
CREATE INDEX IF NOT EXISTS idx_intake_files_candidate_id ON intake_files(candidate_id);
CREATE INDEX IF NOT EXISTS idx_intake_files_created_at ON intake_files(created_at);

-- Trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_intake_files_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_intake_files_updated_at
  BEFORE UPDATE ON intake_files
  FOR EACH ROW
  EXECUTE FUNCTION update_intake_files_updated_at();
