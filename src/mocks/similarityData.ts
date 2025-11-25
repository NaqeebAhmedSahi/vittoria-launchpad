// ============================================
// Similarity Score System - Mock Data
// ============================================

import {
  Source,
  SourceSimilarityProfile,
  OrgPatternProfile,
  SourceListItem,
  SourceDetailResponse,
  InteractionHistoryItem,
  MandateSimilarityContext,
  RecommendationEvent,
  SourceInteractionEvent,
  SimilarityComponents,
} from "@/types/similarity";

// --------------------------------------------
// Mock Sources
// --------------------------------------------
export const mockSources: Source[] = [
  {
    id: "src-001",
    name: "Sarah Chen",
    email: "sarah.chen@techventures.com",
    role: "Partner",
    organisation: "TechVentures Capital",
    sectors: ["Technology", "SaaS", "AI/ML"],
    geographies: ["North America", "Europe"],
    seniority_level: "Partner",
    created_at: "2024-01-15T10:00:00Z",
    updated_at: "2024-11-20T14:30:00Z",
  },
  {
    id: "src-002",
    name: "Marcus Williams",
    email: "m.williams@globalpe.com",
    role: "Managing Director",
    organisation: "Global Private Equity",
    sectors: ["Healthcare", "Biotech", "Life Sciences"],
    geographies: ["North America", "Asia"],
    seniority_level: "Managing Director",
    created_at: "2024-02-10T09:00:00Z",
    updated_at: "2024-11-18T16:45:00Z",
  },
  {
    id: "src-003",
    name: "Elena Rodriguez",
    email: "elena.r@innovatefund.com",
    role: "Principal",
    organisation: "Innovate Growth Fund",
    sectors: ["Consumer", "Retail", "E-commerce"],
    geographies: ["Europe", "Latin America"],
    seniority_level: "Principal",
    created_at: "2024-03-05T11:30:00Z",
    updated_at: "2024-11-22T10:15:00Z",
  },
  {
    id: "src-004",
    name: "James Anderson",
    email: "j.anderson@strategicvc.com",
    role: "Senior Associate",
    organisation: "Strategic Venture Capital",
    sectors: ["Technology", "Fintech", "Enterprise Software"],
    geographies: ["North America"],
    seniority_level: "Senior Associate",
    created_at: "2024-04-12T08:00:00Z",
    updated_at: "2024-11-19T13:20:00Z",
  },
  {
    id: "src-005",
    name: "Priya Sharma",
    email: "priya.sharma@asiacapital.com",
    role: "Vice President",
    organisation: "Asia Capital Partners",
    sectors: ["Technology", "Manufacturing", "Logistics"],
    geographies: ["Asia", "Middle East"],
    seniority_level: "Vice President",
    created_at: "2024-05-20T12:00:00Z",
    updated_at: "2024-11-21T09:30:00Z",
  },
  {
    id: "src-006",
    name: "David Thompson",
    email: "d.thompson@infrastructurefund.com",
    role: "Partner",
    organisation: "Infrastructure Growth Fund",
    sectors: ["Infrastructure", "Energy", "Utilities"],
    geographies: ["Europe", "Australia"],
    seniority_level: "Partner",
    created_at: "2024-06-08T14:00:00Z",
    updated_at: "2024-11-17T11:00:00Z",
  },
  {
    id: "src-007",
    name: "Aisha Mohammed",
    email: "aisha.m@emergingmarkets.com",
    role: "Managing Director",
    organisation: "Emerging Markets Equity",
    sectors: ["Financial Services", "Banking", "Insurance"],
    geographies: ["Middle East", "Africa"],
    seniority_level: "Managing Director",
    created_at: "2024-07-15T10:30:00Z",
    updated_at: "2024-11-20T15:45:00Z",
  },
  {
    id: "src-008",
    name: "Thomas Mueller",
    email: "t.mueller@europegrowth.de",
    role: "Principal",
    organisation: "Europe Growth Partners",
    sectors: ["Industrial", "Manufacturing", "Automotive"],
    geographies: ["Europe"],
    seniority_level: "Principal",
    created_at: "2024-08-22T09:15:00Z",
    updated_at: "2024-11-18T12:30:00Z",
  },
];

// --------------------------------------------
// Mock Similarity Components
// --------------------------------------------
function generateSimilarityComponents(): SimilarityComponents {
  return {
    role_similarity: Math.random() * 0.3 + 0.7, // 0.7-1.0
    industry_similarity: Math.random() * 0.4 + 0.5, // 0.5-0.9
    pattern_similarity: Math.random() * 0.5 + 0.4, // 0.4-0.9
    interaction_similarity: Math.random() * 0.3 + 0.6, // 0.6-0.9
  };
}

function calculateOverallScore(components: SimilarityComponents): number {
  return (
    components.role_similarity * 0.3 +
    components.industry_similarity * 0.3 +
    components.pattern_similarity * 0.2 +
    components.interaction_similarity * 0.2
  );
}

