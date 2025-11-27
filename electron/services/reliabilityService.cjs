const db = require("../db/pgConnection.cjs");
const MandateModel = require("../models/mandateModel.cjs");
const CandidateModel = require("../models/candidateModel.cjs");

const POSITIVE_RESULTS = new Set(["selected", "offer", "pass"]);
const LATE_STAGES = new Set(["final", "offer", "selected"]);

const parseJsonArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return [];
  }
};

const formatSourceRow = (row) => ({
  id: row.id,
  name: row.name,
  role: row.role,
  organisation: row.organisation,
  sectors: parseJsonArray(row.sectors),
  geographies: parseJsonArray(row.geographies),
  seniority_level: row.seniority_level,
  created_at: row.created_at,
  updated_at: row.updated_at,
});

function buildOutcomeSummary(outcome) {
  if (!outcome?.stage && !outcome?.result) {
    return "No outcomes recorded yet";
  }

  const stage = outcome.stage ? outcome.stage.replace(/^\w/, (c) => c.toUpperCase()) : "Stage";
  const result = outcome.result ? outcome.result.replace(/^\w/, (c) => c.toUpperCase()) : "Pending";
  return `${stage}: ${result}`;
}

function computeConsistency(events) {
  if (!events.length) return 1;

  const contradictions = new Set();
  const seen = new Map();

  events.forEach((event) => {
    const key = `${event.candidate_id}-${event.mandate_id}`;
    const current = seen.get(key);
    if (current && current !== event.strength) {
      contradictions.add(key);
    } else if (!current) {
      seen.set(key, event.strength);
    }
  });

  const ratio = contradictions.size / events.length;
  return Math.max(0, 1 - ratio);
}

function computeMetrics(events) {
  if (!events.length) {
    return {
      reliability_score: 0,
      components: { accuracy: 0, consistency: 0, impact: 0 },
      total_recommendations: 0,
      evaluated_recommendations: 0,
      last_calculated_at: new Date().toISOString(),
    };
  }

  const evaluated = events.filter((event) => event.outcome_result);
  const totalEvaluated = evaluated.length;

  let correct = 0;
  let impactHits = 0;

  evaluated.forEach((event) => {
    if (POSITIVE_RESULTS.has(event.outcome_result)) {
      if (event.strength !== "weak") {
        correct += 1;
      }
      if (LATE_STAGES.has(event.outcome_stage) || POSITIVE_RESULTS.has(event.outcome_result)) {
        impactHits += 1;
      }
    } else if (event.strength === "weak") {
      correct += 1;
    }
  });

  const accuracy = totalEvaluated ? correct / totalEvaluated : 0;
  const consistency = computeConsistency(events);
  const impact = totalEvaluated ? impactHits / totalEvaluated : 0;
  const reliability_score = 0.5 * accuracy + 0.3 * consistency + 0.2 * impact;

  return {
    reliability_score: Number(reliability_score.toFixed(3)),
    components: {
      accuracy: Number(accuracy.toFixed(3)),
      consistency: Number(consistency.toFixed(3)),
      impact: Number(impact.toFixed(3)),
    },
    total_recommendations: events.length,
    evaluated_recommendations: totalEvaluated,
    last_calculated_at: new Date().toISOString(),
  };
}

async function fetchEventsForSources(sourceIds) {
  if (!sourceIds.length) {
    return [];
  }

  const query = `
    SELECT
      re.id,
      re.source_id,
      re.candidate_id,
      re.mandate_id,
      re.strength,
      re.comment,
      re.created_at,
      c.name AS candidate_name,
      c.current_title AS candidate_role,
      outcome.stage AS outcome_stage,
      outcome.result AS outcome_result,
      outcome.created_at AS outcome_recorded_at
    FROM recommendation_events re
    LEFT JOIN candidates c ON c.id = re.candidate_id
    LEFT JOIN LATERAL (
      SELECT stage, result, created_at
      FROM mandate_outcomes mo
      WHERE mo.candidate_id = re.candidate_id
        AND mo.mandate_id = re.mandate_id
      ORDER BY created_at DESC
      LIMIT 1
    ) outcome ON true
    WHERE re.source_id = ANY($1::int[])
    ORDER BY re.created_at DESC
  `;

  const { rows } = await db.query(query, [sourceIds]);
  return rows;
}

