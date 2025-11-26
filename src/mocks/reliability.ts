import { subDays } from "date-fns";
import type {
  CandidateSummary,
  MandateOutcomeLogResponse,
  OutcomeEvent,
  OutcomeResult,
  OutcomeStage,
  RecommendationEvent,
  ReliabilityComponents,
  SourceReliabilityDetailResponse,
  SourceReliabilityListItem,
  SourceReliabilityListResponse,
  SourceReliabilityProfile,
} from "@/types/reliability";
import type { Source } from "@/types/similarity";

const today = new Date();

const makeDate = (daysAgo: number) => subDays(today, daysAgo).toISOString();

const sampleSources: Source[] = [
  {
    id: "S-001",
    name: "John Doe",
    role: "Senior Backend Engineer",
    organisation: "TechCorp",
    sectors: ["FinTech", "SaaS"],
    geographies: ["US", "Europe"],
    seniority_level: "Senior",
    created_at: makeDate(140),
    updated_at: makeDate(3),
  },
  {
    id: "S-002",
    name: "Jane Smith",
    role: "Recruiter",
    organisation: "HR Solutions",
    sectors: ["HR", "Consulting"],
    geographies: ["Asia", "Europe"],
    seniority_level: "Lead",
    created_at: makeDate(200),
    updated_at: makeDate(5),
  },
  {
    id: "S-003",
    name: "Alice Brown",
    role: "Talent Manager",
    organisation: "Global Recruitment",
    sectors: ["Tech", "Manufacturing"],
    geographies: ["North America", "Asia"],
    seniority_level: "Principal",
    created_at: makeDate(320),
    updated_at: makeDate(7),
  },
];

const makeComponents = (accuracy: number, consistency: number, impact: number): ReliabilityComponents => ({
  accuracy,
  consistency,
  impact,
});

const sampleProfiles: Record<string, SourceReliabilityProfile> = {
  "S-001": {
    source_id: "S-001",
    reliability_score: 0.92,
    components: makeComponents(0.95, 0.9, 0.85),
    total_recommendations: 32,
    evaluated_recommendations: 25,
    last_calculated_at: makeDate(1),
  },
  "S-002": {
    source_id: "S-002",
    reliability_score: 0.78,
    components: makeComponents(0.8, 0.75, 0.7),
    total_recommendations: 22,
    evaluated_recommendations: 15,
    last_calculated_at: makeDate(2),
  },
  "S-003": {
    source_id: "S-003",
    reliability_score: 0.65,
    components: makeComponents(0.7, 0.6, 0.5),
    total_recommendations: 38,
    evaluated_recommendations: 30,
    last_calculated_at: makeDate(4),
  },
};

const sampleCandidates: Record<number, CandidateSummary> = {
  101: { id: 101, name: "Emily Carter", current_role: "Product Manager" },
  102: { id: 102, name: "Michael Zhang", current_role: "Principal Engineer" },
  103: { id: 103, name: "Sarah Martinez", current_role: "Data Scientist" },
};

const sampleRecommendations: RecommendationEvent[] = [
  {
    id: "REC-1",
    source_id: 1,
    candidate_id: 101,
    mandate_id: 5001,
    strength: "strong",
    comment: "Outstanding technical acumen; shipped mission-critical systems.",
    created_at: makeDate(14),
  },
  {
    id: "REC-2",
    source_id: 1,
    candidate_id: 102,
    mandate_id: 5001,
    strength: "neutral",
    comment: "Solid background but limited exposure to fintech.",
    created_at: makeDate(20),
  },
  {
    id: "REC-3",
    source_id: 2,
    candidate_id: 103,
    mandate_id: 5002,
    strength: "strong",
    comment: "Great stakeholder management, could lead cross-functional pods.",
    created_at: makeDate(9),
  },
];

const sampleOutcomes: OutcomeEvent[] = [
  {
    id: "OUT-1",
    candidate_id: 101,
    mandate_id: 5001,
    stage: "final",
    result: "selected",
    created_at: makeDate(10),
  },
  {
    id: "OUT-2",
    candidate_id: 102,
    mandate_id: 5001,
    stage: "round 2",
    result: "fail",
    created_at: makeDate(15),
  },
  {
    id: "OUT-3",
    candidate_id: 103,
    mandate_id: 5002,
    stage: "offer",
    result: "selected",
    created_at: makeDate(6),
  },
];

