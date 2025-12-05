// Source model: create and list
// id, name, email, role, organisation, sectors, geographies, seniority_level

const db = require('../db/pgConnection.cjs');

const SourceModel = {
  async list() {
    const { rows } = await db.query('SELECT * FROM sources ORDER BY name ASC');
    return rows;
  },
  
  async listPaged(filters = {}) {
    const page = Number(filters.page) > 0 ? Number(filters.page) : 1;
    const pageSize = Number(filters.pageSize) > 0 ? Number(filters.pageSize) : 10;

    const offset = (page - 1) * pageSize;

    const countResult = await db.query(
      `SELECT COUNT(*)::int AS count FROM sources`,
      []
    );
    const total = countResult.rows[0]?.count ?? 0;

    const result = await db.query(
      `SELECT * FROM sources ORDER BY name ASC LIMIT $1 OFFSET $2`,
      [pageSize, offset]
    );

    return {
      rows: result.rows,
      total,
    };
  },
  
  async getById(id) {
    const { rows } = await db.query('SELECT * FROM sources WHERE id = $1', [id]);
    return rows[0] || null;
  },
  
  async create(data) {
    const query = `INSERT INTO sources (name, email, role, organisation, sectors, geographies, seniority_level)
      VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`;
    const params = [
      data.name,
      data.email,
      data.role,
      data.organisation,
      JSON.stringify(data.sectors || []),
      JSON.stringify(data.geographies || []),
      data.seniority_level
    ];
    const { rows } = await db.query(query, params);
    return rows[0];
  },

  async getOrgPattern() {
    // Get all sources
    const { rows } = await db.query('SELECT * FROM sources');
    
    // Calculate distributions
    const rolesDistribution = {};
    const industryDistribution = {};
    const geographyDistribution = {};
    const seniorityDistribution = {};
    
    rows.forEach(source => {
      // Role distribution
      rolesDistribution[source.role] = (rolesDistribution[source.role] || 0) + 1;
      
      // Seniority distribution
      seniorityDistribution[source.seniority_level] = (seniorityDistribution[source.seniority_level] || 0) + 1;
      
      // Industry/Sectors distribution
      const sectors = Array.isArray(source.sectors) ? source.sectors : JSON.parse(source.sectors || '[]');
      sectors.forEach(sector => {
        industryDistribution[sector] = (industryDistribution[sector] || 0) + 1;
      });
      
      // Geography distribution
      const geographies = Array.isArray(source.geographies) ? source.geographies : JSON.parse(source.geographies || '[]');
      geographies.forEach(geo => {
        geographyDistribution[geo] = (geographyDistribution[geo] || 0) + 1;
      });
    });
    
    return {
      id: 'org-pattern-1',
      roles_distribution: rolesDistribution,
      industry_distribution: industryDistribution,
      geography_distribution: geographyDistribution,
      seniority_distribution: seniorityDistribution,
      interaction_stats: {
        total_sources: rows.length,
        total_interactions: 0, // Will be calculated from recommendation events in future
        avg_interactions_per_source: 0
      },
      last_updated_at: new Date().toISOString()
    };
  },

  async importHistoricalData(rows) {
    const imported = [];
    const skipped = [];
    const errors = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +2 because CSV header is row 1, data starts at row 2
      
      try {
        // Validate required fields
        if (!row.name || !row.role || !row.organisation) {
          errors.push(`Row ${rowNum}: Missing required fields (name, role, or organisation)`);
          skipped.push(row);
          continue;
        }
        
        // Check if source already exists by external_id
        if (row.external_id) {
          const existing = await db.query(
            'SELECT id FROM sources WHERE name = $1 AND organisation = $2',
            [row.name, row.organisation]
          );
          
          if (existing.rows.length > 0) {
            errors.push(`Row ${rowNum}: Source already exists (${row.name} at ${row.organisation})`);
            skipped.push(row);
            continue;
          }
        }
        
        // Parse sectors and geographies
        const sectors = row.sector ? [row.sector] : [];
        const geographies = row.geography ? [row.geography] : [];
        
        // Insert source
        const query = `
          INSERT INTO sources (name, email, role, organisation, sectors, geographies, seniority_level)
          VALUES ($1, $2, $3, $4, $5, $6, $7)
          RETURNING *
        `;
        
        const params = [
          row.name,
          row.email || null,
          row.role,
          row.organisation,
          JSON.stringify(sectors),
          JSON.stringify(geographies),
          row.seniority_level || row.role // Use role as fallback for seniority
        ];
        
        const { rows: insertedRows } = await db.query(query, params);
        imported.push(insertedRows[0]);
        
      } catch (error) {
        console.error(`Error importing row ${rowNum}:`, error);
        errors.push(`Row ${rowNum}: ${error.message}`);
        skipped.push(row);
      }
    }
    
    return {
      success: true,
      imported: imported.length,
      skipped: skipped.length,
      errors: errors,
      data: imported
    };
  },

  async bulkUpdate(updates) {
    const results = [];
    const errors = [];
    
    for (const update of updates) {
      try {
        const { id, role, sectors, geographies, seniority_level } = update;
        
        const fields = [];
        const values = [];
        let paramIndex = 1;
        
        if (role !== undefined) {
          fields.push(`role = $${paramIndex++}`);
          values.push(role);
        }
        
        if (sectors !== undefined) {
          fields.push(`sectors = $${paramIndex++}`);
          values.push(JSON.stringify(sectors));
        }
        
        if (geographies !== undefined) {
          fields.push(`geographies = $${paramIndex++}`);
          values.push(JSON.stringify(geographies));
        }
        
        if (seniority_level !== undefined) {
          fields.push(`seniority_level = $${paramIndex++}`);
          values.push(seniority_level);
        }
        
        if (fields.length === 0) continue;
        
        values.push(id);
        const query = `UPDATE sources SET ${fields.join(', ')} WHERE id = $${paramIndex} RETURNING *`;
        
        const { rows } = await db.query(query, values);
        results.push(rows[0]);
        
      } catch (error) {
        console.error(`Error updating source ${update.id}:`, error);
        errors.push(`Source ${update.id}: ${error.message}`);
      }
    }
    
    return {
      success: true,
      updated: results.length,
      errors
    };
  }
};

module.exports = SourceModel;
