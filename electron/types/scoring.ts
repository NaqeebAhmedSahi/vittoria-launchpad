/**
 * Type definitions for CV parsing, scoring, and candidate management
 */

export interface ParsedCv {
  name: string;
  current_title?: string;
  current_firm?: string;
  location?: string;
  sectors: string[];        // e.g. ["ECM", "FIG"]
  functions: string[];      // e.g. ["Coverage"]
  asset_classes: string[];  // e.g. ["Equity"]
  geographies: string[];    // e.g. ["UK", "EMEA"]
  seniority: string;        // e.g. "Director"
  experience: ExperienceEntry[];
  education: EducationEntry[];
  raw_text: string; // full extracted text
}

export interface ExperienceEntry {
  firm?: string;
  title?: string;
  dateFrom?: string;
  dateTo?: string | null;
}

export interface EducationEntry {
  institution?: string;
  degree?: string;
}

export interface Mandate {
  primary_sector: string;
  primary_function: string;
  primary_asset_class: string;
  regions: string[];
  seniority_min: string;
  seniority_max: string;
}

export interface CvQualityResult {
  score: number;            // 0–1 float
  breakdown: Record<string, number>;
}

export interface CvQualityConfig {
  cv_quality: {
    weights: {
      completeness: number;
      experience: number;
      education: number;
      parser_confidence: number;
    };
    good_threshold: number;
    borderline_threshold: number;
  };
}

export interface FitScoringConfig {
  weights: {
    sector: number;
    function: number;
    assetClass: number;
    geography: number;
    seniority: number;
  };
}

export interface FitScoreResult {
  finalScore: number; // 0–100
  dimensionScores: {
    sector: number;
    function: number;
    assetClass: number;
    geography: number;
    seniority: number;
  };
}

export interface IntakeFile {
  id: number;
  file_name: string;
  status: IntakeFileStatus;
  quality_score?: number;
  parsed_json?: ParsedCv;
  candidate_id?: number;
  created_at: Date;
}

export type IntakeFileStatus = 
  | 'NEW' 
  | 'PARSING' 
  | 'PARSED' 
  | 'NEEDS_REVIEW' 
  | 'APPROVED' 
  | 'REJECTED';

export interface Candidate {
  id: number;
  name: string;
  current_title?: string;
  current_firm?: string;
  location?: string;
  sectors: string[];
  functions: string[];
  asset_classes: string[];
  geographies: string[];
  seniority?: string;
  status: CandidateStatus;
  created_at: Date;
}

export type CandidateStatus = 'DRAFT' | 'ACTIVE' | 'ARCHIVED';

export interface MatchScore {
  id: number;
  candidate_id: number;
  mandate_id?: number;
  final_score: number;
  dimension_scores: FitScoreResult['dimensionScores'];
  created_at: Date;
}

export interface CvUploadResult {
  intakeStatus: string;
  candidateId?: number;
  cvQualityScore: number;
  fitScore?: number;
}
