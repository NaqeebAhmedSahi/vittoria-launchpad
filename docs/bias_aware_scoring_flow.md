# Bias-Aware Scoring Flow: Three-Score System

## Executive Summary

The Bias-Aware Scoring Flow is a transparent, expertise-led candidate ranking system built on three core scores:

1. **Expertise Score** (0-1): Domain expertise overlap with mandate requirements
2. **Similarity Score** (0-1): Affinity/familiarity signals (e.g., shared background)
3. **Source Reliability Score** (0-1): Historical accuracy of information sources

This system ensures hiring decisions prioritize demonstrable skills over affinity bias while maintaining full transparency about how rankings are computed.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Raw Data Sources                          │
│  CV • Voice Notes • Mandate Notes • Market Data • Manual    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Source Signals                              │
│  • Domain Tags (sector, function, skills)                   │
│  • Similarity Tags (shared firms, schools)                  │
│  • Accuracy History (totalUses, correctUses)                │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Three-Score Computation                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ computeExpertiseScore                                │  │
│  │ • Compare domain tags with mandate requirements      │  │
│  │ • Score = proportion of matching expertise tags      │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ computeSimilarityScore                               │  │
│  │ • Compare similarity tags with candidate background  │  │
│  │ • Score = proportion of matching affinity signals    │  │
│  └──────────────────────────────────────────────────────┘  │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ computeReliabilityScore                              │  │
│  │ • Calculate correctUses / totalUses                  │  │
│  │ • Shrink towards 0.5 for low-sample sources          │  │
│  └──────────────────────────────────────────────────────┘  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│          Candidate-Level Aggregation                         │
│  • Average all three scores across sources                  │
│  • Detect similarity dominance                              │
│  • Cap similarity if it exceeds expertise by >15%           │
│  • Compute composite score with configured weights          │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                  Dual Rankings                               │
│  ┌────────────────────────┬──────────────────────────┐      │
│  │  Expertise-Led         │  Similarity-Only         │      │
│  │  (Recommended)         │  (For Bias Detection)    │      │
│  └────────────────────────┴──────────────────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

## Core Types

### SourceSignal

Represents raw information from a data source about a candidate.

```typescript
interface SourceSignal {
  id: string;
  type: "cv" | "mandate_note" | "voice_note" | "market_data" | "manual";
  label: string;
  
  // Domain expertise indicators
  domainTags: string[];        // e.g., ["private-equity", "infrastructure", "london"]
  
  // Affinity/similarity indicators
  similarityTags: string[];    // e.g., ["goldman-sachs", "harvard", "finance-club"]
  
  // Historical performance tracking
  accuracyHistory: {
    totalUses: number;         // How many times this source was used
    correctUses: number;       // How many led to good outcomes
  };
  
  // Optional manual weight (admin-configurable)
  weight?: number;             // Boost/reduce this source's influence
}
```

**Example:**
```typescript
const cvSource: SourceSignal = {
  id: "cv-123",
  type: "cv",
  label: "CV Parsing - John Smith",
  domainTags: ["private-equity", "infrastructure", "london", "senior"],
  similarityTags: ["blackstone"],
  accuracyHistory: { totalUses: 10, correctUses: 8 },
  weight: 1.2, // Trust CVs slightly more than other sources
};
```

### SourceScores

The three computed scores for a source.

```typescript
interface SourceScores {
  expertiseScore: number;          // 0-1: Domain expertise match
  similarityScore: number;         // 0-1: Affinity/familiarity signals
  sourceReliabilityScore: number;  // 0-1: Historical accuracy
}
```

### CandidateContext

Full context needed to score a candidate against a mandate.

```typescript
interface CandidateContext {
  id: string;
  name: string;
  mandateId: string;
  
  mandateTags: string[];      // Required by mandate: ["private-equity", "infrastructure"]
  candidateTags: string[];    // Candidate has: ["private-equity", "infrastructure", "blackstone"]
  
  baseMatchScore: number;     // Existing fit score from app (0-1)
  sources: SourceSignal[];    // All sources contributing to this assessment
}
```

### CandidateScoreSummary

Final scores and ranking for a candidate.

