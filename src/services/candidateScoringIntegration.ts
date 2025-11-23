/**
 * Candidate Scoring Integration Service
 * 
 * Bridges the bias-aware scoring flow with real candidate data from the database.
 * This service:
 * - Converts candidate/CV data into SourceSignals
 * - Extracts domain tags and similarity tags from structured data
 * - Fetches source accuracy history from logs
 * - Provides a clean interface for UI components to get scored rankings
 * 
 * NO DIRECT DB CALLS. Uses existing API layer.
 */

import {
  type SourceSignal,
  type CandidateContext,
  type CandidateScoreSummary,
  getCandidateRankingForMandate,
  getScoreBreakdownForCandidate,
  rankCandidatesByComposite,
} from "./biasAwareScoringFlow";

// ============================================================================
// TYPE DEFINITIONS FOR EXISTING DATA STRUCTURES
// ============================================================================

/**
 * Candidate data as it comes from the database
 */
export interface CandidateData {
  id: number;
  name: string;
  email?: string;
  phone?: string;
  current_title?: string;
  current_firm?: string;
  location?: string;
  sectors?: string[];
  functions?: string[];
  asset_classes?: string[];
  geographies?: string[];
  seniority?: string;
  experience?: Array<{
    firm: string;
    title: string;
    start_date?: string;
    end_date?: string;
  }>;
  education?: Array<{
    institution: string;
    degree?: string;
    field?: string;
    year?: string;
  }>;
  raw_text?: string;
}

/**
 * Mandate data from database
 */
export interface MandateData {
  id: number;
  title: string;
  firm_id?: number;
  firm_name?: string;
  sectors?: string[];
  functions?: string[];
  asset_classes?: string[];
  geographies?: string[];
  seniority?: string;
  required_skills?: string[];
}

/**
 * Match score data from database
 */
export interface MatchScoreData {
  candidate_id: number;
  mandate_id: number;
  final_score: number;
  sector_score?: number;
  function_score?: number;
  asset_class_score?: number;
  geography_score?: number;
  seniority_score?: number;
}

/**
 * Source accuracy log entry
 */
export interface SourceAccuracyLog {
  source_id: string;
  source_type: string;
  outcome: boolean;
  logged_at: string;
}

// ============================================================================
// TAG EXTRACTION UTILITIES
// ============================================================================

/**
 * Extract domain tags from candidate data.
 * These represent demonstrable expertise: sectors, functions, skills, etc.
 */
export function extractCandidateDomainTags(candidate: CandidateData): string[] {
  const tags: string[] = [];

  // Add sectors, functions, asset classes
  if (candidate.sectors) tags.push(...candidate.sectors.map(s => s.toLowerCase()));
  if (candidate.functions) tags.push(...candidate.functions.map(f => f.toLowerCase()));
  if (candidate.asset_classes) tags.push(...candidate.asset_classes.map(a => a.toLowerCase()));
  if (candidate.geographies) tags.push(...candidate.geographies.map(g => g.toLowerCase()));
  
  // Add seniority level
  if (candidate.seniority) tags.push(candidate.seniority.toLowerCase());

  // Add current title/firm as skills
  if (candidate.current_title) {
    tags.push(...candidate.current_title.toLowerCase().split(/\s+/).filter(w => w.length > 3));
  }

  // Remove duplicates
  return [...new Set(tags)];
}

/**
 * Extract similarity tags from candidate data.
 * These represent affinity signals: past firms, schools, networks, etc.
 */
