-- Migration: Source Accuracy Tracking System
-- Purpose: Track historical accuracy of information sources to compute reliability scores
-- 
-- This enables the bias-aware scoring system to:
-- 1. Learn which sources (CV, voice notes, market data) are most reliable
-- 2. Weight sources based on past performance
-- 3. Identify sources that contribute to biased decisions
-- 4. Provide transparency about why candidates scored the way they did

-- ============================================================================
-- Source Accuracy Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS source_accuracy_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_id VARCHAR(255) NOT NULL,           -- e.g., "cv-123", "voice-456", "market-789"
  source_type VARCHAR(50) NOT NULL,          -- "cv", "mandate_note", "voice_note", "market_data", "manual"
  
  -- Context
  candidate_id INTEGER REFERENCES candidates(id) ON DELETE CASCADE,
  mandate_id INTEGER,                        -- Reference to mandate if applicable
  
  -- Outcome tracking
  outcome BOOLEAN NOT NULL,                  -- TRUE = good outcome, FALSE = bad outcome
  outcome_type VARCHAR(50),                  -- "placement_success", "placement_failure", "candidate_withdrawal", "client_rejection"
  
  -- Metadata
  notes TEXT,                                -- Optional explanation of outcome
  logged_by INTEGER,                         -- User ID who logged this
  logged_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_source_accuracy_source_id ON source_accuracy_log(source_id);
CREATE INDEX IF NOT EXISTS idx_source_accuracy_source_type ON source_accuracy_log(source_type);
CREATE INDEX IF NOT EXISTS idx_source_accuracy_candidate ON source_accuracy_log(candidate_id);
CREATE INDEX IF NOT EXISTS idx_source_accuracy_logged_at ON source_accuracy_log(logged_at);

-- ============================================================================
-- Source Profiles (cache of current accuracy metrics)
-- ============================================================================

CREATE TABLE IF NOT EXISTS source_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Source identification
  source_id VARCHAR(255) UNIQUE NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  source_label TEXT,
  
  -- Aggregated accuracy metrics
  total_uses INTEGER DEFAULT 0,
  correct_uses INTEGER DEFAULT 0,
  reliability_score DECIMAL(3,2) DEFAULT 0.50,  -- 0.00 to 1.00
  
  -- Metadata
  first_used_at TIMESTAMP,
  last_used_at TIMESTAMP,
  last_computed_at TIMESTAMP DEFAULT NOW(),
  
  -- Optional manual weight override
  manual_weight DECIMAL(3,2),                    -- NULL or 0.00 to 2.00
  manual_weight_reason TEXT
);

CREATE INDEX IF NOT EXISTS idx_source_profiles_source_id ON source_profiles(source_id);
CREATE INDEX IF NOT EXISTS idx_source_profiles_source_type ON source_profiles(source_type);

