# Bias-Aware Scoring Integration Guide

## Overview

This guide explains how the bias-aware scoring system integrates with the existing Vittoria Launchpad application, from raw candidate data to bias-aware rankings in the UI.

## Architecture Summary

```
┌─────────────────────────────────────────────────────────────┐
│                    Database Layer                            │
│  candidates • mandates • match_scores                        │
│  + source_accuracy_log • source_profiles • bias_scores       │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│            candidateScoringIntegration.ts                    │
│  • Extract tags from candidate data                          │
│  • Build SourceSignals from multiple sources                 │
│  • Fetch accuracy history from logs                          │
│  • Create CandidateContext objects                           │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│              biasAwareScoringFlow.ts                         │
│  • Compute three scores per source                           │
│  • Aggregate scores across sources                           │
│  • Detect similarity dominance                               │
│  • Generate dual rankings                                    │
└─────────────────────┬───────────────────────────────────────┘
                      │
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    UI Components                             │
│  • Candidates.tsx (show bias alerts)                         │
│  • Mandates.tsx (show bias-aware rankings)                   │
│  • IntegratedScoringDemo.tsx (full demo)                     │
└─────────────────────────────────────────────────────────────┘
```

## Step 1: Database Setup

Run the migration to create required tables:

```bash
# Connect to PostgreSQL
psql -d vittoria -f migrations/005_source_accuracy_tracking.sql
```

This creates:
- `source_accuracy_log`: Track source usage outcomes
- `source_profiles`: Cached reliability metrics
- `candidate_source_signals`: Links candidates to sources with tags
- `candidate_bias_scores`: Cached composite scores
- `bias_events`: Log of high-bias situations

## Step 2: Tag Extraction

When a candidate is created or updated, extract tags:

```typescript
import { 
  extractCandidateDomainTags, 
  extractCandidateSimilarityTags 
} from "@/services/candidateScoringIntegration";

// On CV upload/parse
const candidate = await api.candidates.get(candidateId);

const domainTags = extractCandidateDomainTags(candidate);
// ["private-equity", "infrastructure", "london", "senior", ...]

const similarityTags = extractCandidateSimilarityTags(candidate);
// ["blackstone", "harvard", "finance-club", ...]

// Store in candidate_source_signals table
await api.candidateSources.create({
  candidate_id: candidateId,
  source_id: `cv-${candidateId}`,
  source_type: "cv",
  domain_tags: domainTags,
  similarity_tags: similarityTags,
});
```

## Step 3: Building Candidate Context

When displaying candidates for a mandate:

```typescript
import { 
  buildCandidateContext,
  buildCvSourceSignal,
  getSourceAccuracyHistory,
} from "@/services/candidateScoringIntegration";

// Fetch data
const mandate = await api.mandates.get(mandateId);
const candidates = await api.candidates.getForMandate(mandateId);
const matchScores = await api.matchScores.getForMandate(mandateId);

// Build contexts
const contexts = await Promise.all(
  candidates.map(async (candidate) => {
    const matchScore = matchScores.find(m => m.candidate_id === candidate.id);
    
    // Get CV source with accuracy history
    const cvAccuracy = await getSourceAccuracyHistory(`cv-${candidate.id}`);
    const cvSource = buildCvSourceSignal(candidate, cvAccuracy);
    
    // TODO: Get other sources (voice notes, manual entries, etc.)
    const additionalSources = [];
    
    return buildCandidateContext(
      candidate,
      mandate,
      matchScore,
      [cvSource, ...additionalSources]
    );
  })
);
```

## Step 4: Getting Scored Rankings

Use the high-level API to get bias-aware rankings:

```typescript
import { getScoredCandidatesForMandate } from "@/services/candidateScoringIntegration";

const result = await getScoredCandidatesForMandate(
  mandateId.toString(),
  candidates,
  mandate,
  matchScoresMap
);

// result = {
//   expertiseLed: CandidateScoreSummary[],     // Use this for decisions
//   similarityLed: CandidateScoreSummary[],    // For bias detection
//   biasRisk: "low" | "medium" | "high",
//   avgDivergence: number
// }

// Display expertiseLed to user
const topCandidates = result.expertiseLed.slice(0, 5);

// Alert if bias risk is high
if (result.biasRisk === "high") {
  showBiasAlert(`⚠️ High bias risk detected (divergence: ${result.avgDivergence})`);
}
```

## Step 5: Logging Outcomes

When a placement succeeds or fails, log it:

```typescript
import { logSourceAccuracy } from "@/services/candidateScoringIntegration";

// When candidate accepts offer and performs well
await logSourceAccuracy(
  `cv-${candidateId}`,
  "cv",
  true  // outcome = success
);

// When candidate was overhyped in voice note
await logSourceAccuracy(
  `voice-${voiceNoteId}`,
  "voice_note",
  false  // outcome = failure
);
```