export function extractCandidateSimilarityTags(candidate: CandidateData): string[] {
  const tags: string[] = [];

  // Add current firm
  if (candidate.current_firm) {
    tags.push(candidate.current_firm.toLowerCase().replace(/\s+/g, '-'));
  }

  // Add past firms from experience
  if (candidate.experience) {
    candidate.experience.forEach(exp => {
      if (exp.firm) {
        tags.push(exp.firm.toLowerCase().replace(/\s+/g, '-'));
      }
    });
  }

  // Add educational institutions
  if (candidate.education) {
    candidate.education.forEach(edu => {
      if (edu.institution) {
        tags.push(edu.institution.toLowerCase().replace(/\s+/g, '-'));
      }
    });
  }

  // Add location as a similarity signal (people prefer local hires)
  if (candidate.location) {
    tags.push(candidate.location.toLowerCase().replace(/\s+/g, '-'));
  }

  // Remove duplicates
  return [...new Set(tags)];
}

/**
 * Extract mandate requirement tags.
 */
export function extractMandateTags(mandate: MandateData): string[] {
  const tags: string[] = [];

  if (mandate.sectors) tags.push(...mandate.sectors.map(s => s.toLowerCase()));
  if (mandate.functions) tags.push(...mandate.functions.map(f => f.toLowerCase()));
  if (mandate.asset_classes) tags.push(...mandate.asset_classes.map(a => a.toLowerCase()));
  if (mandate.geographies) tags.push(...mandate.geographies.map(g => g.toLowerCase()));
  if (mandate.seniority) tags.push(mandate.seniority.toLowerCase());
  if (mandate.required_skills) tags.push(...mandate.required_skills.map(s => s.toLowerCase()));

  return [...new Set(tags)];
}

// ============================================================================
// SOURCE SIGNAL BUILDERS
// ============================================================================

/**
 * Build a CV source signal from candidate data.
 * CVs are high expertise, low similarity, high reliability sources.
 */
export function buildCvSourceSignal(
  candidate: CandidateData,
  accuracyHistory?: { totalUses: number; correctUses: number }
): SourceSignal {
  return {
    id: `cv-${candidate.id}`,
    type: "cv",
    label: `CV - ${candidate.name}`,
    domainTags: extractCandidateDomainTags(candidate),
    similarityTags: [], // CVs shouldn't contribute to similarity bias
    accuracyHistory: accuracyHistory || { totalUses: 0, correctUses: 0 },
    weight: 1.2, // Trust CV data more than other sources
  };
}

/**
 * Build a voice note source signal.
 * Voice notes often contain both expertise and similarity signals.
 * 
 * In a real implementation, this would parse the voice note transcript
 * and extract mentions of skills (expertise) and connections (similarity).
 */
export function buildVoiceNoteSourceSignal(
  voiceNoteId: string,
  candidateId: number,
  extractedDomainTags: string[],
  extractedSimilarityTags: string[],
  accuracyHistory?: { totalUses: number; correctUses: number }
): SourceSignal {
  return {
    id: `voice-${voiceNoteId}`,
    type: "voice_note",
    label: `Voice Note #${voiceNoteId.slice(-6)}`,
    domainTags: extractedDomainTags,
    similarityTags: extractedSimilarityTags,
    accuracyHistory: accuracyHistory || { totalUses: 0, correctUses: 0 },
    weight: 0.8, // Voice notes are less structured, lower weight
  };
}

/**
 * Build a mandate note source signal.
 * These capture client preferences and requirements.
 */
export function buildMandateNoteSourceSignal(
  noteId: string,
  mandateId: number,
  extractedTags: string[],
  accuracyHistory?: { totalUses: number; correctUses: number }
): SourceSignal {
  return {
    id: `mandate-note-${noteId}`,
    type: "mandate_note",
    label: `Mandate Note #${noteId.slice(-6)}`,
    domainTags: extractedTags,
    similarityTags: [], // Mandate notes should be about requirements, not similarity
    accuracyHistory: accuracyHistory || { totalUses: 0, correctUses: 0 },
    weight: 1.0,
  };
}

/**
 * Build a market data source signal.
 * These are objective signals from market research, databases, etc.
 */