// --------------------------------------------
// Mock Similarity Profiles
// --------------------------------------------
export const mockSimilarityProfiles: Record<string, SourceSimilarityProfile> = {};

mockSources.forEach((source) => {
  const components = generateSimilarityComponents();
  mockSimilarityProfiles[source.id] = {
    source_id: source.id,
    similarity_score: calculateOverallScore(components),
    components,
    last_calculated_at: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toISOString(),
  };
});

// Manual adjustments for specific examples
mockSimilarityProfiles["src-001"].similarity_score = 0.92;
mockSimilarityProfiles["src-002"].similarity_score = 0.85;
mockSimilarityProfiles["src-003"].similarity_score = 0.78;
mockSimilarityProfiles["src-004"].similarity_score = 0.71;
mockSimilarityProfiles["src-005"].similarity_score = 0.88;

// --------------------------------------------
// Mock Organisation Pattern
// --------------------------------------------
export const mockOrgPattern: OrgPatternProfile = {
  id: "org-pattern-001",
  roles_distribution: {
    Partner: 28,
    "Managing Director": 22,
    Principal: 18,
    "Vice President": 15,
    "Senior Associate": 12,
    Associate: 5,
  },
  industry_distribution: {
    Technology: 35,
    Healthcare: 18,
    "Financial Services": 15,
    Consumer: 12,
    Infrastructure: 8,
    Industrial: 7,
    Energy: 5,
  },
  geography_distribution: {
    "North America": 42,
    Europe: 28,
    Asia: 18,
    "Middle East": 7,
    "Latin America": 3,
    Africa: 2,
  },
  seniority_distribution: {
    Partner: 30,
    "Managing Director": 25,
    Principal: 20,
    "Vice President": 15,
    "Senior Associate": 8,
    Associate: 2,
  },
  interaction_stats: {
    total_sources: 156,
    total_interactions: 1843,
    avg_interactions_per_source: 11.8,
  },
  last_updated_at: "2024-11-23T08:00:00Z",
};

// --------------------------------------------
// Mock Interaction History
// --------------------------------------------
export const mockInteractionHistory: Record<string, InteractionHistoryItem[]> = {
  "src-001": [
    {
      id: "int-001",
      mandate_id: "mnd-001",
      mandate_title: "VP Engineering - Series B SaaS",
      event_type: "used_in_final_decision",
      timestamp: "2024-11-15T14:30:00Z",
    },
    {
      id: "int-002",
      mandate_id: "mnd-003",
      mandate_title: "CTO - AI/ML Startup",
      event_type: "used_in_shortlist",
      timestamp: "2024-11-10T09:15:00Z",
    },
    {
      id: "int-003",
      mandate_id: "mnd-005",
      mandate_title: "Head of Product - Enterprise SaaS",
      event_type: "insight_viewed",
      timestamp: "2024-11-05T16:45:00Z",
    },
  ],
  "src-002": [
    {
      id: "int-004",
      mandate_id: "mnd-002",
      mandate_title: "Chief Medical Officer - Biotech",
      event_type: "used_in_final_decision",
      timestamp: "2024-11-18T11:00:00Z",
    },
    {
      id: "int-005",
      mandate_id: "mnd-004",
      mandate_title: "VP Clinical Development",
      event_type: "used_in_shortlist",
      timestamp: "2024-11-12T13:30:00Z",
    },
  ],
  "src-003": [
    {
      id: "int-006",
      mandate_id: "mnd-006",
      mandate_title: "VP E-commerce - Retail Brand",
      event_type: "insight_viewed",
      timestamp: "2024-11-20T10:00:00Z",
    },
  ],
};

// --------------------------------------------
// Mock Source List Items (Page E)
// --------------------------------------------
export function getMockSourceListItems(): SourceListItem[] {
  return mockSources.map((source) => ({
    source,
    similarity_profile: mockSimilarityProfiles[source.id] || null,
    last_interaction_at:
      mockInteractionHistory[source.id]?.[0]?.timestamp || null,
  }));
}

// --------------------------------------------
// Mock Source Detail (Page F)
// --------------------------------------------
export function getMockSourceDetail(sourceId: string): SourceDetailResponse | null {
  const source = mockSources.find((s) => s.id === sourceId);
  if (!source) return null;

  return {
    source,
    similarity_profile: mockSimilarityProfiles[sourceId] || null,
    org_pattern: mockOrgPattern,
    interaction_history: mockInteractionHistory[sourceId] || [],
  };
}

// --------------------------------------------
// Mock Mandate Similarity Context (Page H)
// --------------------------------------------
export function getMockMandateSimilarityContext(mandateId: string): MandateSimilarityContext {
  // Use first 4 sources for the mandate
  const sources = mockSources.slice(0, 4).map((source, idx) => ({
    source,
    similarity_profile: mockSimilarityProfiles[source.id],
    used_in_shortlist: idx < 3,
    used_in_final_decision: idx < 2,
  }));

  return {
    mandate_id: mandateId,
    mandate_title: "VP Engineering - Series B SaaS",
    created_at: "2024-10-15T10:00:00Z",
    sources,
  };
}

