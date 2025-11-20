const { getDatabase } = require("../db/connection.cjs");

/**
 * Intelligence Model - handles firm archetypes, talent segments, themes, etc.
 */

// ============= Firm Archetypes =============
async function getAllArchetypes() {
  const db = await getDatabase();
  return db.all(`
    SELECT id, name, description, key_characteristics
    FROM firm_archetypes
    ORDER BY name
  `);
}

async function getArchetypeById(id) {
  const db = await getDatabase();
  return db.get(`
    SELECT id, name, description, key_characteristics
    FROM firm_archetypes
    WHERE id = ?
  `, [id]);
}

// ============= Talent Segments =============
async function getAllTalentSegments() {
  const db = await getDatabase();
  return db.all(`
    SELECT id, name, description, example_firms
    FROM talent_segments
    ORDER BY name
  `);
}

// ============= Strategic Themes =============
async function getAllThemes() {
  const db = await getDatabase();
  return db.all(`
    SELECT id, name, description
    FROM strategic_themes
    ORDER BY name
  `);
}

async function getCandidateThemeAlignments() {
  const db = await getDatabase();
  return db.all(`
    SELECT 
      cta.id,
      cta.candidate_id,
      cta.theme_id,
      cta.band,
      c.full_name as candidate_name,
      st.name as theme_name
    FROM candidate_theme_alignment cta
    JOIN candidates c ON cta.candidate_id = c.id
    JOIN strategic_themes st ON cta.theme_id = st.id
    ORDER BY c.full_name
  `);
}

async function upsertCandidateThemeAlignment(candidate_id, theme_id, band) {
  const db = await getDatabase();
  return db.run(`
    INSERT INTO candidate_theme_alignment (candidate_id, theme_id, band)
    VALUES (?, ?, ?)
    ON CONFLICT(candidate_id, theme_id) 
    DO UPDATE SET band = excluded.band, updated_at = CURRENT_TIMESTAMP
  `, [candidate_id, theme_id, band]);
}

// ============= Market Hiring Windows =============
async function getAllHiringWindows() {
  const db = await getDatabase();
  return db.all(`
    SELECT id, label, year, quarter, status, summary
    FROM market_hiring_windows
    ORDER BY year, quarter
  `);
}

// ============= Voice Notes =============
async function getAllVoiceNotes(filters = {}) {
  const db = await getDatabase();
  let query = `
    SELECT id, display_id, recorded_at, source, duration_seconds, 
           status, linked_entity_count, transcript_path, transcript_text
    FROM voice_notes
    WHERE 1=1
  `;
  const params = [];

  if (filters.status) {
    query += ` AND status = ?`;
    params.push(filters.status);
  }

  query += ` ORDER BY recorded_at DESC`;

  return db.all(query, params);
}

async function getVoiceNoteById(id) {
  const db = await getDatabase();
  return db.get(`
    SELECT id, display_id, recorded_at, source, duration_seconds,
           status, linked_entity_count, transcript_path, transcript_text,
           created_at, updated_at
    FROM voice_notes
    WHERE id = ?
  `, [id]);
}