export function buildMarketDataSourceSignal(
  dataId: string,
  candidateId: number,
  marketTags: string[],
  accuracyHistory?: { totalUses: number; correctUses: number }
): SourceSignal {
  return {
    id: `market-${dataId}`,
    type: "market_data",
    label: `Market Data #${dataId.slice(-6)}`,
    domainTags: marketTags,
    similarityTags: [], // Market data is objective
    accuracyHistory: accuracyHistory || { totalUses: 0, correctUses: 0 },
    weight: 1.3, // Trust objective data more
  };
}

/**
 * Build a manual entry source signal.
 * These are notes added by recruiters.
 */
export function buildManualSourceSignal(
  entryId: string,
  userId: number,
  domainTags: string[],
  similarityTags: string[],
  accuracyHistory?: { totalUses: number; correctUses: number }
): SourceSignal {
  return {
    id: `manual-${entryId}`,
    type: "manual",
    label: `Manual Entry #${entryId.slice(-6)}`,
    domainTags,
    similarityTags,
    accuracyHistory: accuracyHistory || { totalUses: 0, correctUses: 0 },
    weight: 1.0,
  };
}

// ============================================================================
// CANDIDATE CONTEXT BUILDER
// ============================================================================

/**
 * Build complete candidate context for scoring.
 * This aggregates all sources for a candidate-mandate pair.
 * 
 * @param candidate Candidate data from DB
 * @param mandate Mandate data from DB
 * @param matchScore Existing match score from DB
 * @param additionalSources Optional voice notes, manual entries, etc.
 * @returns Complete CandidateContext ready for scoring
 */
export function buildCandidateContext(
  candidate: CandidateData,
  mandate: MandateData,
  matchScore: MatchScoreData,
  additionalSources: SourceSignal[] = []
): CandidateContext {
  // Build CV source (always present)
  const cvSource = buildCvSourceSignal(candidate);

  // Combine all sources
  const allSources = [cvSource, ...additionalSources];

  return {
    id: candidate.id.toString(),
    name: candidate.name,
    mandateId: mandate.id.toString(),
    mandateTags: extractMandateTags(mandate),
    candidateTags: [
      ...extractCandidateDomainTags(candidate),
      ...extractCandidateSimilarityTags(candidate),
    ],
    baseMatchScore: matchScore.final_score,
    sources: allSources,
  };
}

// ============================================================================
// HIGH-LEVEL API FOR UI COMPONENTS
// ============================================================================

/**
 * Get scored candidates for a mandate.
 * This is the main function UI components should call.
 * 
 * @param mandateId Mandate ID
 * @param candidates Array of candidate data from DB
 * @param mandate Mandate data from DB
 * @param matchScores Map of candidate_id -> MatchScoreData
 * @returns Expertise-led and similarity-led rankings
 */
export async function getScoredCandidatesForMandate(
  mandateId: string,
  candidates: CandidateData[],
  mandate: MandateData,
  matchScores: Map<number, MatchScoreData>
): Promise<{
  expertiseLed: CandidateScoreSummary[];
  similarityLed: CandidateScoreSummary[];
  biasRisk: "low" | "medium" | "high";
  avgDivergence: number;
}> {
  // Build contexts for all candidates
  const contexts: CandidateContext[] = candidates
    .filter(c => matchScores.has(c.id))
    .map(candidate => {
      const matchScore = matchScores.get(candidate.id)!;
      
      // TODO: In real implementation, fetch additional sources:
      // - Voice notes about this candidate
      // - Manual entries by recruiters
      // - Market data mentions
      const additionalSources: SourceSignal[] = [];
      
      return buildCandidateContext(candidate, mandate, matchScore, additionalSources);
    });

  // Get rankings
  const { expertiseLed, similarityLed } = getCandidateRankingForMandate(
    mandateId,
    contexts
  );

  // Calculate bias risk
  const expertiseMap = new Map(expertiseLed.map((c, idx) => [c.candidateId, idx]));
  const similarityMap = new Map(similarityLed.map((c, idx) => [c.candidateId, idx]));
  
  let totalDiff = 0;
  let count = 0;
  
  expertiseLed.forEach(c => {
    const expertiseRank = expertiseMap.get(c.candidateId) || 0;
    const similarityRank = similarityMap.get(c.candidateId) || 0;
    totalDiff += Math.abs(expertiseRank - similarityRank);
    count++;
  });
  
  const avgDivergence = count > 0 ? totalDiff / count : 0;
  const biasRisk: "low" | "medium" | "high" = 
    avgDivergence < 1.5 ? "low" :
    avgDivergence < 3.0 ? "medium" :
    "high";

  return {
    expertiseLed,
    similarityLed,
    biasRisk,
    avgDivergence,
  };
}

