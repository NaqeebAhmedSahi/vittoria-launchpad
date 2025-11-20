// Intelligence module type definitions

export interface FirmArchetype {
  id: number;
  name: string;
  description: string;
  key_characteristics: string[];
}

export interface TalentSegment {
  id: number;
  name: string;
  description: string;
  example_firms: string[];
}

export interface StrategicTheme {
  id: number;
  name: string;
  description: string;
}

export interface CandidateThemeAlignment {
  id: number;
  candidate_id: number;
  theme_id: number;
  band: 'emerging' | 'moderate' | 'strong';
  candidate_name: string;
  theme_name: string;
}

export interface MarketHiringWindow {
  id: number;
  label: string;
  year: number;
  quarter: number;
  status: 'open' | 'selective' | 'quiet';
  summary: string;
}

export interface VoiceNote {
  id: number;
  display_id: string;
  recorded_at: string;
  source: string;
  duration_seconds: number;
  status: 'queued' | 'transcribed' | 'parsed';
  linked_entity_count: number;
  transcript_path?: string;
  transcript_text?: string;
  created_at: string;
  updated_at: string;
}

export interface EdgeExportView {
  id: number;
  key: string;
  label: string;
  description: string;
  enabled: boolean;
}

export interface EdgeExport {
  id: number;
  export_type: string;
  requested_by: string;
  timestamp: string;
  record_count: number;
  file_location: string;
}

export interface DealHeatData {
  sector: string;
  region: string;
  dealCount: number;
  heatBand: 'high' | 'medium' | 'low';
}

export interface DealStructure {
  type: string;
  count: number;
  sectors: string[];
  regions: string[];
}

export interface IntelligenceOpportunity {
  candidate_id: number;
  candidate_name: string;
  mandate_id: number;
  mandate_title: string;
  firm_name: string;
  match_score: number;
  confidence: number;
}

export interface MandateRiskAlert {
  mandate_id: number;
  mandate_title: string;
  firm_name: string;
  alert_type: string;
  module: string;
  severity: 'low' | 'medium' | 'high';
  confidence: number;
  description: string;
}