```typescript
interface CandidateScoreSummary {
  candidateId: string;
  name: string;
  mandateId: string;
  baseMatchScore: number;
  avgExpertiseScore: number;
  avgSimilarityScore: number;
  avgReliabilityScore: number;
  compositeScore: number;      // Final ranking score
}
```

## Scoring Algorithms

### 1. Expertise Score

**Purpose:** Measure how well a source demonstrates domain expertise relevant to the mandate.

**Algorithm:**
```typescript
function computeExpertiseScore(signal: SourceSignal, context: CandidateContext): number {
  // 1. Combine mandate requirements + candidate capabilities
  const relevantTags = new Set([...context.mandateTags, ...context.candidateTags]);
  
  // 2. Count matching domain tags
  let matches = 0;
  for (const tag of signal.domainTags) {
    if (relevantTags.has(tag)) matches++;
  }
  
  // 3. Score = proportion of matches
  let score = matches / signal.domainTags.length;
  
  // 4. Apply optional manual weight
  if (signal.weight) score *= signal.weight;
  
  // 5. Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}
```

**Example:**
- Signal has domain tags: `["private-equity", "infrastructure", "london"]`
- Mandate requires: `["private-equity", "infrastructure"]`
- Match: 2 out of 3 tags = **67% expertise score**

### 2. Similarity Score

**Purpose:** Measure affinity/familiarity signals that don't necessarily indicate expertise.

**Algorithm:**
```typescript
function computeSimilarityScore(signal: SourceSignal, context: CandidateContext): number {
  // 1. Get candidate's background tags
  const candidateTags = new Set(context.candidateTags);
  
  // 2. Count matching similarity tags
  let matches = 0;
  for (const tag of signal.similarityTags) {
    if (candidateTags.has(tag)) matches++;
  }
  
  // 3. Score = proportion of matches
  const score = matches / signal.similarityTags.length;
  
  // 4. Clamp to [0, 1]
  return Math.max(0, Math.min(1, score));
}
```

**Example:**
- Signal has similarity tags: `["goldman-sachs", "harvard", "london-finance-club"]`
- Candidate has: `["goldman-sachs", "harvard"]`
- Match: 2 out of 3 tags = **67% similarity score**

**Note:** This score is intentionally given lower weight to prevent affinity bias.

### 3. Source Reliability Score

**Purpose:** Measure how trustworthy a source has been historically.

**Algorithm:**
```typescript
function computeReliabilityScore(signal: SourceSignal): number {
  const { totalUses, correctUses } = signal.accuracyHistory;
  
  // No history? Return neutral
  if (totalUses === 0) return 0.5;
  
  // Calculate raw accuracy
  const rawScore = correctUses / totalUses;
  
  // Shrink towards neutral for low-sample sources (Bayesian)
  if (totalUses < 5) {
    const shrinkageFactor = totalUses / 5;
    return 0.5 + (rawScore - 0.5) * shrinkageFactor;
  }
  
  return rawScore;
}
```

**Example:**
- Source used 3 times, correct 2 times
- Raw accuracy: 2/3 = 67%
- With shrinkage: 0.5 + (0.67 - 0.5) × (3/5) = **60% reliability score**

## Composite Score Calculation

The final ranking score combines all components:

```typescript
composite = 0.4 × baseMatchScore         // Existing fit score
          + 0.4 × avgExpertiseScore      // Domain expertise (DOMINANT)
          + 0.1 × avgSimilarityScore     // Affinity signals (CAPPED)
          + 0.1 × avgReliabilityScore    // Source trust
```

### Similarity Dominance Prevention

**Critical Rule:** Similarity must never dominate expertise.

```typescript
// Before computing composite:
const similarityDominance = avgSimilarityScore - avgExpertiseScore;

if (similarityDominance > 0.15) {
  // Cap similarity to expertise + 15%
  avgSimilarityScore = avgExpertiseScore + 0.15;
}
```

**Why:** This prevents affinity bias from overriding demonstrable skills.

## Configuration

All weights and thresholds are configurable at the top of `biasAwareScoringFlow.ts`:

