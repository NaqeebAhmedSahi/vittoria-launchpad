import {
  BiasScoredCandidate,
  BiasDecisionLog,
  WeeklyBiasSummary,
  SourceAttribution,
  RankingDivergence,
} from '@/types/biasIntelligence';

// Mock candidates with bias scoring
const mockBiasCandidates: Record<string, BiasScoredCandidate[]> = {
  'mandate-1': [
    {
      id: 'c1',
      name: 'Alexandra Pierce',
      overallScore: 92,
      expertiseScore: 94,
      similarityScore: 76,
      reliabilityScore: 88,
      biasRisk: 'low',
      expertiseRank: 1,
      similarityRank: 3,
      reasoning: 'This ranking is expertise led. Similarity signals (shared firm history) nudged this candidate up by 2 points but did not override domain expertise.',
    },
    {
      id: 'c2',
      name: 'Marcus Chen',
      overallScore: 89,
      expertiseScore: 85,
      similarityScore: 92,
      reliabilityScore: 86,
      biasRisk: 'moderate',
      expertiseRank: 2,
      similarityRank: 1,
      reasoning: 'Similarity pressure is higher than expertise. Strong shared background at Goldman Sachs contributed +7 points. Review reasoning before sharing with clients.',
    },
    {
      id: 'c3',
      name: 'Sarah Thompson',
      overallScore: 85,
      expertiseScore: 91,
      similarityScore: 68,
      reliabilityScore: 82,
      biasRisk: 'low',
      expertiseRank: 3,
      similarityRank: 4,
      reasoning: 'Pure expertise driven ranking. No significant similarity boost detected.',
    },
    {
      id: 'c4',
      name: 'David Okonkwo',
      overallScore: 81,
      expertiseScore: 79,
      similarityScore: 88,
      reliabilityScore: 80,
      biasRisk: 'high',
      expertiseRank: 4,
      similarityRank: 2,
      reasoning: 'High similarity influence detected. Candidate moved from rank 4 to rank 2 in similarity view due to prior team connections and shared deal experience.',
    },
    {
      id: 'c5',
      name: 'Emily Rodriguez',
      overallScore: 78,
      expertiseScore: 82,
      similarityScore: 65,
      reliabilityScore: 76,
      biasRisk: 'low',
      expertiseRank: 5,
      similarityRank: 5,
      reasoning: 'Consistent expertise led ranking with minimal similarity impact.',
    },
  ],
};

// Mock source attributions
const mockSourceAttributions: Record<string, SourceAttribution[]> = {
  'insight-1': [
    {
      id: 'src-1',
      type: 'cv',
      label: 'CV Parser - Infrastructure Experience',
      reasoningBasis: 'expertise-led',
      expertiseScore: 94,
      similarityScore: 45,
      reliabilityScore: 92,
    },
    {
      id: 'src-2',
      type: 'notes',
      label: 'Mandate Notes - Sector Requirements',
      reasoningBasis: 'expertise-led',
      expertiseScore: 88,
      similarityScore: 52,
      reliabilityScore: 85,
    },
    {
      id: 'src-3',
      type: 'voice',
      label: 'Voice Note - Client Preferences',
      reasoningBasis: 'similarity-heavy',
      expertiseScore: 62,
      similarityScore: 91,
      reliabilityScore: 78,
    },
    {
      id: 'src-4',
      type: 'market',
      label: 'Market Feed - Comparable Placements',
      reasoningBasis: 'mixed',
      expertiseScore: 76,
      similarityScore: 74,
      reliabilityScore: 82,
    },
  ],
};

// Mock bias decision logs
const mockBiasDecisionLogs: BiasDecisionLog[] = [
  {
    id: 'bd-1',
    mandateId: 'mandate-1',
    mandateName: 'Infrastructure PE Partner - Europe',
    sector: 'Infrastructure',
    timestamp: new Date().toISOString(),
    biasRiskLevel: 'moderate',
    divergenceScore: 2.4,
    affectedCandidates: 2,
  },
  {
    id: 'bd-2',
    mandateId: 'mandate-2',
    mandateName: 'Credit Fund VP - North America',
    sector: 'Credit',
    timestamp: new Date(Date.now() - 86400000).toISOString(),
    biasRiskLevel: 'high',
    divergenceScore: 3.8,
    affectedCandidates: 3,
  },
  {
    id: 'bd-3',
    mandateId: 'mandate-3',
    mandateName: 'Real Estate Director - APAC',
    sector: 'Real Estate',
    timestamp: new Date(Date.now() - 172800000).toISOString(),
    biasRiskLevel: 'low',
    divergenceScore: 0.8,
    affectedCandidates: 1,
  },
];