This updates the `source_accuracy_log` table and triggers recomputation of reliability scores.

## Step 6: UI Integration

### Adding Bias Alerts to Candidates Page

```typescript
// In Candidates.tsx
import { getCandidateScoreDetails } from "@/services/candidateScoringIntegration";

function CandidateRow({ candidate, mandate, matchScore }) {
  const { summary } = getCandidateScoreDetails(candidate, mandate, matchScore);
  
  const biasRisk = summary.avgSimilarityScore - summary.avgExpertiseScore > 0.15 
    ? "high" 
    : summary.avgSimilarityScore - summary.avgExpertiseScore > 0.05
    ? "medium"
    : "low";
  
  return (
    <tr>
      <td>{candidate.name}</td>
      <td>{(summary.compositeScore * 100).toFixed(0)}%</td>
      <td>
        {biasRisk !== "low" && (
          <Badge variant="warning">
            ⚠️ {biasRisk} bias risk
          </Badge>
        )}
      </td>
      <td>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-4 w-4" />
          </TooltipTrigger>
          <TooltipContent>
            <div>Expertise: {(summary.avgExpertiseScore * 100).toFixed(0)}%</div>
            <div>Similarity: {(summary.avgSimilarityScore * 100).toFixed(0)}%</div>
            <div>Reliability: {(summary.avgReliabilityScore * 100).toFixed(0)}%</div>
          </TooltipContent>
        </Tooltip>
      </td>
    </tr>
  );
}
```

### Using in Mandates Page

```typescript
// In MandateDetailPage.tsx
import { getScoredCandidatesForMandate } from "@/services/candidateScoringIntegration";

function MandateCandidates({ mandateId }) {
  const [rankings, setRankings] = useState(null);
  
  useEffect(() => {
    async function loadRankings() {
      const candidates = await api.candidates.getForMandate(mandateId);
      const mandate = await api.mandates.get(mandateId);
      const matchScores = await api.matchScores.getForMandate(mandateId);
      
      const result = await getScoredCandidatesForMandate(
        mandateId,
        candidates,
        mandate,
        matchScores
      );
      
      setRankings(result);
    }
    loadRankings();
  }, [mandateId]);
  
  if (!rankings) return <Loading />;
  
  return (
    <div>
      {rankings.biasRisk === "high" && (
        <Alert variant="warning">
          ⚠️ High bias risk detected. Similarity signals may be inflating scores.
        </Alert>
      )}
      
      <Table>
        {rankings.expertiseLed.map((candidate, idx) => (
          <CandidateRow key={candidate.candidateId} rank={idx + 1} {...candidate} />
        ))}
      </Table>
    </div>
  );
}
```

## Advanced: Voice Note Integration

When processing voice notes:

```typescript
import { buildVoiceNoteSourceSignal } from "@/services/candidateScoringIntegration";

async function processVoiceNote(voiceNoteId, candidateId, transcript) {
  // Use LLM to extract domain and similarity tags
  const extracted = await llm.extractTags(transcript);
  
  // extracted = {
  //   domainTags: ["deal-origination", "portfolio-management"],
  //   similarityTags: ["goldman-sachs", "shared-team"]
  // }
  
  // Get accuracy history
  const accuracy = await getSourceAccuracyHistory(`voice-${voiceNoteId}`);
  
  // Build source signal
  const voiceSource = buildVoiceNoteSourceSignal(
    voiceNoteId,
    candidateId,
    extracted.domainTags,
    extracted.similarityTags,
    accuracy
  );
  
  // Store in candidate_source_signals
  await api.candidateSources.create({
    candidate_id: candidateId,
    source_id: `voice-${voiceNoteId}`,
    source_type: "voice_note",
    domain_tags: extracted.domainTags,
    similarity_tags: extracted.similarityTags,
  });
  
  return voiceSource;
}
```

## Advanced: Nightly Bias Audit

Run this as a cron job to detect bias trends:

```typescript
import { runBiasAudit } from "@/services/candidateScoringIntegration";

async function nightlyBiasCheck() {
  const mandates = await api.mandates.getAllActive();
  const candidatesByMandate = new Map();
  const matchScoresByMandate = new Map();
  
  for (const mandate of mandates) {
    const candidates = await api.candidates.getForMandate(mandate.id);
    const scores = await api.matchScores.getForMandate(mandate.id);
    candidatesByMandate.set(mandate.id, candidates);
    matchScoresByMandate.set(mandate.id, new Map(scores.map(s => [s.candidate_id, s])));
  }
  
  const auditResult = await runBiasAudit(
    mandates,
    candidatesByMandate,
    matchScoresByMandate
  );
  
  // Log high-bias mandates
  for (const highBias of auditResult.highBiasMandates) {
    await api.biasEvents.log({
      mandate_id: highBias.mandateId,
      mandate_title: highBias.mandateName,
      event_type: "high_divergence",
      severity: highBias.biasRisk,
      avg_divergence: highBias.avgDivergence,
      detected_at: new Date(),
    });
    
    // Send email alert
    if (highBias.topCandidateWouldChange) {
      await sendEmail({
        to: "recruiter@example.com",
        subject: `⚠️ Bias Alert: ${highBias.mandateName}`,
        body: `Similarity bias detected. Top candidate would change in similarity-led ranking.`,
      });
    }
  }
  
  console.log(`Bias audit complete. Overall risk: ${auditResult.overallBiasRisk}`);
}
```