// --------------------------------------------
// Mock Recommendation Events
// --------------------------------------------
export const mockRecommendationEvents: RecommendationEvent[] = [
  {
    id: "rec-001",
    source_id: "src-001",
    candidate_id: "cand-101",
    mandate_id: "mnd-001",
    strength: "strong",
    comment: "Excellent technical background and culture fit",
    created_at: "2024-11-15T14:30:00Z",
  },
  {
    id: "rec-002",
    source_id: "src-002",
    candidate_id: "cand-102",
    mandate_id: "mnd-002",
    strength: "neutral",
    comment: "Good skills but limited healthcare experience",
    created_at: "2024-11-18T11:00:00Z",
  },
  {
    id: "rec-003",
    source_id: "src-001",
    candidate_id: "cand-103",
    mandate_id: "mnd-003",
    strength: "strong",
    created_at: "2024-11-10T09:15:00Z",
  },
];

// --------------------------------------------
// Mock Interaction Events
// --------------------------------------------
export const mockInteractionEvents: SourceInteractionEvent[] = [
  {
    id: "evt-001",
    source_id: "src-001",
    mandate_id: "mnd-001",
    candidate_id: "cand-101",
    event_type: "used_in_final_decision",
    timestamp: "2024-11-15T14:30:00Z",
  },
  {
    id: "evt-002",
    source_id: "src-002",
    mandate_id: "mnd-002",
    event_type: "used_in_shortlist",
    timestamp: "2024-11-18T11:00:00Z",
  },
  {
    id: "evt-003",
    source_id: "src-003",
    mandate_id: "mnd-006",
    event_type: "insight_viewed",
    timestamp: "2024-11-20T10:00:00Z",
  },
];

// --------------------------------------------
// Helper Functions
// --------------------------------------------
export function getSimilarityScoreColor(score: number): string {
  if (score >= 0.8) return "text-green-600 dark:text-green-400";
  if (score >= 0.6) return "text-blue-600 dark:text-blue-400";
  if (score >= 0.4) return "text-yellow-600 dark:text-yellow-400";
  return "text-red-600 dark:text-red-400";
}

export function getSimilarityScoreBadgeColor(score: number): string {
  if (score >= 0.8) return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800";
  if (score >= 0.6) return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900/30 dark:text-blue-400 dark:border-blue-800";
  if (score >= 0.4) return "bg-yellow-100 text-yellow-800 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800";
  return "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800";
}

export function formatSimilarityScore(score: number): string {
  return (score * 100).toFixed(0) + "%";
}

// --------------------------------------------
// Lookup/Filter Functions
// --------------------------------------------
export function getSourceById(id: string): Source | undefined {
  return mockSources.find((s) => s.id === id);
}

export function getSourcesByRole(role: string): Source[] {
  return mockSources.filter((s) => s.role === role);
}

export function getSourcesBySector(sector: string): Source[] {
  return mockSources.filter((s) => s.sectors.includes(sector));
}

export function getUniqueRoles(): string[] {
  return Array.from(new Set(mockSources.map((s) => s.role)));
}

export function getUniqueSectors(): string[] {
  return Array.from(new Set(mockSources.flatMap((s) => s.sectors)));
}

export function getUniqueGeographies(): string[] {
  return Array.from(new Set(mockSources.flatMap((s) => s.geographies)));
}

export function getUniqueSeniorityLevels(): string[] {
  return Array.from(new Set(mockSources.map((s) => s.seniority_level)));
}

// --------------------------------------------
// Mock Mandate Headers and Candidates (for Feedback UI)
// --------------------------------------------
export function getMockMandateHeader(mandateId: string): { id: string; title: string; subtitle?: string } {
  // Simple mapping for demos; extend as needed
  const map: Record<string, { title: string; subtitle?: string }> = {
    "mnd-001": { title: "Senior Backend Engineer – FinTech – London" },
    "mnd-002": { title: "Chief Medical Officer – Biotech – Boston" },
    "mnd-003": { title: "CTO – AI/ML – Remote (EU)" },
  };
  return { id: mandateId, title: map[mandateId]?.title || "VP Engineering – Series B SaaS – Remote" };
}

export type MandateCandidateLite = { id: string; name: string; title?: string; firm?: string };

export function getMockMandateCandidates(mandateId: string): MandateCandidateLite[] {
  // Reuse consistent demo candidates regardless of mandate for now
  return [
    { id: "cand-101", name: "Alexandra Pierce", title: "VP Engineering", firm: "NimbusCloud" },
    { id: "cand-102", name: "Marcus Chen", title: "Director of Engineering", firm: "FinSettle" },
    { id: "cand-103", name: "Sarah Thompson", title: "Head of Platform", firm: "DataForge" },
    { id: "cand-104", name: "David Okonkwo", title: "Senior Engineering Manager", firm: "SwiftPay" },
    { id: "cand-105", name: "Emily Rodriguez", title: "Engineering Manager", firm: "TradeNova" },
  ];
}
