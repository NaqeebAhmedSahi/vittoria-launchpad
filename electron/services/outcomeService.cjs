const OutcomeModel = require("../models/outcomeModel.cjs");
const MandateModel = require("../models/mandateModel.cjs");
const CandidateModel = require("../models/candidateModel.cjs");

function toCandidateSummary(candidate) {
  if (!candidate) return null;
  return {
    id: candidate.id,
    name: candidate.name,
    current_role: candidate.current_title || "",
  };
}

function toMandateSummary(mandate) {
  if (!mandate) return null;
  return {
    id: mandate.id,
    title: mandate.name,
    sector: mandate.primary_sector || (mandate.sectors?.[0] ?? ""),
    location: mandate.location || "",
    created_at: mandate.created_at,
  };
}

module.exports = {
  async create(data) {
    return OutcomeModel.create(data);
  },

  async listByMandate(mandateId) {
    const mandate = await MandateModel.getMandateById(mandateId);
    if (!mandate) {
      throw new Error("Mandate not found");
    }

    const candidates = [];
    if (Array.isArray(mandate.candidate_ids)) {
      for (const candidateId of mandate.candidate_ids) {
        const candidate = await CandidateModel.getCandidateById(candidateId);
        if (candidate) {
          const summary = toCandidateSummary(candidate);
          if (summary) candidates.push(summary);
        }
      }
    }

    const outcomes = await OutcomeModel.listByMandate(mandateId);

    return {
      mandate: toMandateSummary(mandate),
      candidates,
      outcomes: outcomes.map((row) => ({
        id: row.id,
        candidate_id: row.candidate_id,
        mandate_id: row.mandate_id,
        stage: row.stage,
        result: row.result,
        notes: row.notes || null,
        created_at: row.created_at,
        candidate_name: row.candidate_name || null,
        candidate_role: row.candidate_role || null,
      })),
    };
  },
};