/**
 * Get score breakdown for a single candidate.
 * Useful for detail panels and tooltips.
 */
export function getCandidateScoreDetails(
  candidate: CandidateData,
  mandate: MandateData,
  matchScore: MatchScoreData,
  additionalSources: SourceSignal[] = []
): {
  profiles: Array<{
    id: string;
    type: string;
    label: string;
    expertiseScore: number;
    similarityScore: number;
    reliabilityScore: number;
  }>;
  summary: CandidateScoreSummary;
} {
  const context = buildCandidateContext(candidate, mandate, matchScore, additionalSources);
  const { profiles, summary } = getScoreBreakdownForCandidate(context);

  return {
    profiles: profiles.map(p => ({
      id: p.id,
      type: p.type,
      label: p.label,
      expertiseScore: p.scores.expertiseScore,
      similarityScore: p.scores.similarityScore,
      reliabilityScore: p.scores.sourceReliabilityScore,
    })),
    summary,
  };
}

// ============================================================================
// SOURCE ACCURACY TRACKING
// ============================================================================

/**
 * Aggregate source accuracy history from logs.
 * This would query the source_accuracy_log table in a real implementation.
 */
export async function getSourceAccuracyHistory(
  sourceId: string
): Promise<{ totalUses: number; correctUses: number }> {
  // TODO: Implement actual DB query
  // For now, return mock data
  
  // Example SQL:
  // SELECT 
  //   COUNT(*) as total_uses,
  //   SUM(CASE WHEN outcome THEN 1 ELSE 0 END) as correct_uses
  // FROM source_accuracy_log
  // WHERE source_id = $1
  
  return {
    totalUses: 0,
    correctUses: 0,
  };
}

/**
 * Log a source accuracy event.
 * Call this when a placement succeeds or fails.
 */
export async function logSourceAccuracy(
  sourceId: string,
  sourceType: string,
  outcome: boolean
): Promise<void> {
  // TODO: Implement actual DB insert
  
  // Example SQL:
  // INSERT INTO source_accuracy_log (source_id, source_type, outcome)
  // VALUES ($1, $2, $3)
  
  console.log(`[Source Accuracy] ${sourceId} (${sourceType}): ${outcome ? 'SUCCESS' : 'FAILURE'}`);
}

// ============================================================================
// BATCH PROCESSING UTILITIES
// ============================================================================

/**
 * Process all candidates for all mandates and detect high-bias situations.
 * This can be run as a nightly job to monitor bias trends.
 */
