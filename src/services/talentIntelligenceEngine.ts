/**
 * Talent Intelligence Engine
 * 
 * Provides intelligence outputs for candidates, mandates, firms, and market-level insights.
 * Uses mock data for now - replace with real intelligence modules later.
 */

export type IntelligenceScope = 'candidate' | 'mandate' | 'firm' | 'desk' | 'market' | 'finance';
export type IntelligenceSeverity = 'low' | 'medium' | 'high';

export interface IntelligenceOutput {
  id: string;
  moduleName: string;
  scope: IntelligenceScope;
  severity?: IntelligenceSeverity;
  title: string;
  summary: string;
  score?: number; // 0–100
  confidence: number; // 0–100
  createdAt: string;
  tags?: string[];
  details?: Record<string, any>;
}

// Mock intelligence modules
const mockCandidateInsights: IntelligenceOutput[] = [
  {
    id: 'ci-001',
    moduleName: 'candidate_fit_matrix',
    scope: 'candidate',
    severity: 'high',
    title: 'Strong Fit for Infrastructure PE',
    summary: 'Candidate shows exceptional alignment with infrastructure private equity roles based on sector experience and technical skills.',
    score: 87,
    confidence: 92,
    createdAt: new Date().toISOString(),
    tags: ['fit', 'infrastructure', 'pe'],
  },
  {
    id: 'ci-002',
    moduleName: 'risk_assessment',
    scope: 'candidate',
    severity: 'low',
    title: 'Low Flight Risk',
    summary: 'Candidate exhibits strong loyalty indicators and limited external market activity.',
    score: 15,
    confidence: 78,
    createdAt: new Date().toISOString(),
    tags: ['risk', 'retention'],
  },
  {
    id: 'ci-003',
    moduleName: 'cultural_alignment',
    scope: 'candidate',
    severity: 'medium',
    title: 'Moderate Cultural Fit',
    summary: 'Candidate aligns with collaborative culture but may struggle with highly hierarchical environments.',
    score: 62,
    confidence: 85,
    createdAt: new Date().toISOString(),
    tags: ['culture', 'fit'],
  },
];

const mockMandateInsights: IntelligenceOutput[] = [
  {
    id: 'mi-001',
    moduleName: 'market_mapping',
    scope: 'mandate',
    severity: 'high',
    title: 'High Market Demand',
    summary: 'Infrastructure PE Partner roles are experiencing elevated demand with limited qualified candidates.',
    score: 91,
    confidence: 88,
    createdAt: new Date().toISOString(),
    tags: ['market', 'demand'],
  },
  {
    id: 'mi-002',
    moduleName: 'compensation_benchmark',
    scope: 'mandate',
    severity: 'medium',
    title: 'Competitive Compensation Range',
    summary: 'Offered compensation is within market range but at lower quartile. Consider uplift for top candidates.',
    score: 68,
    confidence: 94,
    createdAt: new Date().toISOString(),
    tags: ['compensation', 'benchmark'],
  },
  {
    id: 'mi-003',
    moduleName: 'urgency_detector',
    scope: 'mandate',
    severity: 'high',
    title: 'High Urgency - Q1 Deadline',
    summary: 'Mandate flagged as high priority with Q1 start date requirement.',
    score: 92,
    confidence: 100,
    createdAt: new Date().toISOString(),
    tags: ['urgency', 'timeline'],
  },
];

const mockFirmInsights: IntelligenceOutput[] = [
  {
    id: 'fi-001',
    moduleName: 'firm_growth_trajectory',
    scope: 'firm',
    severity: 'high',
    title: 'Rapid Growth Phase',
    summary: 'Firm has hired 8+ senior professionals in past 12 months, indicating expansion.',
    score: 85,
    confidence: 91,
    createdAt: new Date().toISOString(),
    tags: ['growth', 'expansion'],
  },
  {
    id: 'fi-002',
    moduleName: 'desk_health',
    scope: 'desk',
    severity: 'medium',
    title: 'Infrastructure Desk - Healthy',
    summary: 'Infrastructure desk shows strong deal flow and stable team composition.',
    score: 78,
    confidence: 82,
    createdAt: new Date().toISOString(),
    tags: ['desk', 'health'],
  },
];

const mockMarketInsights: IntelligenceOutput[] = [
  {
    id: 'mk-001',
    moduleName: 'sector_heat',
    scope: 'market',
    severity: 'high',
    title: 'Infrastructure PE - Hot Sector',
    summary: 'Infrastructure private equity showing highest activity across all tracked sectors.',
    score: 94,
    confidence: 96,
    createdAt: new Date().toISOString(),
    tags: ['sector', 'heat', 'infrastructure'],
  },
  {
    id: 'mk-002',
    moduleName: 'macro_trends',
    scope: 'market',
    severity: 'medium',
    title: 'ESG Focus Increasing',
    summary: 'ESG-related mandates up 40% YoY, creating new talent requirements.',
    score: 72,
    confidence: 88,
    createdAt: new Date().toISOString(),
    tags: ['macro', 'esg', 'trends'],
  },
];

export class TalentIntelligenceEngine {
  /**
   * Get intelligence outputs for a specific candidate
   */
  static getCandidateIntelligence(candidateId: string): IntelligenceOutput[] {
    // TODO: Replace with real intelligence modules querying candidate data
    return mockCandidateInsights;
  }

  /**
   * Get intelligence outputs for a specific mandate
   */
  static getMandateIntelligence(mandateId: string): IntelligenceOutput[] {
    // TODO: Replace with real intelligence modules querying mandate data
    return mockMandateInsights;
  }

  /**
   * Get intelligence outputs for a specific firm
   */
  static getFirmIntelligence(firmId: string): IntelligenceOutput[] {
    // TODO: Replace with real intelligence modules querying firm data
    return mockFirmInsights;
  }

  /**
   * Get intelligence outputs for a specific desk
   */
  static getDeskIntelligence(deskId: string): IntelligenceOutput[] {
    // TODO: Replace with real intelligence modules querying desk data
    return mockFirmInsights.filter(i => i.scope === 'desk');
  }

  /**
   * Get market-level intelligence
   */
  static getMarketIntelligence(): IntelligenceOutput[] {
    // TODO: Replace with real intelligence modules analyzing market data
    return mockMarketInsights;
  }

  /**
   * Get all intelligence filtered by module
   */
  static getIntelligenceByModule(moduleName: string): IntelligenceOutput[] {
    const all = [
      ...mockCandidateInsights,
      ...mockMandateInsights,
      ...mockFirmInsights,
      ...mockMarketInsights,
    ];
    return all.filter(i => i.moduleName === moduleName);
  }

  /**
   * Get top opportunities across all candidates
   */
  static getTopCandidateOpportunities(limit: number = 10): IntelligenceOutput[] {
    // TODO: Query all candidates and return highest-scoring opportunities
    return mockCandidateInsights
      .filter(i => i.severity === 'high')
      .slice(0, limit);
  }

  /**
   * Get top risks across all mandates
   */
  static getTopMandateRisks(limit: number = 10): IntelligenceOutput[] {
    // TODO: Query all mandates and return highest-risk items
    return mockMandateInsights
      .filter(i => i.severity === 'high')
      .slice(0, limit);
  }

  /**
   * Get available intelligence modules
   */
  static getAvailableModules(): string[] {
    return [
      'candidate_fit_matrix',
      'risk_assessment',
      'cultural_alignment',
      'market_mapping',
      'compensation_benchmark',
      'urgency_detector',
      'firm_growth_trajectory',
      'desk_health',
      'sector_heat',
      'macro_trends',
    ];
  }
}
