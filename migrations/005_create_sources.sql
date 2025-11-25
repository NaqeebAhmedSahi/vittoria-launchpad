-- Migration: Create sources table
-- Description: Stores source profiles for similarity scoring

CREATE TABLE IF NOT EXISTS sources (
  id SERIAL PRIMARY KEY,
  name VARCHAR(128) NOT NULL,
  email VARCHAR(128),
  role VARCHAR(64) NOT NULL,
  organisation VARCHAR(128) NOT NULL,
  sectors JSONB NOT NULL DEFAULT '[]',
  geographies JSONB NOT NULL DEFAULT '[]',
  seniority_level VARCHAR(64) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);
