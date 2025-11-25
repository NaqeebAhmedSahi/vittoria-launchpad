# Similarity Score System - Frontend Documentation

## Overview

The Similarity Score system measures how closely sources align with your organization's historical usage patterns. This helps identify which sources match your proven patterns and reduces bias in decision-making.

## 🎯 Features Implemented

### 1. **Data Management Pages**
- **Source Management** (`/admin/sources/manage`) - Add/edit source records
- **Source Directory** (`/admin/sources`) - Browse all sources with similarity scores
- **Bulk Tagging** (`/admin/sources/tagging`) - Update metadata for multiple sources
- **Historical Import** (`/admin/similarity/import-history`) - Bootstrap organizational pattern from CSV/Excel

### 2. **Analysis Pages**
- **Source Detail** (`/admin/sources/:id`) - Deep dive into individual source similarity
- **Org Pattern Overview** (`/admin/similarity/org-pattern`) - Visualize historical usage patterns
- **Mandate Similarity Debug** (`/admin/mandates/:id/similarity`) - See sources used per mandate

### 3. **Feedback Pages**
- **Mandate Feedback** (`/mandates/:id/feedback`) - Link sources to candidate evaluations

## 📁 File Structure

```
src/
├── types/
│   └── similarity.ts           # All TypeScript interfaces and types
├── mocks/
│   └── similarityData.ts       # Mock data generators and utilities
├── pages/
│   ├── SourceManagement.tsx    # Page A: Create/edit sources
│   ├── SourceDirectory.tsx     # Page E: Source listing
│   ├── SourceDetail.tsx        # Page F: Individual source details
│   ├── SourceTagging.tsx       # Page B: Bulk metadata editor
│   ├── HistoricalImport.tsx    # Page C: CSV/Excel import
│   ├── MandateFeedback.tsx     # Page D: Source attribution
│   ├── OrgPatternOverview.tsx  # Page G: Org pattern visualization
│   └── MandateSimilarityDebug.tsx  # Page H: Mandate source analysis
```

## 🔧 Key Types

### Source Entity
```typescript
interface Source {
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
```

### Similarity Profile
```typescript
interface SourceSimilarityProfile {
  source_id: string;
  similarity_score: number;  // 0-1
  components: {
    role_similarity: number;
    industry_similarity: number;
    pattern_similarity: number;
    interaction_similarity: number;
  };
  last_calculated_at: string;
}
```

### Organization Pattern
```typescript
interface OrgPatternProfile {
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
```

## 🎨 UI Components Used

All pages use shadcn/ui components:
- `Card`, `CardHeader`, `CardTitle`, `CardContent`, `CardDescription`
- `Button`, `Input`, `Label`, `Textarea`
- `Select`, `SelectTrigger`, `SelectValue`, `SelectContent`, `SelectItem`
- `Badge`, `Progress`, `Checkbox`
- `Table`, `TableHeader`, `TableBody`, `TableRow`, `TableCell`
- `Alert`, `AlertDescription`

## 🚀 Navigation

The system is accessible via the **Sources** menu in the sidebar:
- Source Directory
- Add Source
- Bulk Tagging
- Org Pattern
- Import History

## 📊 Mock Data

Currently using 8 mock sources with:
- Realistic similarity scores (0.71 - 0.92)
- Diverse roles (Partner, MD, Principal, VP, etc.)
- Multiple sectors (Technology, Healthcare, Financial Services, etc.)
- Global geographies (North America, Europe, Asia, etc.)
- Complete interaction histories

## 🔄 Data Flow (Future Backend Integration)

### 1. Source Creation Flow
```
User Input → CreateSourceRequest → Backend API → Database → Source Entity
```

### 2. Similarity Calculation Flow
```
Source Data → Pattern Comparison → Component Scores → Overall Score → Profile
```

### 3. Feedback Loop
```
User Feedback → Recommendation Event → Historical Pattern Update → Recalculate Scores
```

## 🎯 Similarity Score Components

Each source gets 4 component scores:

1. **Role Similarity** (30% weight)
   - Matches source role to org's typical roles

2. **Industry Similarity** (30% weight)
   - Compares source sectors to org's industry focus

3. **Pattern Similarity** (20% weight)
   - Analyzes how source fits overall historical patterns

4. **Interaction Similarity** (20% weight)
   - Based on historical usage frequency and success

## 🎨 Color Coding

Similarity scores use intuitive color coding:
- **Green (≥80%)**: High alignment with org pattern
- **Blue (60-79%)**: Good alignment
- **Yellow (40-59%)**: Moderate alignment
- **Red (<40%)**: Low alignment

## 📈 Next Steps (Backend Integration)

1. **Database Schema**
   - `sources` table
   - `source_similarity_profiles` table
   - `org_pattern_profiles` table
   - `source_interaction_events` table
   - `recommendation_events` table

2. **API Endpoints**
   ```
   POST   /api/sources
   GET    /api/sources
   GET    /api/sources/:id
   PUT    /api/sources/:id
   DELETE /api/sources/:id
   POST   /api/sources/bulk-update
   POST   /api/sources/import-history
   GET    /api/similarity/org-pattern
   POST   /api/similarity/calculate
   POST   /api/mandates/:id/feedback
   GET    /api/mandates/:id/similarity
   ```

3. **Background Jobs**
   - Daily similarity score recalculation
   - Pattern profile updates
   - Historical data aggregation

4. **Analytics Integration**
   - Track source effectiveness over time
   - Identify patterns in successful placements
   - Generate bias detection alerts

## 🧪 Testing the Frontend

1. Navigate to `/admin/sources` to see the source directory
2. Click "Add Source" to create a new source
3. View individual sources to see similarity breakdowns
4. Use "Bulk Tagging" to update multiple sources at once
5. Check "Org Pattern" to see your historical distribution
6. Try "Import History" to upload CSV data (mock for now)

## 🎓 Key Concepts

### What is Similarity Scoring?
Compares new sources to your organization's historical pattern to identify alignment and reduce bias.

### Why Track Sources?
- Understand which sources provide valuable recommendations
- Build data-driven confidence in decision-making
- Reduce reliance on affinity bias

### How Does Pattern Learning Work?
The system learns from every interaction:
- Each recommendation event updates the pattern
- Sources are compared to this evolving baseline
- Higher similarity = better alignment with proven patterns

## 📝 Schema Reference

See `src/types/similarity.ts` for complete type definitions.

All schemas follow the specification document exactly, with TypeScript types matching the interface contracts.

---

**Status**: ✅ Frontend Complete - Ready for backend integration  
**Last Updated**: November 23, 2025
