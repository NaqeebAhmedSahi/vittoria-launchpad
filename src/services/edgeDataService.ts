/**
 * Edge Data Service
 * 
 * Read-only data layer for Edge (client-facing) views.
 * All data is redacted/sanitized - no internal notes, avoid lists, political risks, etc.
 * 
 * In production, this would query from secure RLS-protected views (edge_clients schema).
 */

export type ActivityBand = 'Low' | 'Medium' | 'High';
export type AlignmentBand = 'Emerging' | 'Moderate' | 'Strong';
export type HiringWindow = 'Quiet' | 'Selective' | 'Open';

export interface DealHeatData {
  sector: string;
  region: string;
  activityBand: ActivityBand;
  dealCount?: number; // Aggregated only
}

export interface PlatformType {
  id: string;
  name: string;
  description: string;
  exampleFirms: string[];
}

export interface StrategicTheme {
  id: string;
  theme: string;
  description: string;
}

export interface CandidateThemeAlignment {
  candidateId: string;
  candidateName: string; // Redacted or initials in prod
  themes: Array<{
    themeId: string;
    themeName: string;
    alignment: AlignmentBand;
  }>;
}

export interface MarketHiringPeriod {
  quarter: string;
  year: number;
  window: HiringWindow;
  description: string;
}

export interface DealStructureAggregation {
  dealType: string;
  count: number;
  sectors: string[];
  regions: string[];
}

export interface FirmArchetype {
  id: string;
  name: string;
  description: string;
  characteristics: string[];
}

// Mock data for Edge views

const mockDealHeat: DealHeatData[] = [
  { sector: 'Infrastructure', region: 'Europe', activityBand: 'High', dealCount: 24 },
  { sector: 'Infrastructure', region: 'North America', activityBand: 'Medium', dealCount: 18 },
  { sector: 'Real Estate', region: 'Europe', activityBand: 'Medium', dealCount: 15 },
  { sector: 'Credit', region: 'North America', activityBand: 'High', dealCount: 31 },
  { sector: 'Buyout', region: 'APAC', activityBand: 'Low', dealCount: 8 },
];

const mockPlatformTypes: PlatformType[] = [
  {
    id: 'pt-001',
    name: 'Global Banking Platforms',
    description: 'Large multinational investment banks with diversified product offerings.',
    exampleFirms: ['Goldman Sachs', 'JP Morgan', 'Morgan Stanley'],
  },
  {
    id: 'pt-002',
    name: 'Infrastructure Credit Funds',
    description: 'Specialized funds focused on infrastructure debt and credit investments.',
    exampleFirms: ['Barings', 'Allianz Capital Partners', 'PGIM'],
  },
  {
    id: 'pt-003',
    name: 'PE Sponsors (Mega-cap)',
    description: 'Large-cap private equity firms with significant AUM and global presence.',
    exampleFirms: ['Blackstone', 'KKR', 'Carlyle'],
  },
  {
    id: 'pt-004',
    name: 'Boutique Advisory',
    description: 'Specialized M&A and advisory firms with sector-specific expertise.',
    exampleFirms: ['Lazard', 'Rothschild', 'Evercore'],
  },
];

const mockStrategicThemes: StrategicTheme[] = [
  { id: 'theme-001', theme: 'ESG Integration', description: 'Environmental, social, and governance considerations in investment strategy' },
  { id: 'theme-002', theme: 'Digital Infrastructure', description: 'Data centers, fiber networks, and telecommunications assets' },
  { id: 'theme-003', theme: 'Energy Transition', description: 'Renewable energy and clean technology investments' },
  { id: 'theme-004', theme: 'Healthcare Real Assets', description: 'Senior living, hospitals, and healthcare facilities' },
];

const mockCandidateAlignments: CandidateThemeAlignment[] = [
  {
    candidateId: 'c-001',
    candidateName: 'J.P.', // Redacted initials
    themes: [
      { themeId: 'theme-001', themeName: 'ESG Integration', alignment: 'Strong' },
      { themeId: 'theme-002', themeName: 'Digital Infrastructure', alignment: 'Moderate' },
      { themeId: 'theme-003', themeName: 'Energy Transition', alignment: 'Emerging' },
    ],
  },
  {
    candidateId: 'c-002',
    candidateName: 'S.C.',
    themes: [
      { themeId: 'theme-002', themeName: 'Digital Infrastructure', alignment: 'Strong' },
      { themeId: 'theme-003', themeName: 'Energy Transition', alignment: 'Strong' },
      { themeId: 'theme-001', themeName: 'ESG Integration', alignment: 'Moderate' },
    ],
  },
];

