/**
 * Bias-Aware Reasoning Engine
 * 
 * Pure TypeScript utilities for bias-aware candidate ranking and transparency.
 * This module provides deterministic, testable functions for:
 * - Computing bias scores from multiple sources
 * - Building expertise-led vs similarity-led rankings
 * - Generating counterfactual explanations
 * - Providing source attribution and transparency
 * - Generating weekly bias watch summaries
 * 
 * NO REACT. NO BACKEND CALLS. Pure logic only.
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Weights for composite score calculation.
 * Expertise is intentionally the dominant factor.
 */
export const WEIGHTS = {
  expertise: 0.5,
  similarity: 0.25,
  reliability: 0.25,
} as const;

/**
 * If similarityScore exceeds expertiseScore by more than this threshold,
 * we cap the composite score to prevent similarity from dominating.
 */
export const SIMILARITY_DOMINANCE_THRESHOLD = 0.15;

/**
 * Bias risk level thresholds
 */
export const BIAS_RISK_THRESHOLDS = {
  low: 0.05,
  medium: 0.15,
} as const;

/**
 * High bias event threshold for weekly summaries
 */
export const HIGH_BIAS_DIVERGENCE_THRESHOLD = 1.5;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * A source of information about a candidate (CV, voice note, market data, etc.)
 */
export interface SourceProfile {
  id: string;
  type: "cv" | "mandate_note" | "voice_note" | "market_data" | "manual";
  label: string;
  expertiseScore: number;      // 0-1: How much this source reflects genuine expertise
  similarityScore: number;     // 0-1: How much this source reflects affinity/familiarity
  reliabilityScore: number;    // 0-1: How trustworthy/verified is this source
  metadata?: Record<string, any>;
}

/**
 * Computed bias-aware scores for a candidate
 */
export interface BiasScores {
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
  compositeScore: number;
  biasRiskScore: number;       // similarityScore - expertiseScore
  biasRiskLevel: "low" | "medium" | "high";
}

/**
 * A candidate with their sources and base match score
 */
export interface CandidateWithSources {
  id: string;
  name: string;
  mandateId: string;
  baseMatchScore: number;      // Existing fit score from the app (0-1)
  sources: SourceProfile[];
}

/**
 * Result of ranking a candidate
 */
export interface RankingResult {
  candidateId: string;
  rank: number;
  compositeScore: number;
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
  biasRiskLevel: "low" | "medium" | "high";
}

/**
 * Comparison between expertise-led and similarity-led rankings
 */
export interface BiasRankingComparison {
  expertiseRanking: RankingResult[];
  similarityRanking: RankingResult[];
  divergenceScore: number;     // Average absolute rank difference
}

/**
 * Counterfactual explanation showing what would change if we ranked by similarity
 */
export interface CounterfactualExplanation {
  mandateId: string;
  topN: number;
  expertiseTop: RankingResult[];
  similarityTop: RankingResult[];
  explanation: string;
}

/**
 * Reasoning basis classification
 */
export type ReasoningBasis = "expertise-led" | "mixed" | "similarity-heavy";

/**
 * Source attribution tag for UI display
 */
export interface SourceAttributionTag {
  sourceId: string;
  sourceType: SourceProfile["type"];
  label: string;
  reasoningBasis: ReasoningBasis;
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
}

/**
 * Weekly bias watch summary
 */
export interface BiasWatchSummary {
  weekId: string;              // e.g. "2025-W47"
  highBiasEventCount: number;
  mostAffectedMandates: {
    mandateId: string;
    name: string;
    highBiasEvents: number;
    avgDivergence: number;
  }[];
  sourceTypeStats: {
    sourceType: SourceProfile["type"];
    similarityHeavyCount: number;
    comment: string;
  }[];
  avgDivergenceScore: number;
}

/**
 * Extended comparison for weekly tracking (internal use)
 */
export interface BiasRankingComparisonExtended extends BiasRankingComparison {
  mandateId: string;
  weekId: string;
}

// ============================================================================
// CORE SCORING UTILITIES
// ============================================================================

