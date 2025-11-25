// ============================================
// Similarity Score System - Type Definitions
// ============================================

// --------------------------------------------
// Core Source Entity
// --------------------------------------------
export interface Source {
  id: string;
  name: string;
  email?: string;
  role: string;
  organisation: string;
  sectors: string[];
  geographies: string[];
  seniority_level: string;
  created_at: string;
  updated_at: string;
}

// --------------------------------------------
// Source Management (Page A)
// --------------------------------------------
export interface CreateSourceRequest {
  name: string;
  email?: string;
  role: string;
  organisation: string;
  sectors: string[];
  geographies: string[];
  seniority_level: string;
}

export interface UpdateSourceRequest extends Partial<CreateSourceRequest> {
  id: string;
}

// --------------------------------------------
// Bulk Tagging (Page B)
// --------------------------------------------
export interface BulkUpdateSourceMetadataRequest {
  updates: Array<{
    source_id: string;
    role?: string;
    sectors?: string[];
    geographies?: string[];
    seniority_level?: string;
  }>;
}

// --------------------------------------------
// Historical Import (Page C)
// --------------------------------------------
export interface HistoricalSourceRow {
  external_id: string;
  name: string;
  role: string;
  organisation: string;
  sector: string;
  geography: string;
  interaction_count: number;
}

// --------------------------------------------
// Mandate Feedback (Page D)
// --------------------------------------------
export type RecommendationStrength = "strong" | "neutral" | "weak";

export interface CreateRecommendationEventRequest {
  source_id: string;
  candidate_id: string;
  mandate_id: string;
  strength: RecommendationStrength;
  comment?: string;
  created_at?: string;
}

export interface RecommendationEvent extends CreateRecommendationEventRequest {
  id: string;
  created_at: string;
}

// --------------------------------------------
// Similarity Components
// --------------------------------------------
export interface SimilarityComponents {
  role_similarity: number;
  industry_similarity: number;
  pattern_similarity: number;
  interaction_similarity: number;
}

// --------------------------------------------
// Similarity Profile
// --------------------------------------------
export interface SourceSimilarityProfile {
  source_id: string;
  similarity_score: number;
  components: SimilarityComponents;
  last_calculated_at: string;
}

// --------------------------------------------
// Organisation Pattern Profile (Page G)
// --------------------------------------------
export interface OrgPatternProfile {
  id: string;
  roles_distribution: Record<string, number>;
  industry_distribution: Record<string, number>;
  geography_distribution: Record<string, number>;
  seniority_distribution: Record<string, number>;
  interaction_stats: {
    total_sources: number;
    total_interactions: number;
    avg_interactions_per_source: number;
  };
  last_updated_at: string;
}

// --------------------------------------------
// Source Directory (Page E)
// --------------------------------------------
export interface SourceListItem {
  source: Source;
  similarity_profile: SourceSimilarityProfile | null;
  last_interaction_at: string | null;
}

// --------------------------------------------
// Source Detail (Page F)
// --------------------------------------------
export type InteractionEventType = 
  | "insight_viewed" 
  | "used_in_shortlist" 
  | "used_in_final_decision";

export interface InteractionHistoryItem {
  id: string;
  mandate_id: string;
  mandate_title: string;
  event_type: InteractionEventType;
  timestamp: string;
}

export interface SourceDetailResponse {
  source: Source;
  similarity_profile: SourceSimilarityProfile | null;
  org_pattern: OrgPatternProfile;
  interaction_history: InteractionHistoryItem[];
}

// --------------------------------------------
// Mandate Similarity Debug (Page H)
// --------------------------------------------
export interface MandateSourceUsage {
  source: Source;
  similarity_profile: SourceSimilarityProfile;
  used_in_shortlist: boolean;
  used_in_final_decision: boolean;
}

export interface MandateSimilarityContext {
  mandate_id: string;
  mandate_title: string;
  created_at: string;
  sources: MandateSourceUsage[];
}

// --------------------------------------------
// Automatic Event Logging
// --------------------------------------------
export type SourceInteractionEventType = 
  | "insight_viewed" 
  | "used_in_shortlist" 
  | "used_in_final_decision";

export interface SourceInteractionEvent {
  id: string;
  source_id: string;
  mandate_id?: string;
  candidate_id?: string;
  event_type: SourceInteractionEventType;
  timestamp: string;
}

// --------------------------------------------
// UI Helper Types
// --------------------------------------------
export interface SimilarityScoreBadgeProps {
  score: number;
  size?: "sm" | "md" | "lg";
}

export interface SimilarityBreakdownProps {
  components: SimilarityComponents;
  showLabels?: boolean;
}

// --------------------------------------------
// Filter/Search Types
// --------------------------------------------
export interface SourceFilters {
  role?: string;
  sectors?: string[];
  geographies?: string[];
  seniority_level?: string;
  similarity_min?: number;
  similarity_max?: number;
}

export interface SourceSearchParams extends SourceFilters {
  query?: string;
  sort_by?: "name" | "similarity" | "last_interaction" | "created_at";
  sort_order?: "asc" | "desc";
  page?: number;
  limit?: number;
}
