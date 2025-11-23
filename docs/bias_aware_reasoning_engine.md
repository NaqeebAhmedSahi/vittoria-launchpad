# Bias-Aware Reasoning Engine

## Overview

The Bias-Aware Reasoning Engine is a pure TypeScript module that provides transparent, expertise-led candidate ranking with built-in similarity bias detection and mitigation. This system ensures that hiring decisions are driven by demonstrable expertise and skills, rather than affinity or familiarity signals.

## Key Features

### 1. **Multi-Source Scoring**
- Aggregates signals from multiple sources (CVs, voice notes, market data, manual entries)
- Each source is evaluated on three dimensions:
  - **Expertise Score**: Genuine skills and experience
  - **Similarity Score**: Affinity/familiarity markers
  - **Reliability Score**: Source trustworthiness

### 2. **Bias Detection & Mitigation**
- Automatically detects when similarity signals threaten to dominate expertise
- Caps similarity contribution when it exceeds expertise by a configurable threshold
- Calculates bias risk scores and classifies them as low/medium/high

### 3. **Dual Ranking System**
- **Expertise-Led Ranking**: The recommended approach that prioritizes demonstrable skills
- **Similarity-Led Ranking**: A counterfactual showing what would happen if we ranked by affinity alone
- **Divergence Scoring**: Measures how different these two approaches are

### 4. **Counterfactual Explanations**
- AI-generated narratives explaining how similarity bias could change outcomes
- Identifies candidates who would jump significantly in a similarity-led ranking
- Provides transparency about which signals are driving decisions

### 5. **Source Attribution**
- Every candidate score is traceable to its sources
- Each source is tagged with its reasoning basis (expertise-led/mixed/similarity-heavy)
- UI components can display this attribution in tooltips and popovers

### 6. **Weekly Bias Watch**
- Aggregates bias metrics across all mandates for a given week
- Identifies high-bias events and most affected mandates
- Provides actionable insights by source type
- Exportable as JSON for external analysis

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Data Sources                              │
│  CV • Voice Notes • Market Data • Manual Entries • Notes    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              Source Profile (per source)                     │
│  • Expertise Score (0-1)                                     │
│  • Similarity Score (0-1)                                    │
│  • Reliability Score (0-1)                                   │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│           computeBiasScores (per candidate)                  │
│  • Aggregates all sources                                    │
│  • Detects similarity dominance                              │
│  • Calculates composite score (expertise-weighted)           │
│  • Computes bias risk score                                  │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                   Dual Rankings                              │
│  ┌────────────────────────┬──────────────────────────┐      │
│  │  Expertise-Led         │  Similarity-Led          │      │
│  │  (Recommended)         │  (Counterfactual)        │      │
│  └────────────────────────┴──────────────────────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│               Transparency Outputs                           │
│  • Counterfactual explanations                               │
│  • Source attribution tags                                   │
│  • Bias risk levels                                          │
│  • Weekly bias watch summaries                               │
└─────────────────────────────────────────────────────────────┘
```

## Core Types

### SourceProfile
```typescript
interface SourceProfile {
  id: string;
  type: "cv" | "mandate_note" | "voice_note" | "market_data" | "manual";
  label: string;
  expertiseScore: number;      // 0-1
  similarityScore: number;     // 0-1
  reliabilityScore: number;    // 0-1
  metadata?: Record<string, any>;
}
```

### BiasScores
```typescript
interface BiasScores {
  expertiseScore: number;
  similarityScore: number;
  reliabilityScore: number;
  compositeScore: number;
  biasRiskScore: number;       // similarityScore - expertiseScore
  biasRiskLevel: "low" | "medium" | "high";
}
```

### CandidateWithSources
```typescript
interface CandidateWithSources {
  id: string;
  name: string;
  mandateId: string;
  baseMatchScore: number;      // Existing fit score from the app
  sources: SourceProfile[];
}
```

## Core Functions

### `computeBiasScores(sources: SourceProfile[]): BiasScores`
Computes bias-aware scores from an array of sources.

**Algorithm:**
1. Calculate weighted averages of expertise, similarity, and reliability scores
2. Compute initial composite score using configured weights
3. Detect similarity dominance (when similarity > expertise + threshold)
4. Cap composite score if similarity is dominating
5. Calculate bias risk score = similarity - expertise
6. Classify bias risk level based on thresholds

**Configuration:**
```typescript
WEIGHTS = {
  expertise: 0.5,      // Dominant factor
  similarity: 0.25,
  reliability: 0.25,
}