// Mock weekly summaries
const mockWeeklySummaries: Record<string, WeeklyBiasSummary> = {
  'week-current': {
    weekId: 'week-current',
    weekLabel: 'Current week',
    highRiskDecisions: 8,
    affectedMandates: 5,
    topSimilarityDriver: 'Shared firm background',
    avgDivergence: 2.3,
    mandateBreakdown: [
      {
        mandateId: 'mandate-1',
        mandateName: 'Infrastructure PE Partner - Europe',
        sector: 'Infrastructure',
        highBiasEvents: 3,
        avgDivergence: 2.4,
      },
      {
        mandateId: 'mandate-2',
        mandateName: 'Credit Fund VP - North America',
        sector: 'Credit',
        highBiasEvents: 2,
        avgDivergence: 3.8,
      },
      {
        mandateId: 'mandate-4',
        mandateName: 'Buyout Principal - Europe',
        sector: 'Buyout',
        highBiasEvents: 3,
        avgDivergence: 2.1,
      },
    ],
    sourceTypeBreakdown: [
      {
        sourceType: 'Voice Notes',
        similarityHeavyCount: 12,
        comment: 'Voice notes on infrastructure mandates often reference shared background. Consider tightening prompts.',
      },
      {
        sourceType: 'Client Preferences',
        similarityHeavyCount: 8,
        comment: 'Client expressed preferences sometimes emphasize prior relationships over expertise.',
      },
      {
        sourceType: 'Market Feed',
        similarityHeavyCount: 4,
        comment: 'Market data about comparable placements can introduce similarity bias through pattern matching.',
      },
    ],
  },
  'week-last': {
    weekId: 'week-last',
    weekLabel: 'Last week',
    highRiskDecisions: 6,
    affectedMandates: 4,
    topSimilarityDriver: 'Prior team connections',
    avgDivergence: 1.9,
    mandateBreakdown: [
      {
        mandateId: 'mandate-5',
        mandateName: 'ESG Investment Director',
        sector: 'ESG',
        highBiasEvents: 2,
        avgDivergence: 2.2,
      },
      {
        mandateId: 'mandate-6',
        mandateName: 'Healthcare Real Assets VP',
        sector: 'Healthcare',
        highBiasEvents: 4,
        avgDivergence: 1.6,
      },
    ],
    sourceTypeBreakdown: [
      {
        sourceType: 'Voice Notes',
        similarityHeavyCount: 9,
        comment: 'Reduced similarity heavy decisions compared to current week.',
      },
      {
        sourceType: 'Client Preferences',
        similarityHeavyCount: 6,
        comment: 'Client preferences showed better balance between expertise and relationships.',
      },
    ],
  },
  'week-two-ago': {
    weekId: 'week-two-ago',
    weekLabel: 'Two weeks ago',
    highRiskDecisions: 4,
    affectedMandates: 3,
    topSimilarityDriver: 'Shared deal experience',
    avgDivergence: 1.5,
    mandateBreakdown: [
      {
        mandateId: 'mandate-7',
        mandateName: 'Digital Infrastructure Lead',
        sector: 'Infrastructure',
        highBiasEvents: 2,
        avgDivergence: 1.4,
      },
      {
        mandateId: 'mandate-8',
        mandateName: 'Energy Transition Partner',
        sector: 'Energy',
        highBiasEvents: 2,
        avgDivergence: 1.6,
      },
    ],
    sourceTypeBreakdown: [
      {
        sourceType: 'Voice Notes',
        similarityHeavyCount: 5,
        comment: 'Low similarity bias period with strong expertise focus.',
      },
      {
        sourceType: 'Market Feed',
        similarityHeavyCount: 3,
        comment: 'Market data used appropriately for context rather than ranking.',
      },
    ],
  },
};

// Export functions
export function getBiasScoredCandidates(mandateId: string): BiasScoredCandidate[] {
  return mockBiasCandidates[mandateId] || mockBiasCandidates['mandate-1'];
}

export function getSourceAttributions(insightId: string): SourceAttribution[] {
  return mockSourceAttributions[insightId] || mockSourceAttributions['insight-1'];
}

export function getBiasDecisionLog(mandateId?: string): BiasDecisionLog[] {
  if (mandateId) {
    return mockBiasDecisionLogs.filter(log => log.mandateId === mandateId);
  }
  return mockBiasDecisionLogs;
}

export function getWeeklyBiasSummary(weekId: string): WeeklyBiasSummary {
  return mockWeeklySummaries[weekId] || mockWeeklySummaries['week-current'];
}

export function getRankingDivergence(candidates: BiasScoredCandidate[]): RankingDivergence[] {
  return candidates.map(c => ({
    candidateId: c.id,
    candidateName: c.name,
    expertiseRank: c.expertiseRank,
    similarityRank: c.similarityRank,
    movement: c.similarityRank - c.expertiseRank,
  })).sort((a, b) => Math.abs(b.movement) - Math.abs(a.movement));
}
