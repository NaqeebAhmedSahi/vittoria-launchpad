-- Migration: Add pgvector support for semantic search and retrieval
-- Description: Adds embedding columns and indexes to all tables
-- Status: Simple ALTER TABLE statements, no procedural code, works everywhere
-- Note: pgvector extension must be created by superuser before running this migration

-- ============================================================================
-- STEP 1: Add embedding columns to intake_files
-- ============================================================================
ALTER TABLE intake_files
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'parsed_text',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 2: Add embedding columns to candidates
-- ============================================================================
ALTER TABLE candidates
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'parsed',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true,
ADD COLUMN IF NOT EXISTS profile_summary_for_embedding text;

-- ============================================================================
-- STEP 3: Add embedding columns to mandates
-- ============================================================================
ALTER TABLE mandates
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'mandate',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 4: Add embedding columns to firms
-- ============================================================================
ALTER TABLE firms
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'firm_profile',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 5: Add embedding columns to sources
-- ============================================================================
ALTER TABLE sources
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'source_profile',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 6: Add embedding columns to finance_transactions
-- ============================================================================
ALTER TABLE finance_transactions
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'transaction',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 7: Add embedding columns to people
-- ============================================================================
ALTER TABLE people
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'person_profile',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 8: Add embedding columns to employments
-- ============================================================================
ALTER TABLE employments
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'employment',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 9: Add embedding columns to documents
-- ============================================================================
ALTER TABLE documents
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'document',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 10: Add embedding columns to audit_log
-- ============================================================================
ALTER TABLE audit_log
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'audit',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 11: Add embedding columns to mandate_outcomes
-- ============================================================================
ALTER TABLE mandate_outcomes
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'outcome',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 12: Add embedding columns to match_scores
-- ============================================================================
ALTER TABLE match_scores
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'match',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 13: Add embedding columns to recommendation_events
-- ============================================================================
ALTER TABLE recommendation_events
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'recommendation',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 14: Add embedding columns to teams
-- ============================================================================
ALTER TABLE teams
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'team',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 15: Add embedding columns to contacts
-- ============================================================================
ALTER TABLE contacts
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'contact_profile',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 16: Add embedding columns to emails
-- ============================================================================
ALTER TABLE emails
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'email_content',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 17: Add embedding columns to calendar_events
-- ============================================================================
ALTER TABLE calendar_events
ADD COLUMN IF NOT EXISTS embedding vector(384),
ADD COLUMN IF NOT EXISTS embedding_model varchar(255) DEFAULT 'all-MiniLM-L6-v2',
ADD COLUMN IF NOT EXISTS embedding_source varchar(50) DEFAULT 'event_details',
ADD COLUMN IF NOT EXISTS embedding_computed_at timestamp,
ADD COLUMN IF NOT EXISTS embedding_normalized boolean DEFAULT true;

-- ============================================================================
-- STEP 18: Create ivfflat indexes for semantic search
-- ============================================================================
CREATE INDEX IF NOT EXISTS intake_files_embedding_idx ON intake_files USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS candidates_embedding_idx ON candidates USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS mandates_embedding_idx ON mandates USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS firms_embedding_idx ON firms USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS sources_embedding_idx ON sources USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS finance_transactions_embedding_idx ON finance_transactions USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS people_embedding_idx ON people USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS employments_embedding_idx ON employments USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS documents_embedding_idx ON documents USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS audit_log_embedding_idx ON audit_log USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS mandate_outcomes_embedding_idx ON mandate_outcomes USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS match_scores_embedding_idx ON match_scores USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS recommendation_events_embedding_idx ON recommendation_events USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS teams_embedding_idx ON teams USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS contacts_embedding_idx ON contacts USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);
CREATE INDEX IF NOT EXISTS emails_embedding_idx ON emails USING ivfflat (embedding vector_l2_ops) WITH (lists = 100);
CREATE INDEX IF NOT EXISTS calendar_events_embedding_idx ON calendar_events USING ivfflat (embedding vector_l2_ops) WITH (lists = 50);

-- ============================================================================
-- STEP 19: Add comments for documentation
-- ============================================================================
COMMENT ON COLUMN intake_files.embedding IS 'Embedding vector for full CV text (384-dim for all-MiniLM-L6-v2)';
COMMENT ON COLUMN intake_files.embedding_model IS 'Embedding model used to generate the vector';
COMMENT ON COLUMN intake_files.embedding_source IS 'Source of embedding: ocr, parsed_text, or enriched';
COMMENT ON COLUMN intake_files.embedding_computed_at IS 'Timestamp when embedding was generated';
COMMENT ON COLUMN intake_files.embedding_normalized IS 'Whether vector is L2-normalized';

COMMENT ON COLUMN candidates.embedding IS 'Embedding vector for candidate profile';
COMMENT ON COLUMN candidates.embedding_model IS 'Embedding model used';
COMMENT ON COLUMN candidates.embedding_source IS 'Source: parsed, enriched, or manual';
COMMENT ON COLUMN candidates.profile_summary_for_embedding IS 'Concatenated text used to generate embedding (for audit and re-computation)';

COMMENT ON COLUMN contacts.embedding IS 'Embedding vector for contact profile (name, company, role, notes)';
COMMENT ON COLUMN contacts.embedding_model IS 'Embedding model used to generate the vector';
COMMENT ON COLUMN contacts.embedding_source IS 'Source: contact_profile';
COMMENT ON COLUMN contacts.embedding_computed_at IS 'Timestamp when embedding was generated';
COMMENT ON COLUMN contacts.embedding_normalized IS 'Whether vector is L2-normalized';

COMMENT ON COLUMN emails.embedding IS 'Embedding vector for email subject and body content';
COMMENT ON COLUMN emails.embedding_model IS 'Embedding model used to generate the vector';
COMMENT ON COLUMN emails.embedding_source IS 'Source: email_content';
COMMENT ON COLUMN emails.embedding_computed_at IS 'Timestamp when embedding was generated';
COMMENT ON COLUMN emails.embedding_normalized IS 'Whether vector is L2-normalized';

COMMENT ON COLUMN calendar_events.embedding IS 'Embedding vector for calendar event details (title, description, attendees)';
COMMENT ON COLUMN calendar_events.embedding_model IS 'Embedding model used to generate the vector';
COMMENT ON COLUMN calendar_events.embedding_source IS 'Source: event_details';
COMMENT ON COLUMN calendar_events.embedding_computed_at IS 'Timestamp when embedding was generated';
COMMENT ON COLUMN calendar_events.embedding_normalized IS 'Whether vector is L2-normalized';