function groupEventsBySource(events) {
  const grouped = new Map();
  events.forEach((event) => {
    if (!grouped.has(event.source_id)) {
      grouped.set(event.source_id, []);
    }
    grouped.get(event.source_id).push(event);
  });
  return grouped;
}

module.exports = {
  async listSources() {
    const { rows: sourceRows } = await db.query(`SELECT * FROM sources ORDER BY name ASC`);
    const sourceIds = sourceRows.map((row) => row.id);
    const events = await fetchEventsForSources(sourceIds);
    const grouped = groupEventsBySource(events);

    const items = sourceRows.map((row) => {
      const source = formatSourceRow(row);
      const sourceEvents = grouped.get(row.id) || [];
      const reliability_profile = sourceEvents.length ? computeMetrics(sourceEvents) : null;
      return { source, reliability_profile };
    });

    return {
      items,
      total: items.length,
      page: 1,
      page_size: items.length,
    };
  },

  async getSourceDetail(sourceId) {
    const { rows: sourceRows } = await db.query(`SELECT * FROM sources WHERE id = $1`, [sourceId]);
    if (!sourceRows.length) {
      throw new Error("Source not found");
    }

    const source = formatSourceRow(sourceRows[0]);
    const events = await fetchEventsForSources([sourceId]);
    const profile = events.length ? computeMetrics(events) : null;

    const recent = events.slice(0, 15).map((event) => ({
      recommendation: {
        id: event.id,
        source_id: event.source_id,
        candidate_id: event.candidate_id,
        mandate_id: event.mandate_id,
        strength: event.strength,
        comment: event.comment,
        created_at: event.created_at,
      },
      candidate: {
        id: event.candidate_id,
        name: event.candidate_name || `Candidate ${event.candidate_id}`,
        current_role: event.candidate_role || "",
      },
      outcome_summary: buildOutcomeSummary({
        stage: event.outcome_stage,
        result: event.outcome_result,
      }),
    }));

    return {
      source,
      reliability_profile: profile,
      recent_recommendations: recent,
    };
  },

  async getMandateOutcomeLog(mandateId) {
    const mandate = await MandateModel.getMandateById(mandateId);
    if (!mandate) {
      throw new Error("Mandate not found");
    }

    const candidateSummaries = [];
    if (Array.isArray(mandate.candidate_ids)) {
      for (const candidateId of mandate.candidate_ids) {
        const candidate = await CandidateModel.getCandidateById(candidateId);
        if (candidate) {
          candidateSummaries.push({
            id: candidate.id,
            name: candidate.name,
            current_role: candidate.current_title || "",
          });
        }
      }
    }

    const { rows: outcomes } = await db.query(
      `
      SELECT
        mo.*,
        c.name AS candidate_name,
        c.current_title AS candidate_role
      FROM mandate_outcomes mo
      LEFT JOIN candidates c ON c.id = mo.candidate_id
      WHERE mo.mandate_id = $1
      ORDER BY mo.created_at DESC
      `,
      [mandateId]
    );

    return {
      mandate: {
        id: mandate.id,
        title: mandate.name,
        sector: mandate.primary_sector || mandate.sectors?.[0] || "",
        location: mandate.location || "",
        created_at: mandate.created_at,
      },
      candidates: candidateSummaries,
      outcomes: outcomes.map((row) => ({
        id: row.id,
        candidate_id: row.candidate_id,
        mandate_id: row.mandate_id,
        stage: row.stage,
        result: row.result,
        notes: row.notes || null,
        created_at: row.created_at,
        candidate_name: row.candidate_name,
        candidate_role: row.candidate_role,
      })),
    };
  },
};