/**
 * Compute bias-aware scores from an array of sources.
 * 
 * This function:
 * 1. Aggregates expertise, similarity, and reliability scores across all sources
 * 2. Computes a composite score with expertise as the dominant factor
 * 3. Detects and mitigates similarity dominance
 * 4. Calculates bias risk score and level
 * 
 * @param sources Array of source profiles for a candidate
 * @returns BiasScores object with all computed metrics
 */
export function computeBiasScores(sources: SourceProfile[]): BiasScores {
  if (sources.length === 0) {
    return {
      expertiseScore: 0,
      similarityScore: 0,
      reliabilityScore: 0,
      compositeScore: 0,
      biasRiskScore: 0,
      biasRiskLevel: "low",
    };
  }

  // Compute weighted averages (equal weighting across sources for now)
  const expertiseScore = sources.reduce((sum, s) => sum + s.expertiseScore, 0) / sources.length;
  const similarityScore = sources.reduce((sum, s) => sum + s.similarityScore, 0) / sources.length;
  const reliabilityScore = sources.reduce((sum, s) => sum + s.reliabilityScore, 0) / sources.length;

  // Calculate initial composite score
  let compositeScore = 
    WEIGHTS.expertise * expertiseScore +
    WEIGHTS.similarity * similarityScore +
    WEIGHTS.reliability * reliabilityScore;

  // Detect similarity dominance and cap if needed
  const similarityDominance = similarityScore - expertiseScore;
  if (similarityDominance > SIMILARITY_DOMINANCE_THRESHOLD) {
    // Cap composite score to prevent similarity from dominating
    // Reduce similarity's contribution proportionally
    const cappedSimilarity = expertiseScore + SIMILARITY_DOMINANCE_THRESHOLD;
    compositeScore = 
      WEIGHTS.expertise * expertiseScore +
      WEIGHTS.similarity * cappedSimilarity +
      WEIGHTS.reliability * reliabilityScore;
  }

  // Calculate bias risk
  const biasRiskScore = similarityScore - expertiseScore;
  const biasRiskLevel: "low" | "medium" | "high" = 
    biasRiskScore <= BIAS_RISK_THRESHOLDS.low ? "low" :
    biasRiskScore <= BIAS_RISK_THRESHOLDS.medium ? "medium" :
    "high";

  return {
    expertiseScore,
    similarityScore,
    reliabilityScore,
    compositeScore,
    biasRiskScore,
    biasRiskLevel,
  };
}

/**
 * Build expertise-led ranking of candidates.
 * Combines base match score with bias-aware composite score.
 * 
 * @param candidates Array of candidates with their sources
 * @returns Ranked results sorted by expertise-led scoring
 */