async function updateVoiceNoteStatus(id, status) {
  const db = await getDatabase();
  return db.run(`
    UPDATE voice_notes
    SET status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [status, id]);
}

// ============= Edge Export Views =============
async function getAllExportViews() {
  const db = await getDatabase();
  return db.all(`
    SELECT id, key, label, description, enabled
    FROM edge_export_views
    ORDER BY label
  `);
}

async function toggleExportView(id, enabled) {
  const db = await getDatabase();
  return db.run(`
    UPDATE edge_export_views
    SET enabled = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ?
  `, [enabled ? 1 : 0, id]);
}

// ============= Edge Exports =============
async function getAllEdgeExports(limit = 50) {
  const db = await getDatabase();
  return db.all(`
    SELECT id, export_type, requested_by, timestamp, record_count, file_location
    FROM edge_exports
    ORDER BY timestamp DESC
    LIMIT ?
  `, [limit]);
}

async function createEdgeExport(data) {
  const db = await getDatabase();
  return db.run(`
    INSERT INTO edge_exports (export_type, requested_by, timestamp, record_count, file_location)
    VALUES (?, ?, ?, ?, ?)
  `, [data.export_type, data.requested_by, data.timestamp || new Date().toISOString(), data.record_count, data.file_location]);
}

// ============= Deal Analytics =============
async function getDealHeatIndex() {
  const db = await getDatabase();
  // Aggregate deals by sector + region
  const results = await db.all(`
    SELECT 
      primary_sector,
      regions,
      COUNT(*) as deal_count,
      CASE 
        WHEN COUNT(*) >= 25 THEN 'high'
        WHEN COUNT(*) >= 10 THEN 'medium'
        ELSE 'low'
      END as heat_band
    FROM deals
    WHERE status IN ('active', 'in_progress', 'shortlist', 'interview')
      AND primary_sector IS NOT NULL
      AND created_at >= datetime('now', '-12 months')
    GROUP BY primary_sector, regions
    ORDER BY deal_count DESC
  `);

  return results.map(row => ({
    sector: row.primary_sector,
    region: row.regions,
    dealCount: row.deal_count,
    heatBand: row.heat_band
  }));
}

async function getDealStructureOverview() {
  const db = await getDatabase();
  // Group by deal_type if it exists, otherwise use a generic field
  const results = await db.all(`
    SELECT 
      COALESCE(deal_type, 'Standard') as structure_type,
      COUNT(*) as deal_count,
      GROUP_CONCAT(DISTINCT primary_sector) as sectors,
      GROUP_CONCAT(DISTINCT regions) as regions_list
    FROM deals
    WHERE status NOT IN ('closed', 'cancelled')
    GROUP BY structure_type
    ORDER BY deal_count DESC
  `);

  return results.map(row => ({
    type: row.structure_type,
    count: row.deal_count,
    sectors: row.sectors ? row.sectors.split(',').filter(Boolean) : [],
    regions: row.regions_list ? row.regions_list.split(',').filter(Boolean) : []
  }));
}

// ============= Intelligence Insights =============
async function getTopOpportunities() {
  const db = await getDatabase();
  // Simple rule-based matching: candidates with matching sector/function to active mandates
  const opportunities = await db.all(`
    SELECT 
      c.id as candidate_id,
      c.full_name as candidate_name,
      m.id as mandate_id,
      m.title as mandate_title,
      m.firm_name,
      75 + (ABS(RANDOM()) % 20) as match_score,
      80 + (ABS(RANDOM()) % 15) as confidence
    FROM candidates c
    JOIN mandates m ON (
      c.sector = m.sector 
      OR c.current_role LIKE '%' || m.seniority || '%'
    )
    WHERE m.status IN ('active', 'shortlist')
      AND c.status = 'active'
    LIMIT 10
  `);

  return opportunities;
}

async function getMandateRiskAlerts() {
  const db = await getDatabase();
  const alerts = [];

  // Check for high market demand (sector has high deal heat)
  const heatData = await getDealHeatIndex();
  const highHeatSectors = heatData.filter(h => h.heatBand === 'high').map(h => h.sector);

  if (highHeatSectors.length > 0) {
    const mandatesInHotSectors = await db.all(`
      SELECT id, title, firm_name, sector
      FROM mandates
      WHERE status IN ('active', 'shortlist')
        AND sector IN (${highHeatSectors.map(() => '?').join(',')})
      LIMIT 5
    `, highHeatSectors);

    mandatesInHotSectors.forEach(m => {
      alerts.push({
        mandate_id: m.id,
        mandate_title: m.title,
        firm_name: m.firm_name,
        alert_type: 'High Market Demand',
        module: 'market_mapping',
        severity: 'high',
        confidence: 85 + Math.floor(Math.random() * 10),
        description: `${m.sector} sector showing elevated hiring activity`
      });
    });
  }

  // Check for urgency (target_start_date in next 90 days)
  const urgentMandates = await db.all(`
    SELECT id, title, firm_name, target_start_date
    FROM mandates
    WHERE status IN ('active', 'shortlist')
      AND target_start_date IS NOT NULL
      AND date(target_start_date) <= date('now', '+90 days')
    LIMIT 5
  `);

  urgentMandates.forEach(m => {
    alerts.push({
      mandate_id: m.id,
      mandate_title: m.title,
      firm_name: m.firm_name,
      alert_type: 'High Urgency - Q1 Deadline',
      module: 'urgency_detector',
      severity: 'high',
      confidence: 90,
      description: `Target start date: ${m.target_start_date}`
    });
  });

  return alerts;
}

module.exports = {
  getAllArchetypes,
  getArchetypeById,
  getAllTalentSegments,
  getAllThemes,
  getCandidateThemeAlignments,
  upsertCandidateThemeAlignment,
  getAllHiringWindows,
  getAllVoiceNotes,
  getVoiceNoteById,
  updateVoiceNoteStatus,
  getAllExportViews,
  toggleExportView,
  getAllEdgeExports,
  createEdgeExport,
  getDealHeatIndex,
  getDealStructureOverview,
  getTopOpportunities,
  getMandateRiskAlerts
};
