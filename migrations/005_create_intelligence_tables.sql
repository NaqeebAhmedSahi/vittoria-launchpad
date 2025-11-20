-- Firm Archetypes
CREATE TABLE IF NOT EXISTS firm_archetypes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  key_characteristics TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add archetype_id to firms if not exists
ALTER TABLE firms ADD COLUMN archetype_id INTEGER REFERENCES firm_archetypes(id);

-- Talent Segments
CREATE TABLE IF NOT EXISTS talent_segments (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  example_firms TEXT, -- JSON array
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Strategic Themes
CREATE TABLE IF NOT EXISTS strategic_themes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  description TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Candidate Theme Alignment
CREATE TABLE IF NOT EXISTS candidate_theme_alignment (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  candidate_id INTEGER NOT NULL REFERENCES candidates(id),
  theme_id INTEGER NOT NULL REFERENCES strategic_themes(id),
  band TEXT CHECK(band IN ('emerging', 'moderate', 'strong')),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(candidate_id, theme_id)
);

-- Market Hiring Windows
CREATE TABLE IF NOT EXISTS market_hiring_windows (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  label TEXT NOT NULL,
  year INTEGER NOT NULL,
  quarter INTEGER NOT NULL,
  status TEXT CHECK(status IN ('open', 'selective', 'quiet')),
  summary TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Voice Notes
CREATE TABLE IF NOT EXISTS voice_notes (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  display_id TEXT UNIQUE,
  recorded_at DATETIME,
  source TEXT,
  duration_seconds INTEGER,
  status TEXT CHECK(status IN ('queued', 'transcribed', 'parsed')),
  linked_entity_count INTEGER DEFAULT 0,
  transcript_path TEXT,
  transcript_text TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Edge Export Views
CREATE TABLE IF NOT EXISTS edge_export_views (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  key TEXT UNIQUE NOT NULL,
  label TEXT NOT NULL,
  description TEXT,
  enabled BOOLEAN DEFAULT 1,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Edge Exports
CREATE TABLE IF NOT EXISTS edge_exports (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  export_type TEXT NOT NULL,
  requested_by TEXT,
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  record_count INTEGER,
  file_location TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- Add deal fields if they don't exist
ALTER TABLE deals ADD COLUMN primary_sector TEXT;
ALTER TABLE deals ADD COLUMN regions TEXT; -- JSON array

-- Seed Firm Archetypes
INSERT INTO firm_archetypes (name, description, key_characteristics) VALUES
  ('Global Platform', 'Large multinational institutions with global reach and diverse service offerings', '["Extensive geographic presence", "Multiple practice areas", "Large deal teams", "Established brand recognition"]'),
  ('Boutique Specialist', 'Focused firms with deep expertise in specific sectors or transaction types', '["Niche sector focus", "Senior-level attention", "Flexible fee structures", "Specialized expertise"]'),
  ('Sponsor-Backed', 'Firms with private equity or institutional backing enabling rapid growth', '["Capital-backed expansion", "Platform building", "Acquisition strategy", "Growth trajectory"]'),
  ('Regional Leader', 'Dominant players in specific geographic markets with strong local networks', '["Regional market knowledge", "Local relationships", "Cultural expertise", "Market leadership"]');

-- Seed Talent Segments
INSERT INTO talent_segments (name, description, example_firms) VALUES
  ('Global Banking Platforms', 'Leading international investment banks with full-service capabilities', '["Goldman Sachs", "JP Morgan", "Morgan Stanley", "Bank of America", "Citi"]'),
  ('Infrastructure Credit Funds', 'Specialized debt providers focused on infrastructure assets', '["Ares Infrastructure", "Allianz Capital Partners", "Pemberton", "Churchill Asset Management"]'),
  ('PE Sponsors (Mega-cap)', 'Largest private equity firms managing $50B+ in assets', '["Blackstone", "KKR", "Carlyle", "TPG", "Apollo"]'),
  ('PE Sponsors (Upper Mid-Market)', 'Private equity firms focused on deals between $500M-$2B', '["Advent", "TA Associates", "Warburg Pincus", "GTCR"]'),
  ('Boutique Advisory', 'Independent M&A and strategic advisory firms', '["Evercore", "Lazard", "Moelis", "Centerview", "PJT Partners"]'),
  ('Real Assets Platforms', 'Firms specializing in real estate, infrastructure, and tangible assets', '["Brookfield", "Macquarie", "Blackstone Real Estate", "Starwood Capital"]');

-- Seed Strategic Themes
INSERT INTO strategic_themes (name, description) VALUES
  ('ESG Integration', 'Environmental, Social, and Governance factors in investment decision-making'),
  ('Energy Transition', 'Shift towards renewable energy and sustainable power infrastructure'),
  ('Digital Infrastructure', 'Data centers, fiber networks, telecom towers, and digital connectivity'),
  ('Healthcare Real Assets', 'Healthcare facilities, senior housing, and medical infrastructure');

-- Seed Market Hiring Windows
INSERT INTO market_hiring_windows (label, year, quarter, status, summary) VALUES
  ('Q4 2025', 2025, 4, 'open', 'Strong hiring across most sectors. Year-end push for critical hires.'),
  ('Q1 2026', 2026, 1, 'open', 'Continued momentum from Q4. New fiscal year budgets released.'),
  ('Q2 2026', 2026, 2, 'selective', 'Mid-year review period. Focus on strategic additions only.'),
  ('Q3 2026', 2026, 3, 'quiet', 'Summer slowdown. Limited new mandate activity expected.'),
  ('Q4 2026', 2026, 4, 'open', 'Traditional year-end hiring surge anticipated.'),
  ('Q1 2027', 2027, 1, 'open', 'Strong start expected based on forward indicators.');

-- Seed Edge Export Views
INSERT INTO edge_export_views (key, label, description, enabled) VALUES
  ('org_chart', 'Organization Charts', 'Redacted org charts showing team structures without internal notes', 1),
  ('profile_pack', 'Candidate Profile Packs', 'Client-ready candidate summaries with public information only', 1),
  ('firm_summary', 'Firm Summaries', 'High-level firm overviews and market positioning', 1),
  ('mandate_report', 'Mandate Reports', 'Search progress updates with sanitized candidate status', 0);

-- Seed sample Voice Notes
INSERT INTO voice_notes (display_id, recorded_at, source, duration_seconds, status, linked_entity_count, transcript_text) VALUES
  ('VN-001', datetime('now', '-2 hours'), 'Folder: /VoiceNotes', 245, 'parsed', 3, 'Spoke with Sarah Chen about the Infrastructure PE Partner role at Brookfield. She''s very interested and available for interview next week. Current comp is £220k base.'),
  ('VN-002', datetime('now', '-1 day'), 'Email: voice@vittoria.ai', 180, 'transcribed', 1, 'Meeting notes from Goldman Sachs. They want to expand the ECM MD search to include candidates with restructuring background.'),
  ('VN-003', datetime('now', '-2 days'), 'Folder: /VoiceNotes', 320, 'parsed', 5, 'Weekly pipeline review: 3 strong candidates for KKR Private Credit role. Need to schedule client presentations for Klaus Schmidt and two others.'),
  ('VN-004', datetime('now', '-3 days'), 'Folder: /VoiceNotes', 156, 'queued', 0, NULL);

-- Seed sample Edge Exports
INSERT INTO edge_exports (export_type, requested_by, timestamp, record_count, file_location) VALUES
  ('org_chart', 'James Patterson', datetime('now', '-1 hour'), 45, '/exports/org_chart_20250120.pdf'),
  ('profile_pack', 'Sarah Chen', datetime('now', '-3 hours'), 12, '/exports/candidate_pack_20250120.pdf'),
  ('firm_summary', 'Klaus Schmidt', datetime('now', '-1 day'), 8, '/exports/firm_summary_20250119.pdf'),
  ('profile_pack', 'James Patterson', datetime('now', '-2 days'), 15, '/exports/candidate_pack_20250118.pdf');