const mockHiringWindows: MarketHiringPeriod[] = [
  { quarter: 'Q4', year: 2025, window: 'Selective', description: 'Year-end slowdown with selective senior hiring' },
  { quarter: 'Q1', year: 2026, window: 'Open', description: 'Strong start to year with multiple active searches' },
  { quarter: 'Q2', year: 2026, window: 'Open', description: 'Continued strong hiring appetite' },
  { quarter: 'Q3', year: 2026, window: 'Quiet', description: 'Summer lull, hiring slows' },
];

const mockDealStructures: DealStructureAggregation[] = [
  { dealType: 'Primary Financing', count: 42, sectors: ['Infrastructure', 'Real Estate'], regions: ['Europe', 'North America'] },
  { dealType: 'Refinancing', count: 28, sectors: ['Infrastructure', 'Credit'], regions: ['Europe', 'APAC'] },
  { dealType: 'M&A Financing', count: 35, sectors: ['Buyout', 'Growth Equity'], regions: ['North America'] },
  { dealType: 'Portfolio Company', count: 19, sectors: ['Infrastructure'], regions: ['Europe'] },
];

const mockFirmArchetypes: FirmArchetype[] = [
  {
    id: 'arch-001',
    name: 'Global Platform',
    description: 'Large, diversified financial institutions with global reach',
    characteristics: ['Multi-product', 'Global footprint', 'Deep resources', 'Complex hierarchy'],
  },
  {
    id: 'arch-002',
    name: 'Boutique Specialist',
    description: 'Focused firms with deep sector or product expertise',
    characteristics: ['Specialized focus', 'Senior-led', 'Entrepreneurial', 'Client-centric'],
  },
  {
    id: 'arch-003',
    name: 'Sponsor-Backed',
    description: 'Firms with private equity or institutional backing',
    characteristics: ['Growth-focused', 'Well-capitalized', 'Expansion mode', 'Performance-driven'],
  },
  {
    id: 'arch-004',
    name: 'Regional Leader',
    description: 'Dominant players within specific geographic markets',
    characteristics: ['Local expertise', 'Strong networks', 'Market leaders', 'Stable platforms'],
  },
];

export class EdgeDataService {
  /**
   * Get deal heat index data (aggregated activity by sector/region)
   */
  static getDealHeatIndex(): DealHeatData[] {
    // TODO: Query from edge_clients.deal_heat_view
    return mockDealHeat;
  }

  /**
   * Get platform types for talent ecosystem map
   */
  static getPlatformTypes(): PlatformType[] {
    // TODO: Query from edge_clients.platform_types_view
    return mockPlatformTypes;
  }

  /**
   * Get strategic themes
   */
  static getStrategicThemes(): StrategicTheme[] {
    // TODO: Query from edge_clients.strategic_themes_view
    return mockStrategicThemes;
  }

  /**
   * Get candidate-theme alignments (redacted, banded)
   */
  static getCandidateThemeAlignments(shortlistId?: string): CandidateThemeAlignment[] {
    // TODO: Query from edge_clients.theme_alignment_view with RLS
    // Filter by shortlistId if provided
    return mockCandidateAlignments;
  }

  /**
   * Get market hiring window data
   */
  static getHiringWindows(): MarketHiringPeriod[] {
    // TODO: Query from edge_clients.hiring_window_view
    return mockHiringWindows;
  }

  /**
   * Get deal structure aggregations
   */
  static getDealStructures(): DealStructureAggregation[] {
    // TODO: Query from edge_clients.deal_structure_view
    return mockDealStructures;
  }

  /**
   * Get firm archetypes (public-safe)
   */
  static getFirmArchetypes(): FirmArchetype[] {
    // TODO: Query from edge_clients.firm_archetypes_view
    return mockFirmArchetypes;
  }
}