SIMILARITY_DOMINANCE_THRESHOLD = 0.15
BIAS_RISK_THRESHOLDS = {
  low: 0.05,
  medium: 0.15,
}
```

### `buildExpertiseRanking(candidates: CandidateWithSources[]): RankingResult[]`
Builds the recommended, expertise-led ranking.

**Algorithm:**
1. For each candidate, call `computeBiasScores()`
2. Combine `baseMatchScore` with `compositeScore` (simple average)
3. Sort descending by final score
4. Assign sequential ranks

### `buildSimilarityRanking(candidates: CandidateWithSources[]): RankingResult[]`
Builds a similarity-only ranking for comparison.

**Algorithm:**
1. For each candidate, call `computeBiasScores()`
2. Rank ONLY by similarity score (ignoring expertise)
3. Sort descending by similarity
4. Assign sequential ranks

### `compareRankings(expertise, similarity): BiasRankingComparison`
Compares the two rankings to measure divergence.

**Algorithm:**
1. Build lookup map of similarity ranks
2. For each candidate, compute absolute rank difference
3. Calculate average divergence score
4. Return both rankings + divergence score

### `buildCounterfactualExplanation(mandateId, candidates, topN): CounterfactualExplanation`
Generates human-readable explanation of bias impact.

**Algorithm:**
1. Build both rankings
2. Take top N from each
3. Detect if top candidate changes
4. Identify significant jumps (>2 positions)
5. Generate narrative explanation
6. Return top N lists + explanation text

### `classifyReasoningBasis(biasScores): ReasoningBasis`
Classifies how a decision was made.

**Rules:**
- `biasRiskScore > 0.15` → `"similarity-heavy"`
- `biasRiskScore > 0.05` → `"mixed"`
- Otherwise → `"expertise-led"`

### `buildSourceAttributionTags(candidate): SourceAttributionTag[]`
Creates UI tags showing source contributions.

**Returns:** Array of tags with:
- Source type and label
- Reasoning basis classification
- All three scores for tooltips

### `buildBiasWatchSummary(weekId, decisions, mandateLookup): BiasWatchSummary`
Aggregates weekly bias metrics.

**Algorithm:**
1. Count high-bias events (divergence > threshold)
2. Group by mandate to find most affected
3. Analyze by source type with heuristic comments
4. Calculate average divergence
5. Return structured summary

### `exportBiasSummaryAsJson(summary): void`
Triggers client-side JSON download.

## Usage Examples

### Basic Ranking
```typescript
import {
  buildExpertiseRanking,
  buildSimilarityRanking,
  compareRankings,
  CandidateWithSources,
} from "@/services/biasAwareReasoningEngine";

const candidates: CandidateWithSources[] = [
  {
    id: "c1",
    name: "Alice",
    mandateId: "m1",
    baseMatchScore: 0.85,
    sources: [
      {
        id: "s1",
        type: "cv",
        label: "CV Parsing",
        expertiseScore: 0.9,
        similarityScore: 0.5,
        reliabilityScore: 0.95,
      },
      {
        id: "s2",
        type: "voice_note",
        label: "Intake Call",
        expertiseScore: 0.7,
        similarityScore: 0.8,
        reliabilityScore: 0.7,
      },
    ],
  },
  // ... more candidates
];

const expertiseRanking = buildExpertiseRanking(candidates);
const similarityRanking = buildSimilarityRanking(candidates);
const comparison = compareRankings(expertiseRanking, similarityRanking);

console.log(`Divergence: ${comparison.divergenceScore}`);
// Divergence: 1.23
```

### Counterfactual Explanation
```typescript
import { buildCounterfactualExplanation } from "@/services/biasAwareReasoningEngine";

const counterfactual = buildCounterfactualExplanation(
  "mandate-1",
  candidates,
  5  // Top 5
);

console.log(counterfactual.explanation);
// "Expertise-based ranking keeps Alice at the top. A similarity-led ranking
//  would promote Bob due to shared firm background and prior team links."
```

### Source Attribution (in React component)
```typescript
import { buildSourceAttributionTags } from "@/services/biasAwareReasoningEngine";

