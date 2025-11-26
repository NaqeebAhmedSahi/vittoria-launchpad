import type { Source, RecommendationStrength } from "@/types/similarity";

export interface CandidateSummary {
  id: number;
  name: string;
  current_role: string;
}

export interface MandateSummary {
  id: number;
  title: string;
  sector: string;
  location: string;
  created_at: string;
}

export interface RecommendationEvent {
  id: string;
  source_id: number;
  candidate_id: number;
  mandate_id: number;
  strength: RecommendationStrength;
  comment?: string;
  created_at: string;
}

export type OutcomeStage = "round 1" | "round 2" | "final" | "offer" | "selected" | "rejected";
export type OutcomeResult = "pass" | "fail" | "selected" | "rejected";

export interface OutcomeEvent {
  id: string | number;
  candidate_id: number;
  mandate_id: number;
  stage: OutcomeStage;
  result: OutcomeResult;
  notes?: string | null;
  created_at: string;
  candidate_name?: string | null;
  candidate_role?: string | null;
}

export interface ReliabilityComponents {
  accuracy: number;
  consistency: number;
  impact: number;
}

export interface SourceReliabilityProfile {
  source_id: number;
  reliability_score: number;
  components: ReliabilityComponents;
  total_recommendations: number;
  evaluated_recommendations: number;
  last_calculated_at: string;
}

export interface SourceReliabilityListItem {
  source: Source;
  reliability_profile: SourceReliabilityProfile | null;
}

export interface SourceReliabilityListResponse {
  items: SourceReliabilityListItem[];
  total: number;
  page: number;
  page_size: number;
}

export interface SourceReliabilityDetailResponse {
  source: Source;
  reliability_profile: SourceReliabilityProfile | null;
  recent_recommendations: Array<{
    recommendation: RecommendationEvent;
    candidate: CandidateSummary;
    outcome_summary: string;
  }>;
}

export interface MandateRecommendationLogResponse {
  mandate: MandateSummary;
  candidates: CandidateSummary[];
  recommendations: RecommendationEvent[];
  sources: Source[];
}

export interface MandateOutcomeLogResponse {
  mandate: MandateSummary;
  candidates: CandidateSummary[];
  outcomes: OutcomeEvent[];
}

export interface ReliabilitySettings {
  weight_accuracy: number;
  weight_consistency: number;
  weight_impact: number;
  min_recommendations_for_score: number;
  last_updated_by: string;
  last_updated_at: string;
}

