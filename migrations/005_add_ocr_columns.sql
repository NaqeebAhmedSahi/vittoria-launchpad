-- Add OCR progress tracking columns to intake_files table
-- Migration: 005_add_ocr_columns.sql

ALTER TABLE intake_files 
ADD COLUMN IF NOT EXISTS ocr_progress INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS ocr_method VARCHAR(50);

-- Add comment for documentation
COMMENT ON COLUMN intake_files.ocr_progress IS 'OCR extraction progress percentage (0-100)';
COMMENT ON COLUMN intake_files.ocr_method IS 'Method used for text extraction (OCR, Text extraction, Direct read)';