## Configuration

Adjust scoring weights in `biasAwareScoringFlow.ts`:

```typescript
// Default weights (can be made configurable via Settings UI)
export const EXPERTISE_MATCH_WEIGHT = 0.4;    // Expertise is dominant
export const SIMILARITY_MATCH_WEIGHT = 0.1;   // Similarity is secondary
export const RELIABILITY_WEIGHT = 0.1;        // Source trust
export const BASE_MATCH_WEIGHT = 0.4;         // Existing fit score

// Similarity dominance threshold
export const SIMILARITY_DOMINANCE_THRESHOLD = 0.15;  // Cap at expertise + 15%
```

## Testing

Use the demo pages to test:

1. **Scoring Flow Demo** (`/intelligence/scoring-demo`):
   - Pure scoring logic with mock data
   - See how three scores combine
   - No database dependencies

2. **Integrated Demo** (`/intelligence/integrated-demo`):
   - Full integration with candidate data
   - Shows tag extraction and source building
   - Uses mock candidates but real integration code

3. **Production Integration**:
   - Add bias alerts to `Candidates.tsx`
   - Add bias-aware rankings to `Mandates.tsx`
   - Monitor bias events in `BiasWatch.tsx`

## Monitoring

Key metrics to track:

1. **Avg Divergence**: How different are expertise vs similarity rankings?
2. **Bias Event Frequency**: How often do high-bias situations occur?
3. **Source Reliability Trends**: Are certain source types consistently unreliable?
4. **Top Candidate Changes**: How often would similarity change the #1 pick?

Query for monitoring:

```sql
-- Weekly bias summary
SELECT 
  DATE_TRUNC('week', detected_at) as week,
  COUNT(*) as bias_events,
  AVG(avg_divergence) as avg_divergence,
  SUM(CASE WHEN severity = 'high' THEN 1 ELSE 0 END) as high_severity
FROM bias_events
WHERE detected_at > NOW() - INTERVAL '90 days'
GROUP BY week
ORDER BY week DESC;

-- Source type reliability
SELECT 
  source_type,
  AVG(reliability_score) as avg_reliability,
  COUNT(*) as source_count
FROM source_profiles
GROUP BY source_type
ORDER BY avg_reliability DESC;
```

## Troubleshooting

### Problem: All reliability scores are 0.5

**Cause:** No accuracy history logged yet.

**Solution:** Start logging outcomes:
```typescript
await logSourceAccuracy('cv-123', 'cv', true);
```

### Problem: Similarity scores are all 0

**Cause:** Similarity tags not being extracted.

**Solution:** Check tag extraction:
```typescript
const tags = extractCandidateSimilarityTags(candidate);
console.log('Similarity tags:', tags);
```

### Problem: Rankings don't change from base match scores

**Cause:** Not enough source diversity.

**Solution:** Add more sources (voice notes, market data):
```typescript
const additionalSources = [
  voiceNoteSource,
  marketDataSource,
];
```

## Next Steps

1. ✅ Database migration complete
2. ✅ Tag extraction functions ready
3. ✅ Scoring integration service built
4. ✅ Demo pages working
5. ⏳ Add to Candidates.tsx (next: bias alerts)
6. ⏳ Add to Mandates.tsx (next: bias-aware rankings)
7. ⏳ Implement voice note tag extraction
8. ⏳ Set up nightly bias audit job
9. ⏳ Add Settings UI for weight configuration

## Files Reference

**Core Logic:**
- `src/services/biasAwareScoringFlow.ts`: Pure scoring algorithms
- `src/services/candidateScoringIntegration.ts`: Integration layer
- `migrations/005_source_accuracy_tracking.sql`: Database schema

**UI Components:**
- `src/pages/ScoringFlowDemo.tsx`: Basic scoring demo
- `src/pages/IntegratedScoringDemo.tsx`: Full integration demo
- `src/pages/Candidates.tsx`: (to be updated with bias alerts)
- `src/pages/Mandates.tsx`: (to be updated with bias-aware rankings)

**Documentation:**
- `docs/bias_aware_scoring_flow.md`: Scoring algorithm docs
- `docs/bias_aware_scoring_integration.md`: This file

---

**Last Updated:** November 21, 2025  
**Status:** Integration layer complete, ready for production implementation