const listItems: SourceReliabilityListItem[] = sampleSources.map((source) => ({
  source,
  reliability_profile: sampleProfiles[source.id] ?? null,
}));

export const mockReliabilityList: SourceReliabilityListResponse = {
  items: listItems,
  total: listItems.length,
  page: 1,
  page_size: listItems.length,
};

const makeOutcomeSummary = (candidateId: number): string => {
  const events = sampleOutcomes.filter((o) => o.candidate_id === candidateId);
  if (events.length === 0) {
    return "No outcomes recorded yet";
  }

  return events
    .map((event) => {
      const stage = event.stage.replace(/^\w/, (c) => c.toUpperCase());
      const result = event.result.replace(/^\w/, (c) => c.toUpperCase());
      return `${stage}: ${result}`;
    })
    .join(" → ");
};

const detailEntries: Record<string, SourceReliabilityDetailResponse> = Object.fromEntries(
  sampleSources.map((source) => [
    source.id,
    {
      source,
      reliability_profile: sampleProfiles[source.id] ?? null,
      recent_recommendations: sampleRecommendations
        .filter((rec) => rec.source_id === Number(source.id.replace("S-", "")))
        .map((rec) => ({
          recommendation: rec,
          candidate: sampleCandidates[rec.candidate_id],
          outcome_summary: makeOutcomeSummary(rec.candidate_id),
        })),
    },
  ])
);

export const getSourceReliabilityDetail = (id: string): SourceReliabilityDetailResponse | null =>
  detailEntries[id] ?? null;

const mandateCandidates: Record<number, CandidateSummary[]> = {
  5001: [sampleCandidates[101], sampleCandidates[102]],
  5002: [sampleCandidates[103]],
};

const mandateOutcomes: Record<number, OutcomeEvent[]> = {
  5001: sampleOutcomes.filter((o) => o.mandate_id === 5001),
  5002: sampleOutcomes.filter((o) => o.mandate_id === 5002),
};

const mandates: Record<number, MandateOutcomeLogResponse["mandate"]> = {
  5001: {
    id: 5001,
    title: "Principal Engineer - FinTech Platform",
    sector: "FinTech",
    location: "London, UK",
    created_at: makeDate(45),
  },
  5002: {
    id: 5002,
    title: "Head of Talent Strategy",
    sector: "Consulting",
    location: "Berlin, Germany",
    created_at: makeDate(60),
  },
};

export const getMandateOutcomeLog = (mandateId: number): MandateOutcomeLogResponse | null => {
  if (!mandates[mandateId]) {
    return null;
  }

  return {
    mandate: mandates[mandateId],
    candidates: mandateCandidates[mandateId] ?? [],
    outcomes: mandateOutcomes[mandateId] ?? [],
  };
};

export const outcomeStages: OutcomeStage[] = ["round 1", "round 2", "final", "offer", "selected", "rejected"];
export const outcomeResults: OutcomeResult[] = ["pass", "fail", "selected", "rejected"];

export const addMockOutcome = (outcome: OutcomeEvent) => {
  const mandateBucket = mandateOutcomes[outcome.mandate_id] ?? [];
  mandateBucket.unshift(outcome);
  mandateOutcomes[outcome.mandate_id] = mandateBucket;

  const candidateBucket = mandateCandidates[outcome.mandate_id];
  if (candidateBucket && !candidateBucket.some((cand) => cand.id === outcome.candidate_id)) {
    const candidate = sampleCandidates[outcome.candidate_id];
    if (candidate) {
      candidateBucket.push(candidate);
    }
  }
};

export const getSourceById = (sourceId: string): Source | undefined =>
  sampleSources.find((source) => source.id === sourceId);

export const getRecommendationEvents = (): RecommendationEvent[] => sampleRecommendations;

export const getOutcomeEvents = (): OutcomeEvent[] => sampleOutcomes;