-- ============================================================================
-- Candidate Source Signals
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_source_signals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  mandate_id INTEGER,                           -- Optional: specific to a mandate
  source_id VARCHAR(255) NOT NULL,
  source_type VARCHAR(50) NOT NULL,
  
  -- Tag data
  domain_tags TEXT[] DEFAULT '{}',              -- Expertise tags: ["private-equity", "infrastructure"]
  similarity_tags TEXT[] DEFAULT '{}',          -- Affinity tags: ["goldman-sachs", "harvard"]
  
  -- Metadata
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_candidate_source_signals_candidate ON candidate_source_signals(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_source_signals_mandate ON candidate_source_signals(mandate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_source_signals_source_id ON candidate_source_signals(source_id);

-- ============================================================================
-- Candidate Bias-Aware Scores (cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS candidate_bias_scores (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Links
  candidate_id INTEGER NOT NULL REFERENCES candidates(id) ON DELETE CASCADE,
  mandate_id INTEGER NOT NULL,
  
  -- Three core scores
  avg_expertise_score DECIMAL(3,2) NOT NULL,
  avg_similarity_score DECIMAL(3,2) NOT NULL,
  avg_reliability_score DECIMAL(3,2) NOT NULL,
  
  -- Combined score
  composite_score DECIMAL(3,2) NOT NULL,
  
  -- Bias detection
  similarity_dominance DECIMAL(3,2),            -- similarity - expertise
  bias_risk_level VARCHAR(10),                  -- "low", "medium", "high"
  
  -- Metadata
  computed_at TIMESTAMP DEFAULT NOW(),
  base_match_score DECIMAL(3,2),               -- Original match score before bias adjustment
  
  UNIQUE(candidate_id, mandate_id)
);

CREATE INDEX IF NOT EXISTS idx_candidate_bias_scores_candidate ON candidate_bias_scores(candidate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_bias_scores_mandate ON candidate_bias_scores(mandate_id);
CREATE INDEX IF NOT EXISTS idx_candidate_bias_scores_composite ON candidate_bias_scores(composite_score DESC);
CREATE INDEX IF NOT EXISTS idx_candidate_bias_scores_bias_risk ON candidate_bias_scores(bias_risk_level);

-- ============================================================================
-- Bias Events Log
-- ============================================================================

CREATE TABLE IF NOT EXISTS bias_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Context
  mandate_id INTEGER NOT NULL,
  mandate_title TEXT,
  
  -- Bias detection
  event_type VARCHAR(50) NOT NULL,              -- "high_divergence", "top_candidate_change", "similarity_heavy"
  severity VARCHAR(10) NOT NULL,                -- "low", "medium", "high"
  
  -- Metrics
  avg_divergence DECIMAL(5,2),                  -- Average rank difference
  max_divergence INTEGER,                       -- Max rank jump
  affected_candidates INTEGER,                  -- How many candidates affected
  
  -- Details
  expertise_led_top_3 JSONB,                    -- Top 3 candidates in expertise ranking
  similarity_led_top_3 JSONB,                   -- Top 3 candidates in similarity ranking
  
  -- Metadata
  detected_at TIMESTAMP DEFAULT NOW(),
  reviewed BOOLEAN DEFAULT FALSE,
  reviewed_by INTEGER,
  reviewed_at TIMESTAMP,
  review_notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_bias_events_mandate ON bias_events(mandate_id);
CREATE INDEX IF NOT EXISTS idx_bias_events_severity ON bias_events(severity);
CREATE INDEX IF NOT EXISTS idx_bias_events_detected_at ON bias_events(detected_at);
CREATE INDEX IF NOT EXISTS idx_bias_events_reviewed ON bias_events(reviewed);

-- ============================================================================
-- Helper Functions
-- ============================================================================

-- Function to recompute source profile accuracy
CREATE OR REPLACE FUNCTION recompute_source_profile(p_source_id VARCHAR)
RETURNS VOID AS $$
DECLARE
  v_total INTEGER;
  v_correct INTEGER;
  v_reliability DECIMAL(3,2);
  v_first_used TIMESTAMP;
  v_last_used TIMESTAMP;
BEGIN
  -- Aggregate from log
  SELECT 
    COUNT(*),
    SUM(CASE WHEN outcome THEN 1 ELSE 0 END),
    MIN(logged_at),
    MAX(logged_at)
  INTO v_total, v_correct, v_first_used, v_last_used
  FROM source_accuracy_log
  WHERE source_id = p_source_id;
  
  -- Compute reliability (with Bayesian shrinkage towards 0.5)
  IF v_total = 0 THEN
    v_reliability := 0.50;
  ELSIF v_total < 5 THEN
    -- Shrink towards 0.5 for low-sample sources
    v_reliability := 0.5 + ((v_correct::DECIMAL / v_total) - 0.5) * (v_total::DECIMAL / 5);
  ELSE
    v_reliability := v_correct::DECIMAL / v_total;
  END IF;
  
  -- Upsert into source_profiles
  INSERT INTO source_profiles (source_id, total_uses, correct_uses, reliability_score, first_used_at, last_used_at, last_computed_at)
  VALUES (p_source_id, v_total, v_correct, v_reliability, v_first_used, v_last_used, NOW())
  ON CONFLICT (source_id) DO UPDATE SET
    total_uses = EXCLUDED.total_uses,
    correct_uses = EXCLUDED.correct_uses,
    reliability_score = EXCLUDED.reliability_score,
    last_used_at = EXCLUDED.last_used_at,
    last_computed_at = NOW();
END;
$$ LANGUAGE plpgsql;

-- Function to log source accuracy and update profile
CREATE OR REPLACE FUNCTION log_source_accuracy(
  p_source_id VARCHAR,
  p_source_type VARCHAR,
  p_candidate_id INTEGER,
  p_mandate_id INTEGER,
  p_outcome BOOLEAN,
  p_outcome_type VARCHAR DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_logged_by INTEGER DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_log_id UUID;
BEGIN
  -- Insert log entry
  INSERT INTO source_accuracy_log (
    source_id, source_type, candidate_id, mandate_id, 
    outcome, outcome_type, notes, logged_by
  )
  VALUES (
    p_source_id, p_source_type, p_candidate_id, p_mandate_id,
    p_outcome, p_outcome_type, p_notes, p_logged_by
  )
  RETURNING id INTO v_log_id;
  
  -- Recompute source profile
  PERFORM recompute_source_profile(p_source_id);
  
  RETURN v_log_id;
END;
$$ LANGUAGE plpgsql;

-- ============================================================================
-- Sample Data (for testing)
-- ============================================================================

-- Uncomment to insert sample data for testing
/*
-- Sample: CV source with good accuracy
SELECT log_source_accuracy('cv-1', 'cv', 1, 1, TRUE, 'placement_success', 'Candidate accepted offer and performed well', NULL);
SELECT log_source_accuracy('cv-1', 'cv', 2, 1, TRUE, 'placement_success', NULL, NULL);
SELECT log_source_accuracy('cv-1', 'cv', 3, 2, FALSE, 'placement_failure', 'Candidate left after 3 months', NULL);

-- Sample: Voice note source with mixed accuracy
SELECT log_source_accuracy('voice-123', 'voice_note', 1, 1, TRUE, 'placement_success', NULL, NULL);
SELECT log_source_accuracy('voice-123', 'voice_note', 4, 1, FALSE, 'candidate_withdrawal', 'Overhyped in voice note', NULL);
SELECT log_source_accuracy('voice-123', 'voice_note', 5, 2, FALSE, 'client_rejection', 'Too much focus on shared background', NULL);
*/

-- ============================================================================
-- Comments
-- ============================================================================

COMMENT ON TABLE source_accuracy_log IS 'Tracks every use of a source and its outcome for reliability scoring';
COMMENT ON TABLE source_profiles IS 'Cached aggregated accuracy metrics for each source';
COMMENT ON TABLE candidate_source_signals IS 'Links candidates to their information sources with extracted tags';
COMMENT ON TABLE candidate_bias_scores IS 'Cached bias-aware scores for candidate-mandate pairs';
COMMENT ON TABLE bias_events IS 'Log of detected high-bias situations requiring review';

COMMENT ON FUNCTION log_source_accuracy IS 'Log a source usage outcome and update reliability metrics';
COMMENT ON FUNCTION recompute_source_profile IS 'Recalculate accuracy metrics for a source from log entries';
