/**
 * Bias-Aware Scoring Flow
 * 
 * Pure TypeScript implementation of three-score bias-aware candidate ranking.
 * This module provides the foundation for bias detection and transparent reasoning.
 * 
 * Core Scores:
 * - expertiseScore: Overlap between source domain tags and mandate/candidate requirements
 * - similarityScore: Non-expert signals like shared firms, backgrounds, personal connections
 * - sourceReliabilityScore: Historical accuracy of the source based on past decisions
 * 
 * NO REACT. NO DB ACCESS. Pure logic only.
 */

// ============================================================================
// CONFIGURATION CONSTANTS
// ============================================================================

/**
 * Weight applied to expertise when computing composite score.
 * This is the dominant factor in our ranking system.
 */
export const EXPERTISE_MATCH_WEIGHT = 0.4;

/**
 * Weight applied to similarity when computing composite score.
 * Intentionally lower to prevent affinity bias from dominating.
 */
export const SIMILARITY_MATCH_WEIGHT = 0.1;

/**
 * Weight applied to source reliability when computing composite score.
 */
export const RELIABILITY_WEIGHT = 0.1;

/**
 * Weight applied to base match score (existing fit score from the app).
 */
export const BASE_MATCH_WEIGHT = 0.4;

/**
 * Maximum amount by which similarity can exceed expertise before capping.
 * If similarity > expertise + this threshold, we cap similarity.
 */
export const SIMILARITY_DOMINANCE_THRESHOLD = 0.15;

/**
 * Minimum number of observations before we trust source reliability score.
 * Below this, we shrink towards neutral (0.5).
 */
export const RELIABILITY_MIN_OBSERVATIONS = 5;

/**
 * Default reliability score when no history exists.
 */
export const DEFAULT_RELIABILITY = 0.5;

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Raw signal from a source about a candidate.
 * This is what we receive from various data sources (CV, notes, market intel, etc.)
 */
export interface SourceSignal {
  id: string;
  type: "cv" | "mandate_note" | "voice_note" | "market_data" | "manual";
  label: string;
  
  /** Domain expertise tags: sector, function, asset class, skills, certifications */
  domainTags: string[];
  
  /** Affinity/similarity tags: shared firms, teams, schools, backgrounds */
  similarityTags: string[];
  
  /** Historical accuracy data for reliability scoring */
  accuracyHistory: {
    totalUses: number;
    correctUses: number;
  };
  
  /** Optional manual weight from admin settings (e.g., trust CV more than voice notes) */
  weight?: number;
}

/**
 * The three core scores for a source
 */
export interface SourceScores {
  expertiseScore: number;        // 0-1: How well source demonstrates domain expertise
  similarityScore: number;       // 0-1: How much source reflects affinity/familiarity
  sourceReliabilityScore: number; // 0-1: How trustworthy this source has been historically
}

/**
 * Processed source with computed scores
 */
export interface SourceProfile {
  id: string;
  type: SourceSignal["type"];
  label: string;
  scores: SourceScores;
}

/**
 * Full context for scoring a candidate against a mandate
 */
export interface CandidateContext {
  id: string;
  name: string;
  mandateId: string;
  
  /** Tags from the mandate: sectors, functions, geographies, required skills */
  mandateTags: string[];
  
  /** Tags from candidate's CV: skills, sectors, firms, experience areas */
  candidateTags: string[];
  
  /** Existing fit score from the app's matching engine (0-1) */
  baseMatchScore: number;
  
  /** All sources contributing to this candidate's assessment */
  sources: SourceSignal[];
}

/**
 * Summary of all scores for a candidate
 */
export interface CandidateScoreSummary {
  candidateId: string;
  name: string;
  mandateId: string;
  baseMatchScore: number;
  avgExpertiseScore: number;
  avgSimilarityScore: number;
  avgReliabilityScore: number;
  compositeScore: number;  // Final ranking score
}

// ============================================================================
// CORE SCORING HELPERS
// ============================================================================

/**
 * Compute expertise score for a source.
 * 
 * This measures how much the source demonstrates actual domain expertise
 * relevant to the mandate. We compare domain tags from the source with
 * tags from both the mandate (what's required) and the candidate (what they have).
 * 
 * Algorithm:
 * 1. Find overlap between source.domainTags and mandate/candidate tags
 * 2. Score = proportion of matching tags
 * 3. Apply optional manual weight if present
 * 4. Clamp result to [0, 1]
 * 
 * @param signal The source signal to score
 * @param context The candidate and mandate context
 * @returns Expertise score between 0 and 1
 */