function CandidateCard({ candidate }) {
  const tags = buildSourceAttributionTags(candidate);
  
  return (
    <div>
      <h3>{candidate.name}</h3>
      <div className="flex gap-2">
        {tags.map(tag => (
          <Tooltip key={tag.sourceId}>
            <TooltipTrigger>
              <Badge>{tag.label}</Badge>
            </TooltipTrigger>
            <TooltipContent>
              <div>Reasoning: {tag.reasoningBasis}</div>
              <div>Expertise: {tag.expertiseScore * 100}%</div>
              <div>Similarity: {tag.similarityScore * 100}%</div>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>
    </div>
  );
}
```

### Weekly Bias Watch
```typescript
import {
  buildBiasWatchSummary,
  generateMockWeeklyDecisions,
  mockMandateLookup,
} from "@/services/biasAwareReasoningEngine";

const decisions = generateMockWeeklyDecisions("2025-W47", 10);
const summary = buildBiasWatchSummary("2025-W47", decisions, mockMandateLookup);

console.log(`High bias events: ${summary.highBiasEventCount}`);
console.log(`Most affected: ${summary.mostAffectedMandates[0].name}`);
```

### Export Summary
```typescript
import { exportBiasSummaryAsJson } from "@/services/biasAwareReasoningEngine";

// User clicks "Download" button
<Button onClick={() => exportBiasSummaryAsJson(summary)}>
  <Download className="mr-2" />
  Export Bias Report
</Button>
```

## UI Components

### BiasAwareDemo Page
Located at `/intelligence/bias-demo`, this is a comprehensive demo showcasing all features:

**Features:**
- Side-by-side expertise vs similarity rankings
- Visual divergence metrics
- Counterfactual explanations
- Source attribution display
- Weekly bias watch dashboard
- JSON export functionality

**Access:** Navigate to Intelligence → Bias Demo in the sidebar

## Configuration

All configuration constants are at the top of `biasAwareReasoningEngine.ts`:

```typescript
export const WEIGHTS = {
  expertise: 0.5,      // Increase to make expertise more dominant
  similarity: 0.25,    // Decrease to reduce similarity influence
  reliability: 0.25,
} as const;

export const SIMILARITY_DOMINANCE_THRESHOLD = 0.15;  // Lower = stricter caps
export const BIAS_RISK_THRESHOLDS = {
  low: 0.05,    // Adjust to change risk classifications
  medium: 0.15,
} as const;

export const HIGH_BIAS_DIVERGENCE_THRESHOLD = 1.5;  // For weekly summaries
```

## Testing & Mock Data

The module includes built-in mock data generators for testing:

- `generateMockSources(count)`: Create realistic source profiles
- `generateMockCandidates(mandateId, count)`: Create test candidates
- `generateMockWeeklyDecisions(weekId, mandateCount)`: Create weekly data
- `mockMandateLookup(id)`: Simple mandate lookup function

Use these in development/testing:
```typescript
import { generateMockCandidates } from "@/services/biasAwareReasoningEngine";

const testCandidates = generateMockCandidates("mandate-test", 20);
```

## Best Practices

### 1. **Source Quality**
Always provide accurate expertise/similarity/reliability scores for sources:
- CV parsing → High expertise, low similarity, high reliability
- Voice notes → Variable expertise, often higher similarity, medium reliability
- Market data → Medium expertise, low similarity, high reliability

### 2. **Threshold Tuning**
Monitor weekly bias watch summaries to tune thresholds:
- If too many false positives, increase `SIMILARITY_DOMINANCE_THRESHOLD`
- If bias is slipping through, decrease it

### 3. **Transparency First**
Always show source attribution to users:
- Use tooltips to display reasoning basis
- Explain why candidates ranked where they did
- Provide counterfactual explanations for key decisions

### 4. **Regular Audits**
Run weekly bias watch reports:
- Review most affected mandates
- Check source type patterns
- Look for systematic biases
- Export and archive reports

### 5. **No Backend Assumptions**
This module is **pure TypeScript** with no backend dependencies:
- All functions are deterministic
- No API calls
- No React hooks
- Fully testable

## Integration with Backend (Future)

When integrating with real backend:

1. **Replace mock data** with API calls:
```typescript
// Instead of:
const candidates = generateMockCandidates(mandateId, 10);

// Use:
const candidates = await fetchCandidatesWithSources(mandateId);
```

2. **Store source profiles** in database:
```sql
CREATE TABLE candidate_sources (
  id UUID PRIMARY KEY,
  candidate_id UUID REFERENCES candidates(id),
  source_type VARCHAR(50),
  label TEXT,
  expertise_score DECIMAL(3,2),
  similarity_score DECIMAL(3,2),
  reliability_score DECIMAL(3,2),
  metadata JSONB
);
```

3. **Log bias events** for analysis:
```typescript
// When divergence is high, log it
if (comparison.divergenceScore > HIGH_BIAS_DIVERGENCE_THRESHOLD) {
  await api.biasWatch.logEvent({
    mandateId,
    divergenceScore: comparison.divergenceScore,
    timestamp: new Date(),
  });
}
```

## Files

- **Engine**: `src/services/biasAwareReasoningEngine.ts` (pure logic)
- **Demo UI**: `src/pages/BiasAwareDemo.tsx` (React components)
- **Documentation**: `docs/bias_aware_reasoning_engine.md` (this file)

## Support

For questions or issues with the bias-aware reasoning engine:
1. Check this documentation
2. Review the inline JSDoc comments in the code
3. Test with mock data generators
4. Consult the demo UI for usage examples

## License

Part of the Vittoria Launchpad project.
