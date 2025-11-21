export type BiasRiskLevel = 'low' | 'moderate' | 'high';
export type ReasoningBasis = 'expertise-led' | 'mixed' | 'similarity-heavy';

export interface BiasScoredCandidate {
  id: string;
  name: string;
  overallScore: number;
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
  biasRisk: BiasRiskLevel;
  expertiseRank: number;
  similarityRank: number;
  reasoning: string;
}

export interface SourceAttribution {
  id: string;
  type: 'cv' | 'notes' | 'voice' | 'market';
  label: string;
  reasoningBasis: ReasoningBasis;
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
}

export interface BiasDecisionLog {
  id: string;
  mandateId: string;
  mandateName: string;
  sector: string;
  timestamp: string;
  biasRiskLevel: BiasRiskLevel;
  divergenceScore: number;
  affectedCandidates: number;
}

export interface WeeklyBiasSummary {
  weekId: string;
  weekLabel: string;
  highRiskDecisions: number;
  affectedMandates: number;
  topSimilarityDriver: string;
  avgDivergence: number;
  mandateBreakdown: MandateBiasBreakdown[];
  sourceTypeBreakdown: SourceTypeBiasBreakdown[];
}

export interface MandateBiasBreakdown {
  mandateId: string;
  mandateName: string;
  sector: string;
  highBiasEvents: number;
  avgDivergence: number;
}

export interface SourceTypeBiasBreakdown {
  sourceType: string;
  similarityHeavyCount: number;
  comment: string;
}

export interface RankingDivergence {
  candidateId: string;
  candidateName: string;
  expertiseRank: number;
  similarityRank: number;
  movement: number;
}