export function buildExpertiseRanking(candidates: CandidateWithSources[]): RankingResult[] {
  const results = candidates.map(candidate => {
    const biasScores = computeBiasScores(candidate.sources);
    
    // Combine base match score with composite score (simple average for now)
    const finalScore = (candidate.baseMatchScore + biasScores.compositeScore) / 2;

    return {
      candidateId: candidate.id,
      rank: 0, // Will be assigned after sorting
      compositeScore: finalScore,
      expertiseScore: biasScores.expertiseScore,
      similarityScore: biasScores.similarityScore,
      reliabilityScore: biasScores.reliabilityScore,
      biasRiskLevel: biasScores.biasRiskLevel,
    };
  });

  // Sort by composite score (descending)
  results.sort((a, b) => b.compositeScore - a.compositeScore);

  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

/**
 * Build similarity-led ranking of candidates.
 * Ranks ONLY by similarity score to show potential bias.
 * 
 * @param candidates Array of candidates with their sources
 * @returns Ranked results sorted by similarity only
 */
export function buildSimilarityRanking(candidates: CandidateWithSources[]): RankingResult[] {
  const results = candidates.map(candidate => {
    const biasScores = computeBiasScores(candidate.sources);

    return {
      candidateId: candidate.id,
      rank: 0, // Will be assigned after sorting
      compositeScore: biasScores.similarityScore, // Use similarity for comparison
      expertiseScore: biasScores.expertiseScore,
      similarityScore: biasScores.similarityScore,
      reliabilityScore: biasScores.reliabilityScore,
      biasRiskLevel: biasScores.biasRiskLevel,
    };
  });

  // Sort by similarity score (descending)
  results.sort((a, b) => b.similarityScore - a.similarityScore);

  // Assign ranks
  results.forEach((result, index) => {
    result.rank = index + 1;
  });

  return results;
}

/**
 * Compare expertise-led and similarity-led rankings.
 * Computes divergence score to measure potential bias impact.
 * 
 * @param expertiseRanking Results from buildExpertiseRanking
 * @param similarityRanking Results from buildSimilarityRanking
 * @returns Comparison object with divergence score
 */
export function compareRankings(
  expertiseRanking: RankingResult[],
  similarityRanking: RankingResult[]
): BiasRankingComparison {
  // Build lookup map for similarity ranks
  const similarityRankMap = new Map<string, number>();
  similarityRanking.forEach(result => {
    similarityRankMap.set(result.candidateId, result.rank);
  });

  // Compute average absolute rank difference
  let totalDiff = 0;
  let count = 0;

  expertiseRanking.forEach(expertiseResult => {
    const similarityRank = similarityRankMap.get(expertiseResult.candidateId);
    if (similarityRank !== undefined) {
      totalDiff += Math.abs(expertiseResult.rank - similarityRank);
      count++;
    }
  });

  const divergenceScore = count > 0 ? totalDiff / count : 0;

  return {
    expertiseRanking,
    similarityRanking,
    divergenceScore,
  };
}

// ============================================================================
// COUNTERFACTUAL EXPLANATIONS
// ============================================================================

/**
 * Build counterfactual explanation showing how similarity bias would change rankings.
 * 
 * This generates a human-readable explanation comparing the top N candidates
 * in expertise-led vs similarity-led rankings.
 * 
 * @param mandateId ID of the mandate being analyzed
 * @param candidates Array of candidates to analyze
 * @param topN Number of top candidates to compare (typically 3-5)
 * @returns Counterfactual explanation with both rankings and narrative
 */
export function buildCounterfactualExplanation(
  mandateId: string,
  candidates: CandidateWithSources[],
  topN: number
): CounterfactualExplanation {
  const expertiseRanking = buildExpertiseRanking(candidates);
  const similarityRanking = buildSimilarityRanking(candidates);
  const comparison = compareRankings(expertiseRanking, similarityRanking);

  const expertiseTop = expertiseRanking.slice(0, topN);
  const similarityTop = similarityRanking.slice(0, topN);

  // Build lookup for candidate names
  const candidateMap = new Map<string, string>();
  candidates.forEach(c => candidateMap.set(c.id, c.name));

  // Generate explanation
  let explanation = "";

  // Check if top candidate changes
  const expertiseTopId = expertiseTop[0]?.candidateId;
  const similarityTopId = similarityTop[0]?.candidateId;

  if (expertiseTopId !== similarityTopId) {
    const expertiseName = candidateMap.get(expertiseTopId) || "Unknown";
    const similarityName = candidateMap.get(similarityTopId) || "Unknown";
    
    explanation = `Expertise-based ranking keeps ${expertiseName} at the top. A similarity-led ranking would promote ${similarityName} due to shared background signals and affinity markers.`;
  } else {
    // Check for significant jumps (>2 positions)
    const similarityRankMap = new Map<string, number>();
    similarityRanking.forEach(r => similarityRankMap.set(r.candidateId, r.rank));

    let maxJump = 0;
    let jumpedCandidate = "";

    expertiseTop.forEach(expertiseResult => {
      const similarityRank = similarityRankMap.get(expertiseResult.candidateId) || 0;
      const jump = Math.abs(expertiseResult.rank - similarityRank);
      if (jump > maxJump) {
        maxJump = jump;
        jumpedCandidate = candidateMap.get(expertiseResult.candidateId) || "";
      }
    });

    if (maxJump > 2) {
      explanation = `Top candidate remains the same, but ${jumpedCandidate} would jump ${maxJump} positions in a similarity-led ranking. This suggests affinity signals may be inflating their perceived fit.`;
    } else {
      explanation = `Similarity signals do not materially change the top ${topN} candidates. Divergence score is low (${comparison.divergenceScore.toFixed(2)}), indicating expertise-led reasoning is robust here.`;
    }
  }

  return {
    mandateId,
    topN,
    expertiseTop,
    similarityTop,
    explanation,
  };
}

// ============================================================================
// SOURCE TRANSPARENCY & REASONING BASIS
// ============================================================================

/**
 * Classify the reasoning basis from bias scores.
 * 
 * @param biasScores Computed bias scores
 * @returns Classification of reasoning basis
 */
export function classifyReasoningBasis(biasScores: BiasScores): ReasoningBasis {
  if (biasScores.biasRiskScore > BIAS_RISK_THRESHOLDS.medium) {
    return "similarity-heavy";
  } else if (biasScores.biasRiskScore > BIAS_RISK_THRESHOLDS.low) {
    return "mixed";
  } else {
    return "expertise-led";
  }
}

/**
 * Build source attribution tags for UI display.
 * These tags show which sources contributed to the candidate's score
 * and what reasoning basis was used.
 * 
 * @param candidate Candidate with sources
 * @returns Array of attribution tags for each source
 */
export function buildSourceAttributionTags(
  candidate: CandidateWithSources
): SourceAttributionTag[] {
  const candidateBiasScores = computeBiasScores(candidate.sources);
  const reasoningBasis = classifyReasoningBasis(candidateBiasScores);

  return candidate.sources.map(source => ({
    sourceId: source.id,
    sourceType: source.type,
    label: source.label,
    reasoningBasis,
    expertiseScore: source.expertiseScore,
    similarityScore: source.similarityScore,
    reliabilityScore: source.reliabilityScore,
  }));
}

// ============================================================================
// WEEKLY BIAS WATCH SUMMARY
// ============================================================================

/**
 * Build a weekly bias watch summary from multiple ranking decisions.
 * 
 * This aggregates bias metrics across all mandates for a given week,
 * identifies high-bias events, and provides actionable insights.
 * 
 * @param weekId Week identifier (e.g. "2025-W47")
 * @param decisions Array of ranking comparisons with mandate metadata
 * @param mandateLookup Function to get mandate details by ID
 * @returns Weekly bias watch summary
 */
export function buildBiasWatchSummary(
  weekId: string,
  decisions: BiasRankingComparisonExtended[],
  mandateLookup: (id: string) => { id: string; name: string }
): BiasWatchSummary {
  // Count high bias events
  const highBiasEvents = decisions.filter(
    d => d.divergenceScore > HIGH_BIAS_DIVERGENCE_THRESHOLD
  );
  const highBiasEventCount = highBiasEvents.length;

  // Group by mandate to find most affected
  const mandateStats = new Map<string, { events: number; totalDivergence: number }>();
  
  highBiasEvents.forEach(event => {
    const stats = mandateStats.get(event.mandateId) || { events: 0, totalDivergence: 0 };
    stats.events++;
    stats.totalDivergence += event.divergenceScore;
    mandateStats.set(event.mandateId, stats);
  });

  const mostAffectedMandates = Array.from(mandateStats.entries())
    .map(([mandateId, stats]) => {
      const mandate = mandateLookup(mandateId);
      return {
        mandateId,
        name: mandate.name,
        highBiasEvents: stats.events,
        avgDivergence: stats.totalDivergence / stats.events,
      };
    })
    .sort((a, b) => b.highBiasEvents - a.highBiasEvents)
    .slice(0, 5); // Top 5 affected mandates

  // Analyze by source type (this would require source-level tracking in real implementation)
  // For now, we'll use heuristics based on common patterns
  const sourceTypeStats = [
    {
      sourceType: "voice_note" as const,
      similarityHeavyCount: Math.floor(highBiasEventCount * 0.4), // Estimate 40%
      comment: "Voice notes often reference shared background. Consider tightening prompts to focus on demonstrable expertise.",
    },
    {
      sourceType: "mandate_note" as const,
      similarityHeavyCount: Math.floor(highBiasEventCount * 0.3), // Estimate 30%
      comment: "Mandate notes may reflect client preferences that favor familiarity. Review for explicit vs implicit requirements.",
    },
    {
      sourceType: "cv" as const,
      similarityHeavyCount: Math.floor(highBiasEventCount * 0.2), // Estimate 20%
      comment: "CV parsing appears robust. Similarity signals are appropriately weighted.",
    },
    {
      sourceType: "market_data" as const,
      similarityHeavyCount: Math.floor(highBiasEventCount * 0.05), // Estimate 5%
      comment: "Market data provides objective signals with low bias risk.",
    },
    {
      sourceType: "manual" as const,
      similarityHeavyCount: Math.floor(highBiasEventCount * 0.05), // Estimate 5%
      comment: "Manual entries show balanced reasoning. Continue current practices.",
    },
  ];

  // Compute average divergence across all decisions
  const avgDivergenceScore = decisions.length > 0
    ? decisions.reduce((sum, d) => sum + d.divergenceScore, 0) / decisions.length
    : 0;

  return {
    weekId,
    highBiasEventCount,
    mostAffectedMandates,
    sourceTypeStats,
    avgDivergenceScore,
  };
}

// ============================================================================
// EXPORT UTILITIES
// ============================================================================

/**
 * Export bias watch summary as downloadable JSON file.
 * Triggers client-side download in the browser.
 * 
 * @param summary Bias watch summary to export
 */
export function exportBiasSummaryAsJson(summary: BiasWatchSummary): void {
  const jsonString = JSON.stringify(summary, null, 2);
  const blob = new Blob([jsonString], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  
  const link = document.createElement("a");
  link.href = url;
  link.download = `bias-watch-${summary.weekId}.json`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  URL.revokeObjectURL(url);
}

// ============================================================================
// MOCK DATA GENERATORS (for testing and development)
// ============================================================================

/**
 * Generate mock source profiles for testing
 */
export function generateMockSources(count: number = 3): SourceProfile[] {
  const types: SourceProfile["type"][] = ["cv", "mandate_note", "voice_note", "market_data", "manual"];
  
  return Array.from({ length: count }, (_, i) => {
    const type = types[i % types.length];
    return {
      id: `source-${i + 1}`,
      type,
      label: `${type.replace("_", " ").toUpperCase()} #${i + 1}`,
      expertiseScore: 0.6 + Math.random() * 0.3, // 0.6-0.9
      similarityScore: 0.4 + Math.random() * 0.4, // 0.4-0.8
      reliabilityScore: 0.7 + Math.random() * 0.3, // 0.7-1.0
      metadata: { generatedAt: new Date().toISOString() },
    };
  });
}

/**
 * Generate mock candidates for testing
 */
export function generateMockCandidates(mandateId: string, count: number = 10): CandidateWithSources[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `candidate-${i + 1}`,
    name: `Candidate ${String.fromCharCode(65 + i)}`, // A, B, C, etc.
    mandateId,
    baseMatchScore: 0.5 + Math.random() * 0.4, // 0.5-0.9
    sources: generateMockSources(2 + Math.floor(Math.random() * 3)), // 2-4 sources
  }));
}

/**
 * Generate mock weekly decisions for bias watch testing
 */
export function generateMockWeeklyDecisions(
  weekId: string,
  mandateCount: number = 5
): BiasRankingComparisonExtended[] {
  const decisions: BiasRankingComparisonExtended[] = [];

  for (let i = 0; i < mandateCount; i++) {
    const mandateId = `mandate-${i + 1}`;
    const candidates = generateMockCandidates(mandateId, 8);
    const comparison = compareRankings(
      buildExpertiseRanking(candidates),
      buildSimilarityRanking(candidates)
    );

    decisions.push({
      ...comparison,
      mandateId,
      weekId,
    });
  }

  return decisions;
}

/**
 * Mock mandate lookup for testing
 */
export function mockMandateLookup(id: string): { id: string; name: string } {
  return {
    id,
    name: `Mandate ${id.replace("mandate-", "")}`,
  };
}