export function computeExpertiseScore(
  signal: SourceSignal,
  context: CandidateContext
): number {
  if (signal.domainTags.length === 0) {
    return 0;
  }

  // Combine mandate and candidate tags (what's needed + what they have)
  const allRelevantTags = new Set([
    ...context.mandateTags,
    ...context.candidateTags,
  ]);

  // Count how many domain tags from source match relevant tags
  let matchCount = 0;
  for (const tag of signal.domainTags) {
    if (allRelevantTags.has(tag.toLowerCase())) {
      matchCount++;
    }
  }

  // Base score is proportion of matching tags
  let score = matchCount / signal.domainTags.length;

  // Apply optional manual weight (e.g., CV might be weighted higher than voice notes)
  if (signal.weight !== undefined && signal.weight > 0) {
    score = score * signal.weight;
  }

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute similarity score for a source.
 * 
 * This measures affinity/familiarity signals that don't necessarily indicate
 * expertise. Examples: went to same school, worked at same firm, knows same people.
 * 
 * These signals can be useful but we must prevent them from dominating the
 * decision (that's handled in the composite score calculation).
 * 
 * Algorithm:
 * 1. Find overlap between source.similarityTags and candidate tags
 * 2. Score = proportion of matching similarity tags
 * 3. Normalize to [0, 1]
 * 
 * @param signal The source signal to score
 * @param context The candidate context
 * @returns Similarity score between 0 and 1
 */
export function computeSimilarityScore(
  signal: SourceSignal,
  context: CandidateContext
): number {
  if (signal.similarityTags.length === 0) {
    return 0;
  }

  // Compare similarity tags with candidate's background
  const candidateTagsSet = new Set(
    context.candidateTags.map(tag => tag.toLowerCase())
  );

  let matchCount = 0;
  for (const tag of signal.similarityTags) {
    if (candidateTagsSet.has(tag.toLowerCase())) {
      matchCount++;
    }
  }

  // Score is proportion of similarity tags that match
  const score = matchCount / signal.similarityTags.length;

  // Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}

/**
 * Compute reliability score for a source.
 * 
 * This measures how trustworthy the source has been historically based on
 * whether decisions influenced by this source turned out well.
 * 
 * Algorithm:
 * 1. If no history exists, return default (0.5 = neutral)
 * 2. Otherwise, score = correctUses / totalUses
 * 3. If totalUses is low, shrink towards 0.5 (conservative estimate)
 * 
 * @param signal The source signal with accuracy history
 * @returns Reliability score between 0 and 1
 */
export function computeReliabilityScore(signal: SourceSignal): number {
  const { totalUses, correctUses } = signal.accuracyHistory;

  // No history? Return neutral score
  if (totalUses === 0) {
    return DEFAULT_RELIABILITY;
  }

  // Raw score from history
  const rawScore = correctUses / totalUses;

  // If we have few observations, shrink towards neutral (Bayesian shrinkage)
  if (totalUses < RELIABILITY_MIN_OBSERVATIONS) {
    const shrinkageFactor = totalUses / RELIABILITY_MIN_OBSERVATIONS;
    return DEFAULT_RELIABILITY + (rawScore - DEFAULT_RELIABILITY) * shrinkageFactor;
  }

  return rawScore;
}

// ============================================================================
// SOURCE PROFILE BUILDING
// ============================================================================

/**
 * Build a complete source profile with all three scores.
 * 
 * Takes a raw signal and candidate context, computes expertise, similarity,
 * and reliability scores, and packages everything into a SourceProfile.
 * 
 * @param signal The raw source signal
 * @param context The candidate and mandate context
 * @returns Complete source profile with computed scores
 */
export function buildSourceProfile(
  signal: SourceSignal,
  context: CandidateContext
): SourceProfile {
  const scores: SourceScores = {
    expertiseScore: computeExpertiseScore(signal, context),
    similarityScore: computeSimilarityScore(signal, context),
    sourceReliabilityScore: computeReliabilityScore(signal),
  };

  return {
    id: signal.id,
    type: signal.type,
    label: signal.label,
    scores,
  };
}

/**
 * Build source profiles for all signals associated with a candidate.
 * 
 * Convenience function that maps over all signals and builds profiles.
 * 
 * @param signals Array of source signals
 * @param context The candidate and mandate context
 * @returns Array of source profiles with computed scores
 */
export function buildSourceProfiles(
  signals: SourceSignal[],
  context: CandidateContext
): SourceProfile[] {
  return signals.map(signal => buildSourceProfile(signal, context));
}

// ============================================================================
// CANDIDATE-LEVEL AGGREGATION
// ============================================================================

/**
 * Summarize all scores for a candidate into a single ranking score.
 * 
 * This is the heart of the bias-aware scoring system. It:
 * 1. Computes scores for all sources
 * 2. Averages the three scores across sources
 * 3. Detects and prevents similarity dominance
 * 4. Computes final composite score using configured weights
 * 
 * Algorithm:
 * - Average expertise, similarity, and reliability across all sources
 * - Check if similarity dominates expertise (similarity > expertise + threshold)
 * - If so, cap similarity to prevent bias
 * - Compute composite = weighted sum of:
 *     * baseMatchScore (existing fit score)
 *     * avgExpertiseScore (demonstrable skills)
 *     * avgSimilarityScore (capped affinity signals)
 *     * avgReliabilityScore (source trustworthiness)
 * 
 * @param context Full candidate context with all sources
 * @returns Complete score summary for ranking
 */
export function summariseCandidateScores(
  context: CandidateContext
): CandidateScoreSummary {
  // Build profiles for all sources
  const profiles = buildSourceProfiles(context.sources, context);

  // If no sources, return minimal scores
  if (profiles.length === 0) {
    return {
      candidateId: context.id,
      name: context.name,
      mandateId: context.mandateId,
      baseMatchScore: context.baseMatchScore,
      avgExpertiseScore: 0,
      avgSimilarityScore: 0,
      avgReliabilityScore: DEFAULT_RELIABILITY,
      compositeScore: context.baseMatchScore * BASE_MATCH_WEIGHT,
    };
  }

  // Compute averages across all sources
  let sumExpertise = 0;
  let sumSimilarity = 0;
  let sumReliability = 0;

  for (const profile of profiles) {
    sumExpertise += profile.scores.expertiseScore;
    sumSimilarity += profile.scores.similarityScore;
    sumReliability += profile.scores.sourceReliabilityScore;
  }

  const avgExpertiseScore = sumExpertise / profiles.length;
  let avgSimilarityScore = sumSimilarity / profiles.length;
  const avgReliabilityScore = sumReliability / profiles.length;

  // CRITICAL: Prevent similarity from dominating expertise
  // If similarity exceeds expertise by too much, cap it
  const similarityDominance = avgSimilarityScore - avgExpertiseScore;
  if (similarityDominance > SIMILARITY_DOMINANCE_THRESHOLD) {
    avgSimilarityScore = avgExpertiseScore + SIMILARITY_DOMINANCE_THRESHOLD;
  }

  // Compute final composite score using configured weights
  // This is what we'll rank candidates by
  const compositeScore =
    BASE_MATCH_WEIGHT * context.baseMatchScore +
    EXPERTISE_MATCH_WEIGHT * avgExpertiseScore +
    SIMILARITY_MATCH_WEIGHT * avgSimilarityScore +
    RELIABILITY_WEIGHT * avgReliabilityScore;

  return {
    candidateId: context.id,
    name: context.name,
    mandateId: context.mandateId,
    baseMatchScore: context.baseMatchScore,
    avgExpertiseScore,
    avgSimilarityScore,
    avgReliabilityScore,
    compositeScore,
  };
}

// ============================================================================
// RANKING FUNCTIONS
// ============================================================================

/**
 * Rank candidates by composite score (expertise-led).
 * 
 * This is the PRIMARY ranking function that should be used in the UI.
 * It respects the bias-aware scoring with expertise as the dominant factor
 * and similarity properly capped.
 * 
 * @param candidates Array of candidates to rank
 * @returns Candidates sorted by composite score (descending)
 */
export function rankCandidatesByComposite(
  candidates: CandidateContext[]
): CandidateScoreSummary[] {
  const summaries = candidates.map(summariseCandidateScores);
  
  // Sort by composite score descending (highest first)
  summaries.sort((a, b) => b.compositeScore - a.compositeScore);
  
  return summaries;
}

/**
 * Rank candidates by similarity only (for bias analysis).
 * 
 * This is NOT shown to users directly. It's used internally to detect
 * how much similarity bias could affect decisions. By comparing this
 * ranking to the expertise-led ranking, we can measure bias risk.
 * 
 * @param candidates Array of candidates to rank
 * @returns Candidates sorted by similarity score only (descending)
 */
export function rankCandidatesBySimilarityOnly(
  candidates: CandidateContext[]
): CandidateScoreSummary[] {
  const summaries = candidates.map(summariseCandidateScores);
  
  // Sort by similarity score descending (highest first)
  summaries.sort((a, b) => b.avgSimilarityScore - a.avgSimilarityScore);
  
  return summaries;
}

// ============================================================================
// UI INTEGRATION HELPERS
// ============================================================================

/**
 * Get both expertise-led and similarity-led rankings for a mandate.
 * 
 * This is the main function UI components should call to get candidate
 * rankings. It returns both the recommended (expertise-led) ranking and
 * the counterfactual (similarity-led) ranking for bias analysis.
 * 
 * Usage in UI:
 * ```typescript
 * const { expertiseLed, similarityLed } = getCandidateRankingForMandate(
 *   mandateId,
 *   candidates
 * );
 * 
 * // Show expertiseLed to user
 * // Compare with similarityLed to detect bias
 * ```
 * 
 * @param mandateId The mandate ID to filter by
 * @param candidates All candidate contexts
 * @returns Both rankings for comparison
 */
export function getCandidateRankingForMandate(
  mandateId: string,
  candidates: CandidateContext[]
): {
  expertiseLed: CandidateScoreSummary[];
  similarityLed: CandidateScoreSummary[];
} {
  // Filter candidates for this mandate
  const mandateCandidates = candidates.filter(c => c.mandateId === mandateId);

  return {
    expertiseLed: rankCandidatesByComposite(mandateCandidates),
    similarityLed: rankCandidatesBySimilarityOnly(mandateCandidates),
  };
}

/**
 * Get detailed score breakdown for a single candidate.
 * 
 * This is useful for showing tooltips, detail panels, or audit trails
 * explaining why a candidate scored the way they did.
 * 
 * Usage in UI:
 * ```typescript
 * const { profiles, summary } = getScoreBreakdownForCandidate(candidate);
 * 
 * // Show summary.compositeScore as final score
 * // Show profiles in tooltip/popover to explain which sources contributed
 * ```
 * 
 * @param candidate The candidate context
 * @returns Source profiles and summary scores
 */
export function getScoreBreakdownForCandidate(
  candidate: CandidateContext
): {
  profiles: SourceProfile[];
  summary: CandidateScoreSummary;
} {
  const profiles = buildSourceProfiles(candidate.sources, candidate);
  const summary = summariseCandidateScores(candidate);

  return { profiles, summary };
}

// ============================================================================
// MOCK DATA GENERATORS (for testing and development)
// ============================================================================

/**
 * Generate mock source signal for testing.
 */
export function generateMockSourceSignal(
  type: SourceSignal["type"],
  expertiseTags: string[] = [],
  similarityTags: string[] = [],
  accuracy: { correct: number; total: number } = { correct: 0, total: 0 }
): SourceSignal {
  return {
    id: `source-${type}-${Date.now()}-${Math.random()}`,
    type,
    label: `${type.toUpperCase()} Source`,
    domainTags: expertiseTags,
    similarityTags,
    accuracyHistory: {
      totalUses: accuracy.total,
      correctUses: accuracy.correct,
    },
  };
}

/**
 * Generate mock candidate context for testing.
 */
export function generateMockCandidateContext(
  mandateId: string,
  name: string,
  mandateTags: string[],
  candidateTags: string[],
  baseMatchScore: number,
  sources: SourceSignal[]
): CandidateContext {
  return {
    id: `candidate-${Date.now()}-${Math.random()}`,
    name,
    mandateId,
    mandateTags,
    candidateTags,
    baseMatchScore,
    sources,
  };
}

/**
 * Generate a batch of test candidates with varying expertise and similarity.
 */
export function generateTestCandidates(mandateId: string, count: number = 10): CandidateContext[] {
  const mandateTags = ["private-equity", "infrastructure", "london", "senior"];
  const candidates: CandidateContext[] = [];

  for (let i = 0; i < count; i++) {
    const name = `Test Candidate ${String.fromCharCode(65 + i)}`;
    
    // Vary the expertise-similarity balance
    const expertiseRatio = 0.3 + Math.random() * 0.6; // 0.3 to 0.9
    const similarityRatio = 0.2 + Math.random() * 0.6; // 0.2 to 0.8
    
    const candidateTags = [
      ...mandateTags.slice(0, Math.floor(mandateTags.length * expertiseRatio)),
      "goldman-sachs", // Similarity tag
      "harvard", // Similarity tag
    ];

    const sources: SourceSignal[] = [
      generateMockSourceSignal(
        "cv",
        mandateTags.slice(0, Math.floor(mandateTags.length * expertiseRatio)),
        ["goldman-sachs"],
        { correct: 8, total: 10 }
      ),
      generateMockSourceSignal(
        "voice_note",
        mandateTags.slice(0, 1),
        ["goldman-sachs", "harvard", "london-finance-club"],
        { correct: 3, total: 5 }
      ),
    ];

    if (Math.random() > 0.5) {
      sources.push(
        generateMockSourceSignal(
          "market_data",
          mandateTags.slice(0, 2),
          [],
          { correct: 15, total: 20 }
        )
      );
    }

    candidates.push(
      generateMockCandidateContext(
        mandateId,
        name,
        mandateTags,
        candidateTags,
        0.5 + Math.random() * 0.4, // Base score 0.5 to 0.9
        sources
      )
    );
  }

  return candidates;
}
