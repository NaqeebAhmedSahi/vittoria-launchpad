# Bias Alerts UI Integration

This document describes the bias-aware scoring features integrated into the Candidates page.

## Overview

The Candidates page (`src/pages/Candidates.tsx`) now displays bias-aware scoring information to help recruiters make more objective candidate evaluations by surfacing when affinity bias (similarity) may be influencing rankings over domain expertise.

## Features Added

### 1. **Bias Risk Column**

A new "Bias Risk" column in the candidates table displays color-coded badges:

- **High** (Amber): Similarity score significantly exceeds expertise score (divergence > 0.3)
- **Medium** (Yellow): Moderate divergence (0.15 - 0.3)
- **Low** (Green): Similarity and expertise are well-balanced

### 2. **Interactive Tooltips**

Hover over any candidate name to see a detailed score breakdown showing:

- **Expertise Match**: Domain tags overlap (sectors, functions, skills)
- **Similarity Match**: Affinity signals (firms, schools, networks)
- **Source Reliability**: Historical accuracy of data sources

Each score displays:
- Progress bar visualization (color-coded: blue=expertise, amber=similarity, green=reliability)
- Percentage value (0-100%)
- Warning icon and text when similarity is unusually high

### 3. **Alert Banner**

When **any** candidate has a "high" bias risk, an alert banner appears above the candidates table:

```
⚠️ Bias Alert: Some candidates have high similarity scores that may be 
influencing their rankings. Hover over candidate names to see detailed 
score breakdowns and ensure decisions are based on expertise match rather 
than affinity bias.
```

### 4. **Detail Panel Score Breakdown**

When a candidate is selected, the right detail panel shows:

- Badge indicating bias risk level next to title/firm
- **Match Score Breakdown** section with three horizontal progress bars:
  - Expertise Match (blue)
  - Similarity Match (amber)
  - Source Reliability (green)
- Warning message for high-bias candidates:
  > ⚠️ Similarity score is unusually high relative to expertise. Ensure ranking decisions prioritize domain fit over affinity signals.

## Technical Implementation

### Score Computation

On page load and when candidates update, scores are computed using:

```typescript
const scoreDetail = getCandidateScoreDetails(candidateData, mockMandate, mockMatchScore);
const { summary } = scoreDetail;

// Map to display format
const displayScores = {
  expertiseScore: summary.avgExpertiseScore,
  similarityScore: summary.avgSimilarityScore,
  reliabilityScore: summary.avgReliabilityScore,
  compositeScore: summary.compositeScore,
  biasRisk: calculateBiasRisk(summary),
};
```

### Bias Risk Calculation

```typescript
const divergence = Math.abs(summary.avgSimilarityScore - summary.avgExpertiseScore);
const biasRisk = 
  divergence > 0.3 ? 'high' : 
  divergence > 0.15 ? 'medium' : 
  'low';
```

### Mock Data (Temporary)

Currently uses mock mandate and match score data:

```typescript
const mockMandate = {
  id: 1,
  title: 'Mock Mandate',
  requiredSectors: candidate.sectors.slice(0, 2),
  requiredFunctions: candidate.functions.slice(0, 2),
  requiredSkills: [],
};

const mockMatchScore = {
  candidate_id: candidate.id,
  mandate_id: 1,
  final_score: 0.7,
  sector_score: 0.8,
  function_score: 0.75,
  // ...
};
```

**Production TODO**: Replace with actual mandate context when viewing candidates for a specific search/mandate.

## UI Components Used

| Component | Purpose | Location |
|-----------|---------|----------|
| `Alert` + `AlertDescription` | High bias warning banner | Top of candidates list |
| `TooltipProvider` + `Tooltip` + `TooltipTrigger` + `TooltipContent` | Score breakdown on hover | Candidate name cells |
| `Badge` | Status and bias risk indicators | Table cells and detail panel |
| Progress bars (styled divs) | Score visualization | Tooltips and detail panel |

## User Workflow

1. **Browse candidates** - Quickly scan bias risk column for amber/yellow badges
2. **Hover for details** - See full score breakdown without clicking
3. **Notice alert** - Banner warns if any high-bias candidates are present
4. **Review in detail** - Click candidate to see full breakdown in side panel
5. **Make informed decisions** - Balance expertise match against affinity signals

## Color Coding Consistency

Throughout the UI:

- **Blue** = Expertise (domain fit, objective)
- **Amber/Yellow** = Similarity (affinity, subjective)
- **Green** = Reliability (source quality)
- **Status badges**:
  - Green = Active
  - Purple = Placed
  - Red = Withdrawn

## Next Steps

### Step 7: Admin Configuration UI
Add settings panel to adjust:
- Expertise weight (default: 0.4)
- Similarity weight (default: 0.1)
- Reliability weight (default: 0.1)
- Similarity dominance threshold (default: 0.15)

### Step 8: Automated Monitoring
Implement daily bias audit:
- Background job calling `runBiasAudit()`
- Log high-divergence events to `bias_events` table
- Email alerts for concerning trends
- Weekly reports showing bias metrics

### Production Integration
1. **Replace mock data** with actual mandate context from route/state
2. **Fetch real match scores** from `candidate_mandates` table
3. **Fetch source signals** from `candidate_source_signals` table
4. **Cache computed scores** in `candidate_bias_scores` table for performance
5. **Real-time updates** when sources are added/updated

## Testing

To test the bias alerts:

1. Navigate to `/candidates`
2. Observe the "Bias Risk" column (currently all candidates show mock scores)
3. Hover over candidate names to see tooltips
4. Click a candidate to see detailed breakdown in right panel
5. Look for the alert banner (appears when any candidate has high risk)

## Demo Pages

Three demo pages showcase the scoring system in isolation:

- `/intelligence/bias-demo` - Original comprehensive demo
- `/intelligence/scoring-demo` - Focused three-score system demo
- `/intelligence/integrated-demo` - Full integration with mock candidate data

These demos are useful for:
- Understanding the scoring algorithms
- Seeing side-by-side rankings (expertise-led vs similarity-led)
- Testing edge cases and calibration scenarios

## Documentation

- **Algorithm details**: `docs/bias_aware_scoring_flow.md`
- **Integration guide**: `docs/bias_aware_scoring_integration.md`
- **This document**: `docs/bias_alerts_ui_integration.md`
