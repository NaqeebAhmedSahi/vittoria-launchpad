const db = require("../db/pgConnection.cjs");

const OutcomeModel = {
  async create(data) {
    const query = `
      INSERT INTO mandate_outcomes (candidate_id, mandate_id, stage, result, notes)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;

    const params = [
      data.candidate_id,
      data.mandate_id,
      data.stage,
      data.result,
      data.notes || null,
    ];

    const { rows } = await db.query(query, params);
    return rows[0];
  },

  async listByMandate(mandateId) {
    const query = `
      SELECT 
        mo.*,
        c.name AS candidate_name,
        c.current_title AS candidate_role
      FROM mandate_outcomes mo
      LEFT JOIN candidates c ON c.id = mo.candidate_id
      WHERE mo.mandate_id = $1
      ORDER BY mo.created_at DESC
    `;

    const { rows } = await db.query(query, [mandateId]);
    return rows;
  },

  async listLatestByCandidateMap(candidateIds = []) {
    if (!candidateIds.length) {
      return new Map();
    }

    const query = `
      SELECT DISTINCT ON (candidate_id, mandate_id)
        candidate_id,
        mandate_id,
        stage,
        result,
        notes,
        created_at
      FROM mandate_outcomes
      WHERE candidate_id = ANY($1::int[])
      ORDER BY candidate_id, mandate_id, created_at DESC
    `;

    const { rows } = await db.query(query, [candidateIds]);
    const map = new Map();
    rows.forEach((row) => {
      map.set(`${row.candidate_id}-${row.mandate_id}`, row);
    });
    return map;
  },
};

module.exports = OutcomeModel;