```typescript
// Composite score weights (must sum to 1.0)
export const BASE_MATCH_WEIGHT = 0.4;
export const EXPERTISE_MATCH_WEIGHT = 0.4;
export const SIMILARITY_MATCH_WEIGHT = 0.1;
export const RELIABILITY_WEIGHT = 0.1;

// Similarity dominance prevention
export const SIMILARITY_DOMINANCE_THRESHOLD = 0.15;  // 15% max excess

// Reliability score parameters
export const RELIABILITY_MIN_OBSERVATIONS = 5;       // Shrinkage threshold
export const DEFAULT_RELIABILITY = 0.5;              // Neutral score
```

## API Reference

### Core Functions

#### `computeExpertiseScore(signal, context) → number`
Compute expertise score for a single source.

#### `computeSimilarityScore(signal, context) → number`
Compute similarity score for a single source.

#### `computeReliabilityScore(signal) → number`
Compute reliability score based on historical accuracy.

#### `buildSourceProfile(signal, context) → SourceProfile`
Build complete profile with all three scores for one source.

#### `summariseCandidateScores(context) → CandidateScoreSummary`
Aggregate all sources and compute final composite score.

#### `rankCandidatesByComposite(candidates) → CandidateScoreSummary[]`
**PRIMARY RANKING:** Sort by composite score (expertise-led).

#### `rankCandidatesBySimilarityOnly(candidates) → CandidateScoreSummary[]`
**FOR ANALYSIS ONLY:** Sort by similarity to detect bias.

### UI Integration Helpers

#### `getCandidateRankingForMandate(mandateId, candidates)`
Get both expertise-led and similarity-only rankings.

**Returns:**
```typescript
{
  expertiseLed: CandidateScoreSummary[];    // Show to users
  similarityLed: CandidateScoreSummary[];   // For bias detection
}
```

**Usage:**
```typescript
const { expertiseLed, similarityLed } = getCandidateRankingForMandate(
  "mandate-123",
  allCandidates
);

// Display expertiseLed to user
// Compare with similarityLed to detect bias risk
```

#### `getScoreBreakdownForCandidate(candidate)`
Get detailed score breakdown for tooltips/panels.

**Returns:**
```typescript
{
  profiles: SourceProfile[];           // Each source with its scores
  summary: CandidateScoreSummary;      // Aggregated scores
}
```

**Usage:**
```typescript
const { profiles, summary } = getScoreBreakdownForCandidate(candidate);

// Show summary.compositeScore as final score
// Show profiles in tooltip explaining sources
```

## Usage Examples

### Basic Ranking

```typescript
import {
  generateTestCandidates,
  rankCandidatesByComposite,
} from "@/services/biasAwareScoringFlow";

// Get test data
const candidates = generateTestCandidates("mandate-1", 10);

// Rank by composite score (expertise-led)
const ranked = rankCandidatesByComposite(candidates);

// Display top 5
ranked.slice(0, 5).forEach((candidate, idx) => {
  console.log(`#${idx + 1}: ${candidate.name} - ${candidate.compositeScore.toFixed(2)}`);
});
```

### Bias Detection

```typescript
import {
  getCandidateRankingForMandate,
} from "@/services/biasAwareScoringFlow";

const { expertiseLed, similarityLed } = getCandidateRankingForMandate(
  "mandate-1",
  candidates
);

// Compare rankings
const topExpertise = expertiseLed[0];
const topSimilarity = similarityLed[0];

if (topExpertise.candidateId !== topSimilarity.candidateId) {
  console.warn("⚠️ Bias detected: Similarity would change top candidate");
  console.log(`Expertise-led: ${topExpertise.name}`);
  console.log(`Similarity-led: ${topSimilarity.name}`);
}
```

### Score Breakdown

```typescript
import {
  getScoreBreakdownForCandidate,
} from "@/services/biasAwareScoringFlow";

const { profiles, summary } = getScoreBreakdownForCandidate(candidate);

console.log(`Composite: ${summary.compositeScore.toFixed(2)}`);
console.log(`Expertise: ${summary.avgExpertiseScore.toFixed(2)}`);
console.log(`Similarity: ${summary.avgSimilarityScore.toFixed(2)}`);
console.log(`Reliability: ${summary.avgReliabilityScore.toFixed(2)}`);