export async function runBiasAudit(
  mandates: MandateData[],
  candidatesByMandate: Map<number, CandidateData[]>,
  matchScoresByMandate: Map<number, Map<number, MatchScoreData>>
): Promise<{
  highBiasMandates: Array<{
    mandateId: string;
    mandateName: string;
    avgDivergence: number;
    biasRisk: "low" | "medium" | "high";
    topCandidateWouldChange: boolean;
  }>;
  overallBiasRisk: "low" | "medium" | "high";
}> {
  const highBiasMandates: Array<{
    mandateId: string;
    mandateName: string;
    avgDivergence: number;
    biasRisk: "low" | "medium" | "high";
    topCandidateWouldChange: boolean;
  }> = [];

  let totalDivergence = 0;
  let mandateCount = 0;

  for (const mandate of mandates) {
    const candidates = candidatesByMandate.get(mandate.id) || [];
    const matchScores = matchScoresByMandate.get(mandate.id) || new Map();

    if (candidates.length === 0) continue;

    const result = await getScoredCandidatesForMandate(
      mandate.id.toString(),
      candidates,
      mandate,
      matchScores
    );

    totalDivergence += result.avgDivergence;
    mandateCount++;

    const topCandidateWouldChange = 
      result.expertiseLed[0]?.candidateId !== result.similarityLed[0]?.candidateId;

    if (result.biasRisk === "high" || (result.biasRisk === "medium" && topCandidateWouldChange)) {
      highBiasMandates.push({
        mandateId: mandate.id.toString(),
        mandateName: mandate.title,
        avgDivergence: result.avgDivergence,
        biasRisk: result.biasRisk,
        topCandidateWouldChange,
      });
    }
  }

  const overallAvgDivergence = mandateCount > 0 ? totalDivergence / mandateCount : 0;
  const overallBiasRisk: "low" | "medium" | "high" =
    overallAvgDivergence < 1.5 ? "low" :
    overallAvgDivergence < 3.0 ? "medium" :
    "high";

  return {
    highBiasMandates: highBiasMandates.sort((a, b) => b.avgDivergence - a.avgDivergence),
    overallBiasRisk,
  };
}

// ============================================================================
// MOCK DATA HELPERS (for development/testing)
// ============================================================================

/**
 * Generate mock candidate data for testing.
 */
export function generateMockCandidateData(id: number): CandidateData {
  const sectors = ["private-equity", "infrastructure", "real-estate", "venture-capital"];
  const functions = ["portfolio-management", "deal-origination", "investor-relations"];
  const firms = ["blackstone", "kkr", "carlyle", "apollo"];
  const schools = ["harvard", "stanford", "insead", "london-business-school"];

  return {
    id,
    name: `Test Candidate ${id}`,
    email: `candidate${id}@example.com`,
    current_title: "Investment Director",
    current_firm: firms[id % firms.length],
    location: "London",
    sectors: [sectors[id % sectors.length], sectors[(id + 1) % sectors.length]],
    functions: [functions[id % functions.length]],
    asset_classes: ["buyout", "growth"],
    geographies: ["europe", "uk"],
    seniority: "senior",
    experience: [
      {
        firm: firms[id % firms.length],
        title: "Associate",
        start_date: "2018-01-01",
        end_date: "2021-01-01",
      },
    ],
    education: [
      {
        institution: schools[id % schools.length],
        degree: "MBA",
        field: "Finance",
        year: "2018",
      },
    ],
  };
}

/**
 * Generate mock mandate data for testing.
 */
export function generateMockMandateData(id: number): MandateData {
  return {
    id,
    title: `Senior Investment Professional - Mandate ${id}`,
    sectors: ["private-equity", "infrastructure"],
    functions: ["portfolio-management", "deal-origination"],
    asset_classes: ["buyout"],
    geographies: ["europe", "uk"],
    seniority: "senior",
    required_skills: ["financial-modeling", "due-diligence", "deal-execution"],
  };
}

/**
 * Generate mock match score data for testing.
 */
export function generateMockMatchScoreData(
  candidateId: number,
  mandateId: number
): MatchScoreData {
  return {
    candidate_id: candidateId,
    mandate_id: mandateId,
    final_score: 0.6 + Math.random() * 0.3, // 0.6 to 0.9
    sector_score: 0.7 + Math.random() * 0.3,
    function_score: 0.6 + Math.random() * 0.3,
    asset_class_score: 0.8 + Math.random() * 0.2,
    geography_score: 0.9,
    seniority_score: 1.0,
  };
}