profiles.forEach(profile => {
  console.log(`  ${profile.label}:`);
  console.log(`    Expertise: ${profile.scores.expertiseScore.toFixed(2)}`);
  console.log(`    Similarity: ${profile.scores.similarityScore.toFixed(2)}`);
  console.log(`    Reliability: ${profile.scores.sourceReliabilityScore.toFixed(2)}`);
});
```

## Demo UI

Access the interactive demo at `/intelligence/scoring-demo`:

**Features:**
- Side-by-side expertise-led vs similarity-only rankings
- Divergence metrics (avg, max, bias risk level)
- Detailed score breakdowns with progress bars
- Source attribution for each candidate
- Educational content about the three scores

**Navigation:** Intelligence → Scoring Demo in sidebar

## Best Practices

### 1. Tag Design

**Domain Tags** (expertise):
- Sector: `"private-equity"`, `"infrastructure"`, `"real-estate"`
- Function: `"portfolio-management"`, `"deal-origination"`
- Geography: `"london"`, `"new-york"`, `"paris"`
- Skills: `"financial-modeling"`, `"due-diligence"`

**Similarity Tags** (affinity):
- Firms: `"goldman-sachs"`, `"blackstone"`, `"kkr"`
- Schools: `"harvard"`, `"insead"`, `"london-business-school"`
- Networks: `"finance-club"`, `"alumni-network"`

### 2. Source Weights

Recommended manual weights by source type:
- CV: `1.2` (trust parsed data more)
- Voice notes: `0.8` (conversational, less structured)
- Market data: `1.3` (objective, verified)
- Mandate notes: `1.0` (baseline)
- Manual: `1.0` (baseline)

### 3. Reliability Tracking

Always log outcomes to build accuracy history:
```typescript
// When a placement succeeds
await logSourceAccuracy(sourceId, true);

// When it fails or candidate withdraws
await logSourceAccuracy(sourceId, false);
```

### 4. Bias Monitoring

Weekly check:
```typescript
const { expertiseLed, similarityLed } = getCandidateRankingForMandate(
  mandateId,
  candidates
);

// Calculate divergence
let sumDiff = 0;
expertiseLed.forEach((c, idx) => {
  const simIdx = similarityLed.findIndex(s => s.candidateId === c.candidateId);
  sumDiff += Math.abs(idx - simIdx);
});
const avgDivergence = sumDiff / expertiseLed.length;

// Alert if high divergence
if (avgDivergence > 2.0) {
  console.warn("High bias risk detected!");
}
```

## Integration with Backend (Future)

When connecting to real data:

### 1. Extract Tags from CV
```typescript
// When parsing CV
const cvSource: SourceSignal = {
  id: `cv-${candidateId}`,
  type: "cv",
  label: `CV - ${candidateName}`,
  domainTags: extractedSkills,      // From LLM parser
  similarityTags: extractedFirms,   // From work history
  accuracyHistory: await getSourceHistory(`cv-${candidateId}`),
};
```

### 2. Track Source Accuracy
```sql
CREATE TABLE source_accuracy_log (
  id UUID PRIMARY KEY,
  source_id VARCHAR(255),
  source_type VARCHAR(50),
  outcome BOOLEAN,
  logged_at TIMESTAMP DEFAULT NOW()
);
```

### 3. Store Scores
```sql
CREATE TABLE candidate_scores (
  candidate_id UUID REFERENCES candidates(id),
  mandate_id UUID REFERENCES mandates(id),
  expertise_score DECIMAL(3,2),
  similarity_score DECIMAL(3,2),
  reliability_score DECIMAL(3,2),
  composite_score DECIMAL(3,2),
  computed_at TIMESTAMP DEFAULT NOW()
);
```

## Files

- **Core Logic**: `src/services/biasAwareScoringFlow.ts` (pure TypeScript)
- **Demo UI**: `src/pages/ScoringFlowDemo.tsx` (React components)
- **Documentation**: `docs/bias_aware_scoring_flow.md` (this file)

## Support

For questions:
1. Check inline JSDoc comments in code
2. Review this documentation
3. Test with `generateTestCandidates()` mock data
4. View demo at `/intelligence/scoring-demo`

---

**Version:** 1.0  
**Last Updated:** November 21, 2025  
**Status:** ✅ Production-ready frontend logic, awaiting backend integration
