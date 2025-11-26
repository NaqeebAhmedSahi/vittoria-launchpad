// ============================================================
// POSTGRESQL VERSION
// ============================================================
const { query, getClient } = require("../db/pgConnection.cjs");
const fs = require("fs");
const path = require("path");

/**
 * Load scoring configurations
 */
let cvQualityConfig;
let fitScoringConfig;

try {
  const cvQualityPath = path.join(__dirname, "../../config/scoring/cv_quality.json");
  const fitScoringPath = path.join(__dirname, "../../config/scoring/fit_scoring.json");

  cvQualityConfig = JSON.parse(fs.readFileSync(cvQualityPath, "utf-8"));
  fitScoringConfig = JSON.parse(fs.readFileSync(fitScoringPath, "utf-8"));
} catch (error) {
  console.error("Failed to load scoring configurations:", error);
  throw new Error("Scoring configuration files are missing or invalid");
}

/**
 * Initialize match_scores table (PostgreSQL)
 */
async function initMatchScoresTable() {
  // Base table
  await query(`
    CREATE TABLE IF NOT EXISTS match_scores (
      id SERIAL PRIMARY KEY,
      candidate_id INTEGER NOT NULL,
      mandate_id INTEGER,
      final_score DOUBLE PRECISION NOT NULL,
      dimension_scores TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
      CHECK (final_score >= 0 AND final_score <= 100),
      FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE,
      FOREIGN KEY (mandate_id) REFERENCES mandates(id) ON DELETE CASCADE
    );
  `);

  // Indexes
  await query(`
    CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id
    ON match_scores(candidate_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_match_scores_mandate_id
    ON match_scores(mandate_id);
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_match_scores_final_score
    ON match_scores(final_score DESC);
  `);

  // Trigger function for updated_at
  await query(`
    CREATE OR REPLACE FUNCTION set_match_scores_updated_at()
    RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at = CURRENT_TIMESTAMP;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  // Trigger (create if missing)
  await query(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM pg_trigger WHERE tgname = 'trigger_match_scores_updated_at'
      ) THEN
        CREATE TRIGGER trigger_match_scores_updated_at
        BEFORE UPDATE ON match_scores
        FOR EACH ROW
        EXECUTE FUNCTION set_match_scores_updated_at();
      END IF;
    END;
    $$;
  `);
}

/**
 * Compute CV quality score based on completeness, experience, education, and parser confidence
 */
function computeCvQuality(parsed) {
  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    CV QUALITY SCORING                          ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");

  const { weights } = cvQualityConfig.cv_quality;

  console.log("\n📊 Configured Weights:");
  console.log(`  • Completeness: ${weights.completeness * 100}%`);
  console.log(`  • Experience: ${weights.experience * 100}%`);
  console.log(`  • Education: ${weights.education * 100}%`);
  console.log(`  • Parser Confidence: ${weights.parser_confidence * 100}%`);

  const completenessScore = computeCompletenessScore(parsed);
  const experienceScore = computeExperienceScore(parsed);
  const educationScore = computeEducationScore(parsed);
  const parserConfidenceScore = computeParserConfidenceScore(parsed);

  console.log("\n🧮 Calculating Weighted Score:");
  const completenessContribution = completenessScore * weights.completeness;
  const experienceContribution = experienceScore * weights.experience;
  const educationContribution = educationScore * weights.education;
  const parserConfidenceContribution = parserConfidenceScore * weights.parser_confidence;

  console.log(
    `  Completeness:       ${completenessScore.toFixed(4)} × ${weights.completeness} = ${completenessContribution.toFixed(4)}`
  );
  console.log(
    `  Experience:         ${experienceScore.toFixed(4)} × ${weights.experience} = ${experienceContribution.toFixed(4)}`
  );
  console.log(
    `  Education:          ${educationScore.toFixed(4)} × ${weights.education} = ${educationContribution.toFixed(4)}`
  );
  console.log(
    `  Parser Confidence:  ${parserConfidenceScore.toFixed(4)} × ${weights.parser_confidence} = ${parserConfidenceContribution.toFixed(4)}`
  );

  const score =
    completenessContribution +
    experienceContribution +
    educationContribution +
    parserConfidenceContribution;

  const finalScore = Math.min(1.0, Math.max(0.0, score));

  console.log("\n✅ Final Quality Score:");
  console.log(`  Raw Score: ${score.toFixed(4)}`);
  console.log(`  Clamped Score (0-1): ${finalScore.toFixed(4)}`);
  console.log(`  Percentage: ${(finalScore * 100).toFixed(2)}%`);
  console.log("╚════════════════════════════════════════════════════════════════╝\n");

  return {
    score: finalScore,
    breakdown: {
      completeness: completenessScore,
      experience: experienceScore,
      education: educationScore,
      parser_confidence: parserConfidenceScore,
    },
  };
}

/**
 * Check completeness of required fields: name, current_title, current_firm, location, sectors, functions, asset_classes, geographies, seniority, skills
 */
function computeCompletenessScore(parsed) {
  console.log("\n📋 1. Completeness Score:");
  console.log("   Required Fields: name, current_title, current_firm, location, sectors, functions, asset_classes, geographies, seniority, skills");

  // Basic required fields (strings)
  const basicFields = [
    { name: "name", value: parsed.name },
    { name: "current_title", value: parsed.current_title },
    { name: "current_firm", value: parsed.current_firm },
    { name: "location", value: parsed.location },
    { name: "seniority", value: parsed.seniority },
  ];

  // Array fields (professional context)
  const arrayFields = [
    { name: "sectors", value: parsed.sectors },
    { name: "functions", value: parsed.functions },
    { name: "asset_classes", value: parsed.asset_classes },
    { name: "geographies", value: parsed.geographies },
  ];

  // Skills field (can be nested object or flat array)
  const skillsField = { name: "skills", value: parsed.skills };
  
  console.log("   Basic Fields:");
  basicFields.forEach((field) => {
    const isFilled =
      field.value !== undefined && field.value !== null && String(field.value).trim() !== "";
    const status = isFilled ? "✓" : "✗";
    const displayValue = isFilled ? field.value : "(empty)";
    console.log(`     ${status} ${field.name}: ${displayValue}`);
  });

  console.log("   Professional Context Fields (arrays):");
  arrayFields.forEach((field) => {
    const isFilled = Array.isArray(field.value) && field.value.length > 0;
    const status = isFilled ? "✓" : "✗";
    const displayValue = isFilled ? `[${field.value.length} items]` : "(empty or not array)";
    console.log(`     ${status} ${field.name}: ${displayValue}`);
  });

  // Check skills (nested or flat array)
  let skillsFilled = false;
  if (Array.isArray(skillsField.value) && skillsField.value.length > 0) {
    // Flat array of skills
    skillsFilled = true;
    console.log(`     ✓ ${skillsField.name}: [${skillsField.value.length} items - flat array]`);
  } else if (skillsField.value && typeof skillsField.value === 'object') {
    // Nested object with technical, domains, leadership
    const technical = Array.isArray(skillsField.value.technical) ? skillsField.value.technical.length : 0;
    const domains = Array.isArray(skillsField.value.domains) ? skillsField.value.domains.length : 0;
    const leadership = Array.isArray(skillsField.value.leadership) ? skillsField.value.leadership.length : 0;
    const totalSkills = technical + domains + leadership;
    
    if (totalSkills > 0) {
      skillsFilled = true;
      console.log(`     ✓ ${skillsField.name}: [${totalSkills} items - nested: ${technical} technical, ${domains} domains, ${leadership} leadership]`);
    } else {
      console.log(`     ✗ ${skillsField.name}: (empty nested object)`);
    }
  } else {
    console.log(`     ✗ ${skillsField.name}: (empty or invalid)`);
  }

  const filledBasicFields = basicFields.filter(
    (field) =>
      field.value !== undefined && field.value !== null && String(field.value).trim() !== ""
  ).length;

  const filledArrayFields = arrayFields.filter(
    (field) => Array.isArray(field.value) && field.value.length > 0
  ).length;

  const filledSkills = skillsFilled ? 1 : 0;

  const totalFields = basicFields.length + arrayFields.length + 1; // +1 for skills
  const totalFilled = filledBasicFields + filledArrayFields + filledSkills;

  const score = totalFilled / totalFields;
  console.log(`   Score: ${totalFilled}/${totalFields} = ${score.toFixed(4)}`);
  console.log(`   Breakdown: ${filledBasicFields}/${basicFields.length} basic + ${filledArrayFields}/${arrayFields.length} arrays + ${filledSkills}/1 skills`);


  return score;
}

/**
 * Compute experience score: % of experience entries with firm + title + dateFrom
 */
function computeExperienceScore(parsed) {
  console.log("\n💼 2. Experience Score:");

  if (!parsed.experience || !Array.isArray(parsed.experience) || parsed.experience.length === 0) {
    console.log("   No experience entries found");
    console.log(
      `   Experience data: ${
        parsed.experience === undefined
          ? "undefined"
          : parsed.experience === null
          ? "null"
          : typeof parsed.experience
      }`
    );
    console.log("   Score: 0/0 = 0.0000");
    return 0;
  }

  console.log(`   Total Experience Entries: ${parsed.experience.length}`);
  console.log("   Required Fields per Entry: firm, title, dateFrom");

  let completeEntries = 0;
  parsed.experience.forEach((exp, index) => {
    const hasFirm = exp.firm && String(exp.firm).trim() !== "";
    const hasTitle = exp.title && String(exp.title).trim() !== "";
    const hasDateFrom = exp.dateFrom && String(exp.dateFrom).trim() !== "";
    const isComplete = hasFirm && hasTitle && hasDateFrom;

    if (isComplete) completeEntries++;

    const status = isComplete ? "✓" : "✗";
    console.log(`     ${status} Entry ${index + 1}:`);
    console.log(`       Firm: ${hasFirm ? exp.firm : "(empty)"}`);
    console.log(`       Title: ${hasTitle ? exp.title : "(empty)"}`);
    console.log(`       DateFrom: ${hasDateFrom ? exp.dateFrom : "(empty)"}`);
  });

  const score = completeEntries / parsed.experience.length;
  console.log(`   Score: ${completeEntries}/${parsed.experience.length} = ${score.toFixed(4)}`);

  return score;
}

/**
 * Compute education score: % of education entries with institution
 */
function computeEducationScore(parsed) {
  console.log("\n🎓 3. Education Score:");

  if (!parsed.education || !Array.isArray(parsed.education) || parsed.education.length === 0) {
    console.log("   No education entries found");
    console.log(
      `   Education data: ${
        parsed.education === undefined
          ? "undefined"
          : parsed.education === null
          ? "null"
          : typeof parsed.education
      }`
    );
    console.log("   Score: 0/0 = 0.0000");
    return 0;
  }

  console.log(`   Total Education Entries: ${parsed.education.length}`);
  console.log("   Required Field per Entry: institution");

  let completeEntries = 0;
  parsed.education.forEach((edu, index) => {
    const hasInstitution = edu.institution && String(edu.institution).trim() !== "";
    if (hasInstitution) completeEntries++;

    const status = hasInstitution ? "✓" : "✗";
    console.log(`     ${status} Entry ${index + 1}:`);
    console.log(`       Institution: ${hasInstitution ? edu.institution : "(empty)"}`);
    if (edu.degree) console.log(`       Degree: ${edu.degree}`);
  });

  const score = completeEntries / parsed.education.length;
  console.log(`   Score: ${completeEntries}/${parsed.education.length} = ${score.toFixed(4)}`);

  return score;
}

/**
 * Compute parser confidence score based on raw text length
 */
function computeParserConfidenceScore(parsed) {
  console.log("\n📄 4. Parser Confidence Score:");

  const textLength = parsed.raw_text?.length || 0;
  console.log(`   Raw Text Length: ${textLength} characters`);

  let score;
  let reason;

  if (textLength < 500) {
    score = 0.2;
    reason = "Too short, likely incomplete";
  } else if (textLength > 30000) {
    score = 0.3;
    reason = "Too long, likely parsing issues";
  } else {
    score = 1.0;
    reason = "Good length";
  }

  console.log(`   Score: ${score.toFixed(4)} (${reason})`);
  console.log("   Thresholds: < 500 = 0.2, > 30000 = 0.3, otherwise = 1.0");

  return score;
}

/**
 * API-based scoring: Send candidate and mandate to external API for scoring
 */
async function computeFitScoreViaAPI(candidate, mandate, firm = null) {
  const { getSetting } = require("./settingsModel.cjs");

  try {
    const apiEndpoint = await getSetting("scoring_api_endpoint");
    const apiKey = await getSetting("scoring_api_key");

    if (!apiEndpoint) {
      console.warn(
        "[scoringModel] No scoring API endpoint configured, falling back to local scoring"
      );
      return await computeFitScore(candidate, mandate, firm);
    }

    console.log("\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║              CALLING EXTERNAL SCORING API                      ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`  🌐 API Endpoint: ${apiEndpoint}`);
    console.log(`  👤 Candidate: ${candidate.name || "Unknown"} (ID: ${candidate.id || "N/A"})`);
    console.log(`  📋 Mandate: ${mandate.name || "Unknown"} (ID: ${mandate.id || "N/A"})`);
    if (firm) {
      console.log(`  🏢 Firm: ${firm.name}`);
    }
    console.log("");

    const payload = {
      candidate: {
        id: candidate.id,
        name: candidate.name,
        current_title: candidate.current_title,
        current_firm: candidate.current_firm,
        location: candidate.location,
        sectors: candidate.sectors || [],
        functions: candidate.functions || [],
        asset_classes: candidate.asset_classes || [],
        geographies: candidate.geographies || [],
        seniority: candidate.seniority,
      },
      mandate: {
        id: mandate.id,
        name: mandate.name,
        firm_id: mandate.firm_id,
        location: mandate.location,
        primary_sector: mandate.primary_sector,
        sectors: mandate.sectors || [],
        functions: mandate.functions || [],
        asset_classes: mandate.asset_classes || [],
        regions: mandate.regions || [],
        seniority_min: mandate.seniority_min,
        seniority_max: mandate.seniority_max,
        status: mandate.status,
      },
      firm: firm
        ? {
            id: firm.id,
            name: firm.name,
            sector_focus: firm.sector_focus || [],
            asset_classes: firm.asset_classes || [],
            regions: firm.regions || [],
            platform_type: firm.platform_type,
          }
        : null,
      config: {
        weights: fitScoringConfig.weights,
        seniority_order: fitScoringConfig.seniority_order,
      },
    };

    console.log("  📤 Sending payload to API...");
    console.log(`     Payload size: ${JSON.stringify(payload).length} bytes`);

    let fetchFn = global.fetch;
    if (!fetchFn) {
      const nf = await import("node-fetch");
      fetchFn = nf.default;
    }

    const headers = {
      "Content-Type": "application/json",
    };
    if (apiKey) {
      headers["Authorization"] = `Bearer ${apiKey}`;
    }

    const response = await fetchFn(apiEndpoint, {
      method: "POST",
      headers,
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`API returned ${response.status}: ${errorText}`);
    }

    const result = await response.json();

    console.log("  📥 API Response received:");
    console.log(`     Status: ${response.status}`);
    console.log(`     Final Score: ${result.finalScore || 0}/100`);
    console.log("");

    if (typeof result.finalScore !== "number" || !result.dimensionScores) {
      throw new Error("Invalid API response format");
    }

    const dims = result.dimensionScores;
    const weights = fitScoringConfig.weights;

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║              API SCORING BREAKDOWN                             ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("  📊 Sector Match:");
    console.log(
      `     • API Score: ${(dims.sector * 100).toFixed(
        1
      )}% | Weight: ${(weights.sector * 100).toFixed(0)}% | Contribution: ${(dims.sector *
        weights.sector *
        100).toFixed(2)} pts`
    );
    console.log("");
    console.log("  🎯 Function Match:");
    console.log(
      `     • API Score: ${(dims.function * 100).toFixed(
        1
      )}% | Weight: ${(weights.function * 100).toFixed(0)}% | Contribution: ${(dims.function *
        weights.function *
        100).toFixed(2)} pts`
    );
    console.log("");
    console.log("  💼 Asset Class Match:");
    console.log(
      `     • API Score: ${(dims.assetClass * 100).toFixed(
        1
      )}% | Weight: ${(weights.assetClass * 100).toFixed(0)}% | Contribution: ${(dims.assetClass *
        weights.assetClass *
        100).toFixed(2)} pts`
    );
    console.log("");
    console.log("  🌍 Geography Match:");
    console.log(
      `     • API Score: ${(dims.geography * 100).toFixed(
        1
      )}% | Weight: ${(weights.geography * 100).toFixed(0)}% | Contribution: ${(dims.geography *
        weights.geography *
        100).toFixed(2)} pts`
    );
    console.log("");
    console.log("  👔 Seniority Match:");
    console.log(
      `     • API Score: ${(dims.seniority * 100).toFixed(
        1
      )}% | Weight: ${(weights.seniority * 100).toFixed(0)}% | Contribution: ${(dims.seniority *
        weights.seniority *
        100).toFixed(2)} pts`
    );
    console.log("");
    console.log("  ═══════════════════════════════════════════════════════════════");
    console.log(`  ✨ FINAL SCORE (from API): ${result.finalScore.toFixed(2)}/100`);
    console.log("  ═══════════════════════════════════════════════════════════════\n");

    return {
      finalScore: result.finalScore,
      dimensionScores: result.dimensionScores,
      apiUsed: true,
      apiResponse: result.metadata || {},
    };
  } catch (error) {
    console.error(
      "╔════════════════════════════════════════════════════════════════╗"
    );
    console.error("║              API SCORING FAILED                                ║");
    console.error(
      "╚════════════════════════════════════════════════════════════════╝"
    );
    console.error(`  ❌ Error: ${error.message}`);
    console.error("  🔄 Falling back to local scoring...\n");

    return computeFitScore(candidate, mandate, firm);
  }
}

/**
 * Get quality threshold values
 */
function getQualityThresholds() {
  return {
    good: cvQualityConfig.cv_quality.good_threshold,
    borderline: cvQualityConfig.cv_quality.borderline_threshold,
  };
}

/**
 * Compute fit score between a candidate and a mandate (with optional firm context)
 */
async function computeFitScore(candidate, mandate, firm = null) {
  const { weights } = fitScoringConfig;

  const sectorRes = await computeSectorMatch(
    candidate.sectors,
    mandate.sectors || [mandate.primary_sector],
    firm ? firm.sector_focus : []
  );
  const functionRes = await computeFunctionMatch(
    candidate.functions,
    mandate.functions || [mandate.primary_function]
  );
  const assetClassRes = await computeAssetClassMatch(
    candidate.asset_classes,
    mandate.asset_classes || [mandate.primary_asset_class],
    firm ? firm.asset_classes : []
  );
  const geographyRes = await computeGeographyMatch(
    candidate.geographies,
    mandate.regions || []
  );
  const seniorityScore = computeSeniorityMatch(
    candidate.seniority,
    mandate.seniority_min,
    mandate.seniority_max
  );

  const finalScore =
    (sectorRes.score * weights.sector +
      functionRes.score * weights.function +
      assetClassRes.score * weights.assetClass +
      geographyRes.score * weights.geography +
      seniorityScore * weights.seniority) *
    100;

  console.log("\n╔════════════════════════════════════════════════════════════════╗");
  console.log("║                    FIT SCORE BREAKDOWN                         ║");
  console.log("╚════════════════════════════════════════════════════════════════╝");
  console.log("  📊 Sector Match (Semantic Tokens):");
  console.log(
    `     • Score: ${(sectorRes.score * 100).toFixed(
      1
    )}% | Weight: ${(weights.sector * 100).toFixed(0)}% | Contribution: ${(sectorRes.score *
      weights.sector *
      100).toFixed(2)} pts`
  );
  console.log(
    `     • Candidate: [${candidate.sectors ? candidate.sectors.join(", ") : "None"}]`
  );
  console.log(
    `     • Mandate: [${
      mandate.sectors && mandate.sectors.length > 0
        ? mandate.sectors.join(", ")
        : mandate.primary_sector || "None"
    }]`
  );
  sectorRes.details.slice(0, 8).forEach((d) => {
    console.log(
      `       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || "∅"} | sim ${(
        d.rawSimilarity * 100
      ).toFixed(1)}% → ${(d.mappedScore * 100).toFixed(1)}%`
    );
  });
  if (firm && firm.sector_focus && firm.sector_focus.length > 0) {
    console.log(`     • Firm Context: [${firm.sector_focus.join(", ")}]`);
  }
  console.log("");
  console.log("  🎯 Function Match (Semantic Tokens):");
  console.log(
    `     • Score: ${(functionRes.score * 100).toFixed(
      1
    )}% | Weight: ${(weights.function * 100).toFixed(0)}% | Contribution: ${(functionRes.score *
      weights.function *
      100).toFixed(2)} pts`
  );
  console.log(
    `     • Candidate: [${candidate.functions ? candidate.functions.join(", ") : "None"}]`
  );
  console.log(
    `     • Mandate: [${
      mandate.functions && mandate.functions.length > 0
        ? mandate.functions.join(", ")
        : mandate.primary_function || "None"
    }]`
  );
  functionRes.details.slice(0, 8).forEach((d) => {
    console.log(
      `       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || "∅"} | sim ${(
        d.rawSimilarity * 100
      ).toFixed(1)}% → ${(d.mappedScore * 100).toFixed(1)}%`
    );
  });
  console.log("");
  console.log("  💼 Asset Class Match (Semantic Tokens):");
  console.log(
    `     • Score: ${(assetClassRes.score * 100).toFixed(
      1
    )}% | Weight: ${(weights.assetClass * 100).toFixed(0)}% | Contribution: ${(assetClassRes.score *
      weights.assetClass *
      100).toFixed(2)} pts`
  );
  console.log(
    `     • Candidate: [${
      candidate.asset_classes ? candidate.asset_classes.join(", ") : "None"
    }]`
  );
  console.log(
    `     • Mandate: [${
      mandate.asset_classes && mandate.asset_classes.length > 0
        ? mandate.asset_classes.join(", ")
        : mandate.primary_asset_class || "None"
    }]`
  );
  assetClassRes.details.slice(0, 8).forEach((d) => {
    console.log(
      `       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || "∅"} | sim ${(
        d.rawSimilarity * 100
      ).toFixed(1)}% → ${(d.mappedScore * 100).toFixed(1)}%`
    );
  });
  if (firm && firm.asset_classes && firm.asset_classes.length > 0) {
    console.log(`     • Firm Context: [${firm.asset_classes.join(", ")}]`);
  }
  console.log("");
  console.log("  🌍 Geography Match (Semantic Tokens):");
  console.log(
    `     • Score: ${(geographyRes.score * 100).toFixed(
      1
    )}% | Weight: ${(weights.geography * 100).toFixed(0)}% | Contribution: ${(geographyRes.score *
      weights.geography *
      100).toFixed(2)} pts`
  );
  console.log(
    `     • Candidate: [${candidate.geographies ? candidate.geographies.join(", ") : "None"}]`
  );
  console.log(
    `     • Mandate: [${mandate.regions ? mandate.regions.join(", ") : "None"}]`
  );
  geographyRes.details.slice(0, 8).forEach((d) => {
    console.log(
      `       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || "∅"} | sim ${(
        d.rawSimilarity * 100
      ).toFixed(1)}% → ${(d.mappedScore * 100).toFixed(1)}%`
    );
  });
  console.log("");
  console.log("  👔 Seniority Match:");
  console.log(
    `     • Score: ${(seniorityScore * 100).toFixed(
      1
    )}% | Weight: ${(weights.seniority * 100).toFixed(0)}% | Contribution: ${(seniorityScore *
      weights.seniority *
      100).toFixed(2)} pts`
  );
  console.log(`     • Candidate: ${candidate.seniority || "Not specified"}`);
  console.log(
    `     • Mandate Range: ${mandate.seniority_min || "Any"} - ${mandate.seniority_max || "Any"}`
  );
  console.log("");
  console.log("  ═══════════════════════════════════════════════════════════════");
  console.log(`  ✨ FINAL SCORE: ${finalScore.toFixed(2)}/100`);
  console.log("  ═══════════════════════════════════════════════════════════════\n");

  return {
    finalScore: Math.min(100, Math.max(0, finalScore)),
    dimensionScores: {
      sector: sectorRes.score,
      function: functionRes.score,
      assetClass: assetClassRes.score,
      geography: geographyRes.score,
      seniority: seniorityScore,
    },
    dimensionDetails: {
      sector: sectorRes.details,
      function: functionRes.details,
      assetClass: assetClassRes.details,
      geography: geographyRes.details,
    },
  };
}

/**
 * Helper: semantic match (unchanged logic)
 */
async function semanticEnhancedMatch(candidateValues, mandateValues, firmValues = []) {
  if (!candidateValues || candidateValues.length === 0) {
    return { score: 0, details: [] };
  }
  if (!mandateValues || mandateValues.length === 0) {
    return { score: 0, details: [] };
  }

  const { embedPhrase, normalizeText } = require("../services/embeddingMapper.cjs");

  const candidateUnique = Array.from(new Set(candidateValues.filter(Boolean)));
  const mandateUnique = Array.from(new Set(mandateValues.filter(Boolean)));
  const firmUnique = Array.from(new Set(firmValues.filter(Boolean)));

  const candidateEmbeddings = {};
  for (const val of candidateUnique) {
    candidateEmbeddings[val] = await embedPhrase(val);
  }
  const firmEmbeddings = {};
  for (const val of firmUnique) {
    firmEmbeddings[val] = await embedPhrase(val);
  }

  const details = [];
  let similarityAccum = 0;

  for (const mandateVal of mandateUnique) {
    const mandateEmb = await embedPhrase(mandateVal);
    let best = { candidateVal: null, similarity: 0 };

    const mandateNorm = normalizeText(mandateVal);
    const directCandidate = candidateUnique.find(
      (cv) => normalizeText(cv) === mandateNorm
    );
    if (directCandidate) {
      best = { candidateVal: directCandidate, similarity: 1.0 };
    } else {
      for (const cv of candidateUnique) {
        const sim = mandateEmb.reduce(
          (acc, v, i) => acc + v * candidateEmbeddings[cv][i],
          0
        );
        if (sim > best.similarity) {
          best = { candidateVal: cv, similarity: sim };
        }
      }
      if (best.similarity < 0.5 && firmUnique.length > 0) {
        for (const fv of firmUnique) {
          const sim = mandateEmb.reduce(
            (acc, v, i) => acc + v * firmEmbeddings[fv][i],
            0
          );
          if (sim > best.similarity) {
            best = { candidateVal: `(firm:${fv})`, similarity: sim };
          }
        }
      }
    }

    let mapped;
    if (best.similarity >= 0.9) mapped = 1.0;
    else if (best.similarity >= 0.8) mapped = 0.85;
    else if (best.similarity >= 0.7) mapped = 0.7;
    else if (best.similarity >= 0.6) mapped = 0.55;
    else if (best.similarity >= 0.5) mapped = 0.4;
    else mapped = 0.0;

    similarityAccum += mapped;
    details.push({
      mandateValue: mandateVal,
      bestCandidateValue: best.candidateVal,
      rawSimilarity: best.similarity,
      mappedScore: mapped,
    });
  }

  const averageScore = similarityAccum / mandateUnique.length;
  return { score: averageScore, details };
}

async function computeSectorMatch(candidateSectors, mandateSectors, firmSectorFocus = []) {
  return semanticEnhancedMatch(candidateSectors, mandateSectors, firmSectorFocus);
}

async function computeFunctionMatch(candidateFunctions, mandateFunctions) {
  return semanticEnhancedMatch(candidateFunctions, mandateFunctions);
}

async function computeAssetClassMatch(candidateAssetClasses, mandateAssetClasses, firmAssetClasses = []) {
  return semanticEnhancedMatch(candidateAssetClasses, mandateAssetClasses, firmAssetClasses);
}

async function computeGeographyMatch(candidateGeographies, mandateRegions) {
  return semanticEnhancedMatch(candidateGeographies, mandateRegions);
}

const SENIORITY_ORDER = ["Analyst", "Associate", "VP", "Director", "MD"];

function computeSeniorityMatch(candidateLevel, minLevel, maxLevel) {
  if (!candidateLevel || !minLevel || !maxLevel) {
    return 0;
  }

  const candidateIndex = SENIORITY_ORDER.findIndex(
    (s) => s.toLowerCase() === candidateLevel.toLowerCase()
  );
  const minIndex = SENIORITY_ORDER.findIndex(
    (s) => s.toLowerCase() === minLevel.toLowerCase()
  );
  const maxIndex = SENIORITY_ORDER.findIndex(
    (s) => s.toLowerCase() === maxLevel.toLowerCase()
  );

  if (candidateIndex === -1 || minIndex === -1 || maxIndex === -1) {
    return 0;
  }

  if (candidateIndex >= minIndex && candidateIndex <= maxIndex) {
    return 1.0;
  }

  if (candidateIndex === minIndex - 1 || candidateIndex === maxIndex + 1) {
    return 0.5;
  }

  return 0;
}

/**
 * Get fit scoring weights
 */
function getFitWeights() {
  // return a shallow clone to avoid accidental mutation
  return { ...fitScoringConfig.weights };
}

/**
 * Get dummy mandate for testing
 */
function getDummyMandate() {
  return {
    primary_sector: "ECM",
    primary_function: "Coverage",
    primary_asset_class: "Equity",
    regions: ["UK"],
    seniority_min: "VP",
    seniority_max: "Director",
  };
}

/**
 * Expose CV weights for logging/diagnostics
 */
function getCvQualityWeights() {
  return { ...cvQualityConfig.cv_quality.weights };
}

/**
 * Save match score to PostgreSQL
 */
async function saveMatchScore(candidateId, mandateId, finalScore, dimensionScores) {
  const result = await query(
    `
    INSERT INTO match_scores (
      candidate_id,
      mandate_id,
      final_score,
      dimension_scores
    ) VALUES ($1, $2, $3, $4)
    RETURNING id;
  `,
    [candidateId, mandateId, finalScore, JSON.stringify(dimensionScores)]
  );

  return result.rows[0].id;
}

/**
 * Get match scores for a candidate (raw rows from match_scores)
 */
async function getMatchScoresForCandidate(candidateId) {
  const result = await query(
    `
    SELECT 
      id,
      candidate_id,
      mandate_id,
      final_score,
      dimension_scores,
      created_at
    FROM match_scores
    WHERE candidate_id = $1
    ORDER BY created_at DESC
  `,
    [candidateId]
  );

  return result.rows.map((row) => ({
    ...row,
    dimension_scores: typeof row.dimension_scores === 'string' 
      ? JSON.parse(row.dimension_scores) 
      : row.dimension_scores,
  }));
}

/**
 * Get top matching candidates for a mandate
 */
async function getTopMatchesForMandate(mandateId, limit = 10) {
  let sql = `
    SELECT 
      c.id,
      c.name,
      c.current_title,
      c.current_firm,
      ms.final_score,
      ms.dimension_scores
    FROM match_scores ms
    JOIN candidates c ON ms.candidate_id = c.id
    WHERE c.status = 'ACTIVE'
  `;

  const params = [];
  if (mandateId === null) {
    sql += " AND ms.mandate_id IS NULL";
  } else {
    sql += " AND ms.mandate_id = $1";
    params.push(mandateId);
  }
  sql += " ORDER BY ms.final_score DESC LIMIT $2";
  params.push(limit);

  const result = await query(sql, params);

  return result.rows.map((row) => ({
    candidate: {
      id: row.id,
      name: row.name,
      current_title: row.current_title,
      current_firm: row.current_firm,
    },
    match_score: {
      final_score: row.final_score,
      dimension_scores: typeof row.dimension_scores === 'string' 
        ? JSON.parse(row.dimension_scores) 
        : row.dimension_scores,
    },
  }));
}

/**
 * Orchestration: Run fit scoring for a candidate against a specific mandate
 */
async function runFitForCandidateAgainstMandate(candidateId, mandateId) {
  const { getCandidateById } = require("./candidateModel.cjs");
  const { getMandateById } = require("./mandateModel.cjs");
  const { getFirmById } = require("./firmModel.cjs");

  try {
    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    const mandate = await getMandateById(mandateId);
    if (!mandate) {
      throw new Error(`Mandate not found: ${mandateId}`);
    }

    const firm = mandate.firm_id ? await getFirmById(mandate.firm_id) : null;

    console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║              STARTING FIT SCORING ANALYSIS                     ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log("");
    console.log("  👤 CANDIDATE PROFILE:");
    console.log(`     • Name: ${candidate.name}`);
    console.log(`     • ID: ${candidateId}`);
    console.log(`     • Current Title: ${candidate.current_title || "N/A"}`);
    console.log(`     • Current Firm: ${candidate.current_firm || "N/A"}`);
    console.log(`     • Location: ${candidate.location || "N/A"}`);
    console.log(`     • Seniority: ${candidate.seniority || "N/A"}`);
    console.log("");
    console.log("  📋 MANDATE DETAILS:");
    console.log(`     • Name: ${mandate.name}`);
    console.log(`     • ID: ${mandateId}`);
    console.log(`     • Status: ${mandate.status}`);
    console.log(`     • Location: ${mandate.location || "N/A"}`);
    console.log(`     • Primary Sector: ${mandate.primary_sector || "N/A"}`);
    console.log(
      `     • Seniority Range: ${mandate.seniority_min || "Any"} - ${
        mandate.seniority_max || "Any"
      }`
    );
    if (firm) {
      console.log("");
      console.log("  🏢 CLIENT FIRM CONTEXT:");
      console.log(`     • Name: ${firm.name}`);
      console.log(`     • Platform Type: ${firm.platform_type || "N/A"}`);
      console.log(
        `     • Sector Focus: [${
          firm.sector_focus ? firm.sector_focus.join(", ") : "None"
        }]`
      );
      console.log(
        `     • Asset Classes: [${
          firm.asset_classes ? firm.asset_classes.join(", ") : "None"
        }]`
      );
      console.log(
        `     • Regions: [${firm.regions ? firm.regions.join(", ") : "None"}]`
      );
    }
    console.log("");

    const { finalScore, dimensionScores, semanticDetails } =
      await computeFitScoreViaAPI(candidate, mandate, firm);

    const matchScoreId = await saveMatchScore(
      candidateId,
      mandateId,
      finalScore,
      dimensionScores
    );

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║                  SCORING COMPLETED SUCCESSFULLY                ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`  ✅ Match Score ID: ${matchScoreId}`);
    console.log(`  ✅ Score saved to database`);
    console.log(`  ✅ Final Score: ${finalScore.toFixed(2)}/100`);
    console.log(
      "════════════════════════════════════════════════════════════════\n\n"
    );

    return {
      matchScoreId,
      finalScore,
      dimensionScores,
      semanticDetails,
      candidate: {
        id: candidate.id,
        name: candidate.name,
      },
      mandate: {
        id: mandate.id,
        name: mandate.name,
      },
      firm: firm ? { id: firm.id, name: firm.name } : null,
    };
  } catch (error) {
    console.error(
      "[scoringModel] Error in runFitForCandidateAgainstMandate:",
      error
    );
    throw error;
  }
}

/**
 * Orchestration: Run fit scoring for a candidate against all OPEN mandates
 */
async function runFitForCandidateAgainstAllMandates(candidateId) {
  const { getCandidateById } = require("./candidateModel.cjs");
  const { listMandates } = require("./mandateModel.cjs");
  const { getFirmById } = require("./firmModel.cjs");

  try {
    const candidate = await getCandidateById(candidateId);
    if (!candidate) {
      throw new Error(`Candidate not found: ${candidateId}`);
    }

    const mandates = await listMandates({ status: "OPEN" });

    console.log("\n\n╔════════════════════════════════════════════════════════════════╗");
    console.log("║           BATCH SCORING: CANDIDATE vs ALL MANDATES            ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(`  👤 Candidate: ${candidate.name} (ID: ${candidateId})`);
    console.log(`  📋 Total OPEN Mandates: ${mandates.length}`);
    console.log(
      "════════════════════════════════════════════════════════════════\n"
    );

    const results = [];
    let processedCount = 0;

    for (const mandate of mandates) {
      try {
        processedCount++;
        console.log(
          `  ⏳ Processing mandate ${processedCount}/${mandates.length}: ${mandate.name}`
        );

        const firm = mandate.firm_id ? await getFirmById(mandate.firm_id) : null;

        const { finalScore, dimensionScores, semanticDetails } =
          await computeFitScoreViaAPI(candidate, mandate, firm);

        await saveMatchScore(candidateId, mandate.id, finalScore, dimensionScores);

        console.log(`     ✅ Score: ${finalScore.toFixed(2)}/100 - Saved to database\n`);

        results.push({
          mandate: {
            id: mandate.id,
            name: mandate.name,
            firm_id: mandate.firm_id,
          },
          firm: firm ? { id: firm.id, name: firm.name } : null,
          finalScore,
          dimensionScores,
          semanticDetails,
        });
      } catch (error) {
        console.error(
          `     ❌ Error scoring mandate ${mandate.id}: ${error.message}\n`
        );
      }
    }

    results.sort((a, b) => b.finalScore - a.finalScore);

    console.log("╔════════════════════════════════════════════════════════════════╗");
    console.log("║              BATCH SCORING COMPLETED                           ║");
    console.log("╚════════════════════════════════════════════════════════════════╝");
    console.log(
      `  ✅ Total Processed: ${results.length}/${mandates.length} mandates`
    );
    console.log("");
    console.log("  🏆 TOP MATCHES:");
    results.slice(0, 5).forEach((r, i) => {
      const firmName = r.firm ? ` (${r.firm.name})` : "";
      console.log(`     ${i + 1}. ${r.mandate.name}${firmName}`);
      console.log(`        Score: ${r.finalScore.toFixed(2)}/100`);
    });
    console.log(
      "════════════════════════════════════════════════════════════════\n\n"
    );

    return results;
  } catch (error) {
    console.error(
      "[scoringModel] Error in runFitForCandidateAgainstAllMandates:",
      error
    );
    throw error;
  }
}

/**
 * Get match scores for a mandate (list of candidates scored against it)
 */
async function listMatchScoresForMandate(mandateId) {
  const result = await query(
    `
    SELECT 
      ms.id,
      ms.candidate_id,
      ms.final_score,
      ms.dimension_scores,
      ms.created_at,
      c.name AS candidate_name,
      c.current_title,
      c.current_firm
    FROM match_scores ms
    JOIN candidates c ON ms.candidate_id = c.id
    WHERE ms.mandate_id = $1
    ORDER BY ms.final_score DESC
  `,
    [mandateId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    candidate_id: row.candidate_id,
    candidate_name: row.candidate_name,
    current_title: row.current_title,
    current_firm: row.current_firm,
    final_score: row.final_score,
    dimension_scores: typeof row.dimension_scores === 'string' 
      ? JSON.parse(row.dimension_scores) 
      : row.dimension_scores,
    created_at: row.created_at,
  }));
}

/**
 * Get match scores for a candidate (list of mandates scored against)
 */
async function listMatchScoresForCandidate(candidateId) {
  const result = await query(
    `
    SELECT 
      ms.id,
      ms.mandate_id,
      ms.final_score,
      ms.dimension_scores,
      ms.created_at,
      m.name AS mandate_name,
      m.firm_id,
      f.name AS firm_name
    FROM match_scores ms
    JOIN mandates m ON ms.mandate_id = m.id
    LEFT JOIN firms f ON m.firm_id = f.id
    WHERE ms.candidate_id = $1
    ORDER BY ms.final_score DESC
  `,
    [candidateId]
  );

  return result.rows.map((row) => ({
    id: row.id,
    mandate_id: row.mandate_id,
    mandate_name: row.mandate_name,
    firm_id: row.firm_id,
    firm_name: row.firm_name,
    final_score: row.final_score,
    dimension_scores: typeof row.dimension_scores === 'string' 
      ? JSON.parse(row.dimension_scores) 
      : row.dimension_scores,
    created_at: row.created_at,
  }));
}

module.exports = {
  initMatchScoresTable,
  computeCvQuality,
  getQualityThresholds,
  getCvQualityWeights,
  computeFitScore,
  computeFitScoreViaAPI,
  getFitWeights,
  getDummyMandate,
  saveMatchScore,
  getMatchScoresForCandidate,
  getTopMatchesForMandate,
  runFitForCandidateAgainstMandate,
  runFitForCandidateAgainstAllMandates,
  listMatchScoresForMandate,
  listMatchScoresForCandidate,
};



// const initDatabase = require("../db/connection.cjs");
// const fs = require("fs");
// const path = require("path");

// /**
//  * Load scoring configurations
//  */
// let cvQualityConfig;
// let fitScoringConfig;

// try {
//   const cvQualityPath = path.join(__dirname, '../../config/scoring/cv_quality.json');
//   const fitScoringPath = path.join(__dirname, '../../config/scoring/fit_scoring.json');
  
//   cvQualityConfig = JSON.parse(fs.readFileSync(cvQualityPath, 'utf-8'));
//   fitScoringConfig = JSON.parse(fs.readFileSync(fitScoringPath, 'utf-8'));
// } catch (error) {
//   console.error('Failed to load scoring configurations:', error);
//   throw new Error('Scoring configuration files are missing or invalid');
// }

// /**
//  * Initialize match_scores table
//  */
// async function initMatchScoresTable(db) {
//   if (!db) {
//     db = await initDatabase();
//   }
  
//   await db.exec(`
//     CREATE TABLE IF NOT EXISTS match_scores (
//       id INTEGER PRIMARY KEY AUTOINCREMENT,
//       candidate_id INTEGER NOT NULL,
//       mandate_id INTEGER,
//       final_score REAL NOT NULL,
//       dimension_scores TEXT NOT NULL,
//       created_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       updated_at TEXT DEFAULT CURRENT_TIMESTAMP,
//       CHECK (final_score >= 0 AND final_score <= 100),
//       FOREIGN KEY (candidate_id) REFERENCES candidates(id) ON DELETE CASCADE
//     );
//   `);

//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_match_scores_candidate_id ON match_scores(candidate_id);
//   `);
  
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_match_scores_mandate_id ON match_scores(mandate_id);
//   `);
  
//   await db.exec(`
//     CREATE INDEX IF NOT EXISTS idx_match_scores_final_score ON match_scores(final_score DESC);
//   `);
  
//   await db.exec(`
//     CREATE TRIGGER IF NOT EXISTS trigger_match_scores_updated_at
//       AFTER UPDATE ON match_scores
//       FOR EACH ROW
//       BEGIN
//         UPDATE match_scores SET updated_at = CURRENT_TIMESTAMP WHERE id = NEW.id;
//       END;
//   `);
// }

// /**
//  * Compute CV quality score based on completeness, experience, education, and parser confidence
//  */
// function computeCvQuality(parsed) {
//   console.log('\n╔════════════════════════════════════════════════════════════════╗');
//   console.log('║                    CV QUALITY SCORING                          ║');
//   console.log('╚════════════════════════════════════════════════════════════════╝');
  
//   const { weights } = cvQualityConfig.cv_quality;
  
//   console.log('\n📊 Configured Weights:');
//   console.log(`  • Completeness: ${weights.completeness * 100}%`);
//   console.log(`  • Experience: ${weights.experience * 100}%`);
//   console.log(`  • Education: ${weights.education * 100}%`);
//   console.log(`  • Parser Confidence: ${weights.parser_confidence * 100}%`);

//   // 1. Completeness Score: Check required fields
//   const completenessScore = computeCompletenessScore(parsed);

//   // 2. Experience Score: % of experience entries with firm + title + dateFrom
//   const experienceScore = computeExperienceScore(parsed);

//   // 3. Education Score: % of education entries with institution
//   const educationScore = computeEducationScore(parsed);

//   // 4. Parser Confidence Score: Based on raw text length
//   const parserConfidenceScore = computeParserConfidenceScore(parsed);

//   // Weighted final score
//   console.log('\n🧮 Calculating Weighted Score:');
//   const completenessContribution = completenessScore * weights.completeness;
//   const experienceContribution = experienceScore * weights.experience;
//   const educationContribution = educationScore * weights.education;
//   const parserConfidenceContribution = parserConfidenceScore * weights.parser_confidence;
  
//   console.log(`  Completeness:       ${completenessScore.toFixed(4)} × ${weights.completeness} = ${completenessContribution.toFixed(4)}`);
//   console.log(`  Experience:         ${experienceScore.toFixed(4)} × ${weights.experience} = ${experienceContribution.toFixed(4)}`);
//   console.log(`  Education:          ${educationScore.toFixed(4)} × ${weights.education} = ${educationContribution.toFixed(4)}`);
//   console.log(`  Parser Confidence:  ${parserConfidenceScore.toFixed(4)} × ${weights.parser_confidence} = ${parserConfidenceContribution.toFixed(4)}`);
  
//   const score = 
//     completenessContribution +
//     experienceContribution +
//     educationContribution +
//     parserConfidenceContribution;

//   const finalScore = Math.min(1.0, Math.max(0.0, score));
  
//   console.log('\n✅ Final Quality Score:');
//   console.log(`  Raw Score: ${score.toFixed(4)}`);
//   console.log(`  Clamped Score (0-1): ${finalScore.toFixed(4)}`);
//   console.log(`  Percentage: ${(finalScore * 100).toFixed(2)}%`);
//   console.log('╚════════════════════════════════════════════════════════════════╝\n');

//   return {
//     score: finalScore,
//     breakdown: {
//       completeness: completenessScore,
//       experience: experienceScore,
//       education: educationScore,
//       parser_confidence: parserConfidenceScore,
//     },
//   };
// }

// /**
//  * Check completeness of required fields: name, current_title, current_firm, location
//  */
// function computeCompletenessScore(parsed) {
//   console.log('\n📋 1. Completeness Score:');
//   console.log('   Required Fields: name, current_title, current_firm, location');
  
//   const requiredFields = [
//     { name: 'name', value: parsed.name },
//     { name: 'current_title', value: parsed.current_title },
//     { name: 'current_firm', value: parsed.current_firm },
//     { name: 'location', value: parsed.location },
//   ];

//   console.log('   Field Values:');
//   requiredFields.forEach(field => {
//     const isFilled = field.value !== undefined && field.value !== null && String(field.value).trim() !== '';
//     const status = isFilled ? '✓' : '✗';
//     const displayValue = isFilled ? field.value : '(empty)';
//     console.log(`     ${status} ${field.name}: ${displayValue}`);
//   });

//   const filledFields = requiredFields.filter(
//     (field) => field.value !== undefined && field.value !== null && String(field.value).trim() !== ''
//   ).length;

//   const score = filledFields / requiredFields.length;
//   console.log(`   Score: ${filledFields}/${requiredFields.length} = ${score.toFixed(4)}`);

//   return score;
// }

// /**
//  * Compute experience score: % of experience entries with firm + title + dateFrom
//  */
// function computeExperienceScore(parsed) {
//   console.log('\n💼 2. Experience Score:');
  
//   // Check if experience exists and is an array
//   if (!parsed.experience || !Array.isArray(parsed.experience) || parsed.experience.length === 0) {
//     console.log('   No experience entries found');
//     console.log(`   Experience data: ${parsed.experience === undefined ? 'undefined' : parsed.experience === null ? 'null' : typeof parsed.experience}`);
//     console.log('   Score: 0/0 = 0.0000');
//     return 0;
//   }

//   console.log(`   Total Experience Entries: ${parsed.experience.length}`);
//   console.log('   Required Fields per Entry: firm, title, dateFrom');
  
//   let completeEntries = 0;
//   parsed.experience.forEach((exp, index) => {
//     const hasFirm = exp.firm && String(exp.firm).trim() !== '';
//     const hasTitle = exp.title && String(exp.title).trim() !== '';
//     const hasDateFrom = exp.dateFrom && String(exp.dateFrom).trim() !== '';
//     const isComplete = hasFirm && hasTitle && hasDateFrom;
    
//     if (isComplete) completeEntries++;
    
//     const status = isComplete ? '✓' : '✗';
//     console.log(`     ${status} Entry ${index + 1}:`);
//     console.log(`       Firm: ${hasFirm ? exp.firm : '(empty)'}`);
//     console.log(`       Title: ${hasTitle ? exp.title : '(empty)'}`);
//     console.log(`       DateFrom: ${hasDateFrom ? exp.dateFrom : '(empty)'}`);
//   });

//   const score = completeEntries / parsed.experience.length;
//   console.log(`   Score: ${completeEntries}/${parsed.experience.length} = ${score.toFixed(4)}`);

//   return score;
// }

// /**
//  * Compute education score: % of education entries with institution
//  */
// function computeEducationScore(parsed) {
//   console.log('\n🎓 3. Education Score:');
  
//   // Check if education exists and is an array
//   if (!parsed.education || !Array.isArray(parsed.education) || parsed.education.length === 0) {
//     console.log('   No education entries found');
//     console.log(`   Education data: ${parsed.education === undefined ? 'undefined' : parsed.education === null ? 'null' : typeof parsed.education}`);
//     console.log('   Score: 0/0 = 0.0000');
//     return 0;
//   }

//   console.log(`   Total Education Entries: ${parsed.education.length}`);
//   console.log('   Required Field per Entry: institution');
  
//   let completeEntries = 0;
//   parsed.education.forEach((edu, index) => {
//     const hasInstitution = edu.institution && String(edu.institution).trim() !== '';
//     if (hasInstitution) completeEntries++;
    
//     const status = hasInstitution ? '✓' : '✗';
//     console.log(`     ${status} Entry ${index + 1}:`);
//     console.log(`       Institution: ${hasInstitution ? edu.institution : '(empty)'}`);
//     if (edu.degree) console.log(`       Degree: ${edu.degree}`);
//   });

//   const score = completeEntries / parsed.education.length;
//   console.log(`   Score: ${completeEntries}/${parsed.education.length} = ${score.toFixed(4)}`);

//   return score;
// }

// /**
//  * Compute parser confidence score based on raw text length
//  */
// function computeParserConfidenceScore(parsed) {
//   console.log('\n📄 4. Parser Confidence Score:');
  
//   const textLength = parsed.raw_text?.length || 0;
//   console.log(`   Raw Text Length: ${textLength} characters`);

//   let score;
//   let reason;
  
//   if (textLength < 500) {
//     score = 0.2;
//     reason = 'Too short, likely incomplete';
//   } else if (textLength > 30000) {
//     score = 0.3;
//     reason = 'Too long, likely parsing issues';
//   } else {
//     score = 1.0;
//     reason = 'Good length';
//   }
  
//   console.log(`   Score: ${score.toFixed(4)} (${reason})`);
//   console.log(`   Thresholds: < 500 = 0.2, > 30000 = 0.3, otherwise = 1.0`);

//   return score;
// }

// /**
//  * API-based scoring: Send candidate and mandate to external API for scoring
//  * This replaces local scoring logic to avoid mapping issues
//  */
// async function computeFitScoreViaAPI(candidate, mandate, firm = null) {
//   const { getSetting } = require('./settingsModel.cjs');
  
//   try {
//     // Get API endpoint from settings
//     const apiEndpoint = await getSetting('scoring_api_endpoint');
//     const apiKey = await getSetting('scoring_api_key');
    
//     if (!apiEndpoint) {
//       console.warn('[scoringModel] No scoring API endpoint configured, falling back to local scoring');
//       return await computeFitScore(candidate, mandate, firm);
//     }

//     console.log('\n╔════════════════════════════════════════════════════════════════╗');
//     console.log('║              CALLING EXTERNAL SCORING API                      ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log(`  🌐 API Endpoint: ${apiEndpoint}`);
//     console.log(`  👤 Candidate: ${candidate.name || 'Unknown'} (ID: ${candidate.id || 'N/A'})`);
//     console.log(`  📋 Mandate: ${mandate.name || 'Unknown'} (ID: ${mandate.id || 'N/A'})`);
//     if (firm) {
//       console.log(`  🏢 Firm: ${firm.name}`);
//     }
//     console.log('');

//     // Prepare payload for API
//     const payload = {
//       candidate: {
//         id: candidate.id,
//         name: candidate.name,
//         current_title: candidate.current_title,
//         current_firm: candidate.current_firm,
//         location: candidate.location,
//         sectors: candidate.sectors || [],
//         functions: candidate.functions || [],
//         asset_classes: candidate.asset_classes || [],
//         geographies: candidate.geographies || [],
//         seniority: candidate.seniority,
//       },
//       mandate: {
//         id: mandate.id,
//         name: mandate.name,
//         firm_id: mandate.firm_id,
//         location: mandate.location,
//         primary_sector: mandate.primary_sector,
//         sectors: mandate.sectors || [],
//         functions: mandate.functions || [],
//         asset_classes: mandate.asset_classes || [],
//         regions: mandate.regions || [],
//         seniority_min: mandate.seniority_min,
//         seniority_max: mandate.seniority_max,
//         status: mandate.status,
//       },
//       firm: firm ? {
//         id: firm.id,
//         name: firm.name,
//         sector_focus: firm.sector_focus || [],
//         asset_classes: firm.asset_classes || [],
//         regions: firm.regions || [],
//         platform_type: firm.platform_type,
//       } : null,
//       // Include scoring configuration
//       config: {
//         weights: fitScoringConfig.weights,
//         seniority_order: fitScoringConfig.seniority_order,
//       }
//     };

//     console.log('  📤 Sending payload to API...');
//     console.log(`     Payload size: ${JSON.stringify(payload).length} bytes`);

//     // Make API request
//     let fetchFn = global.fetch;
//     if (!fetchFn) {
//       const nf = await import('node-fetch');
//       fetchFn = nf.default;
//     }

//     const headers = {
//       'Content-Type': 'application/json',
//     };

//     if (apiKey) {
//       headers['Authorization'] = `Bearer ${apiKey}`;
//     }

//     const response = await fetchFn(apiEndpoint, {
//       method: 'POST',
//       headers,
//       body: JSON.stringify(payload),
//     });

//     if (!response.ok) {
//       const errorText = await response.text();
//       throw new Error(`API returned ${response.status}: ${errorText}`);
//     }

//     const result = await response.json();
    
//     console.log('  📥 API Response received:');
//     console.log(`     Status: ${response.status}`);
//     console.log(`     Final Score: ${result.finalScore || 0}/100`);
//     console.log('');

//     // Validate API response structure
//     if (typeof result.finalScore !== 'number' || !result.dimensionScores) {
//       throw new Error('Invalid API response format');
//     }

//     // Log detailed breakdown from API
//     const dims = result.dimensionScores;
//     const weights = fitScoringConfig.weights;

//     console.log('╔════════════════════════════════════════════════════════════════╗');
//     console.log('║              API SCORING BREAKDOWN                             ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log('  📊 Sector Match:');
//     console.log(`     • API Score: ${(dims.sector * 100).toFixed(1)}% | Weight: ${(weights.sector * 100).toFixed(0)}% | Contribution: ${(dims.sector * weights.sector * 100).toFixed(2)} pts`);
//     console.log('');
//     console.log('  🎯 Function Match:');
//     console.log(`     • API Score: ${(dims.function * 100).toFixed(1)}% | Weight: ${(weights.function * 100).toFixed(0)}% | Contribution: ${(dims.function * weights.function * 100).toFixed(2)} pts`);
//     console.log('');
//     console.log('  💼 Asset Class Match:');
//     console.log(`     • API Score: ${(dims.assetClass * 100).toFixed(1)}% | Weight: ${(weights.assetClass * 100).toFixed(0)}% | Contribution: ${(dims.assetClass * weights.assetClass * 100).toFixed(2)} pts`);
//     console.log('');
//     console.log('  🌍 Geography Match:');
//     console.log(`     • API Score: ${(dims.geography * 100).toFixed(1)}% | Weight: ${(weights.geography * 100).toFixed(0)}% | Contribution: ${(dims.geography * weights.geography * 100).toFixed(2)} pts`);
//     console.log('');
//     console.log('  👔 Seniority Match:');
//     console.log(`     • API Score: ${(dims.seniority * 100).toFixed(1)}% | Weight: ${(weights.seniority * 100).toFixed(0)}% | Contribution: ${(dims.seniority * weights.seniority * 100).toFixed(2)} pts`);
//     console.log('');
//     console.log('  ═══════════════════════════════════════════════════════════════');
//     console.log(`  ✨ FINAL SCORE (from API): ${result.finalScore.toFixed(2)}/100`);
//     console.log('  ═══════════════════════════════════════════════════════════════\n');

//     return {
//       finalScore: result.finalScore,
//       dimensionScores: result.dimensionScores,
//       apiUsed: true,
//       apiResponse: result.metadata || {},
//     };

//   } catch (error) {
//     console.error('╔════════════════════════════════════════════════════════════════╗');
//     console.error('║              API SCORING FAILED                                ║');
//     console.error('╚════════════════════════════════════════════════════════════════╝');
//     console.error(`  ❌ Error: ${error.message}`);
//     console.error('  🔄 Falling back to local scoring...\n');
    
//     // Fallback to local scoring
//     return computeFitScore(candidate, mandate, firm);
//   }
// }

// /**
//  * Get quality threshold values
//  */
// function getQualityThresholds() {
//   return {
//     good: cvQualityConfig.cv_quality.good_threshold,
//     borderline: cvQualityConfig.cv_quality.borderline_threshold,
//   };
// }

// /**
//  * Compute fit score between a candidate and a mandate (with optional firm context)
//  */
// async function computeFitScore(candidate, mandate, firm = null) {
//   const { weights } = fitScoringConfig;

//   // Compute dimension scores with semantic token similarity
//   const sectorRes = await computeSectorMatch(
//     candidate.sectors,
//     mandate.sectors || [mandate.primary_sector],
//     firm ? firm.sector_focus : []
//   );
//   const functionRes = await computeFunctionMatch(
//     candidate.functions,
//     mandate.functions || [mandate.primary_function]
//   );
//   const assetClassRes = await computeAssetClassMatch(
//     candidate.asset_classes,
//     mandate.asset_classes || [mandate.primary_asset_class],
//     firm ? firm.asset_classes : []
//   );
//   const geographyRes = await computeGeographyMatch(
//     candidate.geographies,
//     mandate.regions || []
//   );
//   const seniorityScore = computeSeniorityMatch(
//     candidate.seniority,
//     mandate.seniority_min,
//     mandate.seniority_max
//   );

//   const finalScore = (
//     sectorRes.score * weights.sector +
//     functionRes.score * weights.function +
//     assetClassRes.score * weights.assetClass +
//     geographyRes.score * weights.geography +
//     seniorityScore * weights.seniority
//   ) * 100;

//   console.log('\n╔════════════════════════════════════════════════════════════════╗');
//   console.log('║                    FIT SCORE BREAKDOWN                         ║');
//   console.log('╚════════════════════════════════════════════════════════════════╝');
//   console.log('  📊 Sector Match (Semantic Tokens):');
//   console.log(`     • Score: ${(sectorRes.score * 100).toFixed(1)}% | Weight: ${(weights.sector * 100).toFixed(0)}% | Contribution: ${(sectorRes.score * weights.sector * 100).toFixed(2)} pts`);
//   console.log(`     • Candidate: [${candidate.sectors ? candidate.sectors.join(', ') : 'None'}]`);
//   console.log(`     • Mandate: [${(mandate.sectors && mandate.sectors.length>0) ? mandate.sectors.join(', ') : mandate.primary_sector || 'None'}]`);
//   sectorRes.details.slice(0,8).forEach(d => {
//     console.log(`       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || '∅'} | sim ${(d.rawSimilarity*100).toFixed(1)}% → ${(d.mappedScore*100).toFixed(1)}%`);
//   });
//   if (firm && firm.sector_focus && firm.sector_focus.length > 0) {
//     console.log(`     • Firm Context: [${firm.sector_focus.join(', ')}]`);
//   }
//   console.log('');
//   console.log('  🎯 Function Match (Semantic Tokens):');
//   console.log(`     • Score: ${(functionRes.score * 100).toFixed(1)}% | Weight: ${(weights.function * 100).toFixed(0)}% | Contribution: ${(functionRes.score * weights.function * 100).toFixed(2)} pts`);
//   console.log(`     • Candidate: [${candidate.functions ? candidate.functions.join(', ') : 'None'}]`);
//   console.log(`     • Mandate: [${(mandate.functions && mandate.functions.length>0) ? mandate.functions.join(', ') : mandate.primary_function || 'None'}]`);
//   functionRes.details.slice(0,8).forEach(d => {
//     console.log(`       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || '∅'} | sim ${(d.rawSimilarity*100).toFixed(1)}% → ${(d.mappedScore*100).toFixed(1)}%`);
//   });
//   console.log('');
//   console.log('  💼 Asset Class Match (Semantic Tokens):');
//   console.log(`     • Score: ${(assetClassRes.score * 100).toFixed(1)}% | Weight: ${(weights.assetClass * 100).toFixed(0)}% | Contribution: ${(assetClassRes.score * weights.assetClass * 100).toFixed(2)} pts`);
//   console.log(`     • Candidate: [${candidate.asset_classes ? candidate.asset_classes.join(', ') : 'None'}]`);
//   console.log(`     • Mandate: [${(mandate.asset_classes && mandate.asset_classes.length>0) ? mandate.asset_classes.join(', ') : mandate.primary_asset_class || 'None'}]`);
//   assetClassRes.details.slice(0,8).forEach(d => {
//     console.log(`       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || '∅'} | sim ${(d.rawSimilarity*100).toFixed(1)}% → ${(d.mappedScore*100).toFixed(1)}%`);
//   });
//   if (firm && firm.asset_classes && firm.asset_classes.length > 0) {
//     console.log(`     • Firm Context: [${firm.asset_classes.join(', ')}]`);
//   }
//   console.log('');
//   console.log('  🌍 Geography Match (Semantic Tokens):');
//   console.log(`     • Score: ${(geographyRes.score * 100).toFixed(1)}% | Weight: ${(weights.geography * 100).toFixed(0)}% | Contribution: ${(geographyRes.score * weights.geography * 100).toFixed(2)} pts`);
//   console.log(`     • Candidate: [${candidate.geographies ? candidate.geographies.join(', ') : 'None'}]`);
//   console.log(`     • Mandate: [${mandate.regions ? mandate.regions.join(', ') : 'None'}]`);
//   geographyRes.details.slice(0,8).forEach(d => {
//     console.log(`       - ${d.mandateValue} ⇒ ${d.bestCandidateValue || '∅'} | sim ${(d.rawSimilarity*100).toFixed(1)}% → ${(d.mappedScore*100).toFixed(1)}%`);
//   });
//   console.log('');
//   console.log('  👔 Seniority Match:');
//   console.log(`     • Score: ${(seniorityScore * 100).toFixed(1)}% | Weight: ${(weights.seniority * 100).toFixed(0)}% | Contribution: ${(seniorityScore * weights.seniority * 100).toFixed(2)} pts`);
//   console.log(`     • Candidate: ${candidate.seniority || 'Not specified'}`);
//   console.log(`     • Mandate Range: ${mandate.seniority_min || 'Any'} - ${mandate.seniority_max || 'Any'}`);
//   console.log('');
//   // No separate semantic block; semantics applied in each dimension above
//   console.log('  ═══════════════════════════════════════════════════════════════');
//   console.log(`  ✨ FINAL SCORE: ${finalScore.toFixed(2)}/100`);
//   console.log('  ═══════════════════════════════════════════════════════════════\n');

//   return {
//     finalScore: Math.min(100, Math.max(0, finalScore)),
//     dimensionScores: {
//       sector: sectorRes.score,
//       function: functionRes.score,
//       assetClass: assetClassRes.score,
//       geography: geographyRes.score,
//       seniority: seniorityScore,
//     },
//     dimensionDetails: {
//       sector: sectorRes.details,
//       function: functionRes.details,
//       assetClass: assetClassRes.details,
//       geography: geographyRes.details,
//     }
//   };
// }

// /**
//  * Helper: Compute overlap score between two arrays
//  */
// async function semanticEnhancedMatch(candidateValues, mandateValues, firmValues = []) {
//   if (!candidateValues || candidateValues.length === 0) {
//     return { score: 0, details: [] };
//   }
//   if (!mandateValues || mandateValues.length === 0) {
//     return { score: 0, details: [] };
//   }

//   const { embedPhrase, normalizeText } = require('../services/embeddingMapper.cjs');

//   // Dedup & normalize
//   const candidateUnique = Array.from(new Set(candidateValues.filter(Boolean)));
//   const mandateUnique = Array.from(new Set(mandateValues.filter(Boolean)));
//   const firmUnique = Array.from(new Set(firmValues.filter(Boolean)));

//   // Pre-embed candidate & firm values
//   const candidateEmbeddings = {};
//   for (const val of candidateUnique) {
//     candidateEmbeddings[val] = await embedPhrase(val);
//   }
//   const firmEmbeddings = {};
//   for (const val of firmUnique) {
//     firmEmbeddings[val] = await embedPhrase(val);
//   }

//   const details = [];
//   let similarityAccum = 0;

//   for (const mandateVal of mandateUnique) {
//     const mandateEmb = await embedPhrase(mandateVal);
//     let best = { candidateVal: null, similarity: 0 };

//     // Direct lexical match short-circuit
//     const mandateNorm = normalizeText(mandateVal);
//     const directCandidate = candidateUnique.find(cv => normalizeText(cv) === mandateNorm);
//     if (directCandidate) {
//       best = { candidateVal: directCandidate, similarity: 1.0 };
//     } else {
//       // Compute max cosine among candidate phrases
//       for (const cv of candidateUnique) {
//         const sim = mandateEmb.reduce((acc, v, i) => acc + v * candidateEmbeddings[cv][i], 0); // embeddings are normalized
//         if (sim > best.similarity) {
//           best = { candidateVal: cv, similarity: sim };
//         }
//       }
//       // Consider firm context if still low (<0.5)
//       if (best.similarity < 0.5 && firmUnique.length > 0) {
//         for (const fv of firmUnique) {
//           const sim = mandateEmb.reduce((acc, v, i) => acc + v * firmEmbeddings[fv][i], 0);
//           if (sim > best.similarity) {
//             best = { candidateVal: `(firm:${fv})`, similarity: sim };
//           }
//         }
//       }
//     }

//     // Map raw similarity to contribution score for this mandate token
//     let mapped;
//     if (best.similarity >= 0.90) mapped = 1.0;
//     else if (best.similarity >= 0.80) mapped = 0.85;
//     else if (best.similarity >= 0.70) mapped = 0.70;
//     else if (best.similarity >= 0.60) mapped = 0.55;
//     else if (best.similarity >= 0.50) mapped = 0.40;
//     else mapped = 0.0;

//     similarityAccum += mapped;
//     details.push({
//       mandateValue: mandateVal,
//       bestCandidateValue: best.candidateVal,
//       rawSimilarity: best.similarity,
//       mappedScore: mapped,
//     });
//   }

//   const averageScore = similarityAccum / mandateUnique.length;
//   return { score: averageScore, details };
// }

// /**
//  * Compute sector match score with firm context
//  */
// async function computeSectorMatch(candidateSectors, mandateSectors, firmSectorFocus = []) {
//   return await semanticEnhancedMatch(candidateSectors, mandateSectors, firmSectorFocus);
// }

// /**
//  * Compute function match score
//  */
// async function computeFunctionMatch(candidateFunctions, mandateFunctions) {
//   return await semanticEnhancedMatch(candidateFunctions, mandateFunctions);
// }

// /**
//  * Compute asset class match score with firm context
//  */
// async function computeAssetClassMatch(candidateAssetClasses, mandateAssetClasses, firmAssetClasses = []) {
//   return await semanticEnhancedMatch(candidateAssetClasses, mandateAssetClasses, firmAssetClasses);
// }

// /**
//  * Compute geography match score
//  */
// async function computeGeographyMatch(candidateGeographies, mandateRegions) {
//   return await semanticEnhancedMatch(candidateGeographies, mandateRegions);
// }

// /**
//  * Seniority levels in order
//  */
// const SENIORITY_ORDER = ["Analyst", "Associate", "VP", "Director", "MD"];

// /**
//  * Compute seniority match score
//  */
// function computeSeniorityMatch(candidateLevel, minLevel, maxLevel) {
//   if (!candidateLevel || !minLevel || !maxLevel) {
//     return 0;
//   }

//   const candidateIndex = SENIORITY_ORDER.findIndex(
//     (s) => s.toLowerCase() === candidateLevel.toLowerCase()
//   );
//   const minIndex = SENIORITY_ORDER.findIndex((s) => s.toLowerCase() === minLevel.toLowerCase());
//   const maxIndex = SENIORITY_ORDER.findIndex((s) => s.toLowerCase() === maxLevel.toLowerCase());

//   if (candidateIndex === -1 || minIndex === -1 || maxIndex === -1) {
//     return 0;
//   }

//   // Perfect match: within range
//   if (candidateIndex >= minIndex && candidateIndex <= maxIndex) {
//     return 1.0;
//   }

//   // One step outside range
//   if (candidateIndex === minIndex - 1 || candidateIndex === maxIndex + 1) {
//     return 0.5;
//   }

//   return 0;
// }

// /**
//  * Get fit scoring weights
//  */
// function getFitWeights() {
//   return fitScoringConfig.weights;
// }

// /**
//  * Get dummy mandate for testing
//  */
// function getDummyMandate() {
//   return {
//     primary_sector: 'ECM',
//     primary_function: 'Coverage',
//     primary_asset_class: 'Equity',
//     regions: ['UK'],
//     seniority_min: 'VP',
//     seniority_max: 'Director',
//   };
// }

// /**
//  * Expose weights for logging/diagnostics
//  */
// function getCvQualityWeights() {
//   return { ...cvQualityConfig.cv_quality.weights };
// }

// function getFitWeights() {
//   return { ...fitScoringConfig.weights };
// }

// /**
//  * Save match score to database
//  */
// async function saveMatchScore(candidateId, mandateId, finalScore, dimensionScores) {
//   const db = await initDatabase();
  
//   const result = await db.run(`
//     INSERT INTO match_scores (
//       candidate_id,
//       mandate_id,
//       final_score,
//       dimension_scores
//     ) VALUES (?, ?, ?, ?)
//   `, [
//     candidateId,
//     mandateId,
//     finalScore,
//     JSON.stringify(dimensionScores)
//   ]);

//   return result.lastID;
// }

// /**
//  * Get match scores for a candidate
//  */
// async function getMatchScoresForCandidate(candidateId) {
//   const db = await initDatabase();
  
//   const rows = await db.all(`
//     SELECT 
//       id,
//       candidate_id,
//       mandate_id,
//       final_score,
//       dimension_scores,
//       created_at
//     FROM match_scores
//     WHERE candidate_id = ?
//     ORDER BY created_at DESC
//   `, [candidateId]);
  
//   return rows.map(row => ({
//     ...row,
//     dimension_scores: JSON.parse(row.dimension_scores)
//   }));
// }

// /**
//  * Get top matching candidates for a mandate
//  */
// async function getTopMatchesForMandate(mandateId, limit = 10) {
//   const db = await initDatabase();
  
//   let query = `
//     SELECT 
//       c.id,
//       c.name,
//       c.current_title,
//       c.current_firm,
//       ms.final_score,
//       ms.dimension_scores
//     FROM match_scores ms
//     JOIN candidates c ON ms.candidate_id = c.id
//     WHERE c.status = 'ACTIVE'
//   `;
  
//   const params = [];
  
//   if (mandateId === null) {
//     query += ' AND ms.mandate_id IS NULL';
//   } else {
//     query += ' AND ms.mandate_id = ?';
//     params.push(mandateId);
//   }
  
//   query += ` ORDER BY ms.final_score DESC LIMIT ${limit}`;
  
//   const rows = await db.all(query, params);
  
//   return rows.map(row => ({
//     candidate: {
//       id: row.id,
//       name: row.name,
//       current_title: row.current_title,
//       current_firm: row.current_firm,
//     },
//     match_score: {
//       final_score: row.final_score,
//       dimension_scores: JSON.parse(row.dimension_scores),
//     },
//   }));
// }

// /**
//  * Orchestration: Run fit scoring for a candidate against a specific mandate
//  */
// async function runFitForCandidateAgainstMandate(candidateId, mandateId) {
//   const { getCandidateById } = require('./candidateModel.cjs');
//   const { getMandateById } = require('./mandateModel.cjs');
//   const { getFirmById } = require('./firmModel.cjs');

//   try {
//     // Load candidate
//     const candidate = await getCandidateById(candidateId);
//     if (!candidate) {
//       throw new Error(`Candidate not found: ${candidateId}`);
//     }

//     // Load mandate
//     const mandate = await getMandateById(mandateId);
//     if (!mandate) {
//       throw new Error(`Mandate not found: ${mandateId}`);
//     }

//     // Load firm (optional context)
//     const firm = mandate.firm_id ? await getFirmById(mandate.firm_id) : null;

//     console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
//     console.log('║              STARTING FIT SCORING ANALYSIS                     ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log('');
//     console.log('  👤 CANDIDATE PROFILE:');
//     console.log(`     • Name: ${candidate.name}`);
//     console.log(`     • ID: ${candidateId}`);
//     console.log(`     • Current Title: ${candidate.current_title || 'N/A'}`);
//     console.log(`     • Current Firm: ${candidate.current_firm || 'N/A'}`);
//     console.log(`     • Location: ${candidate.location || 'N/A'}`);
//     console.log(`     • Seniority: ${candidate.seniority || 'N/A'}`);
//     console.log('');
//     console.log('  📋 MANDATE DETAILS:');
//     console.log(`     • Name: ${mandate.name}`);
//     console.log(`     • ID: ${mandateId}`);
//     console.log(`     • Status: ${mandate.status}`);
//     console.log(`     • Location: ${mandate.location || 'N/A'}`);
//     console.log(`     • Primary Sector: ${mandate.primary_sector || 'N/A'}`);
//     console.log(`     • Seniority Range: ${mandate.seniority_min || 'Any'} - ${mandate.seniority_max || 'Any'}`);
//     if (firm) {
//       console.log('');
//       console.log('  🏢 CLIENT FIRM CONTEXT:');
//       console.log(`     • Name: ${firm.name}`);
//       console.log(`     • Platform Type: ${firm.platform_type || 'N/A'}`);
//       console.log(`     • Sector Focus: [${firm.sector_focus ? firm.sector_focus.join(', ') : 'None'}]`);
//       console.log(`     • Asset Classes: [${firm.asset_classes ? firm.asset_classes.join(', ') : 'None'}]`);
//       console.log(`     • Regions: [${firm.regions ? firm.regions.join(', ') : 'None'}]`);
//     }
//     console.log('');

//     // Compute fit score via API (falls back to local if API unavailable)
//   const { finalScore, dimensionScores, semanticDetails } = await computeFitScoreViaAPI(candidate, mandate, firm);

//     // Save match score
//     const matchScoreId = await saveMatchScore(candidateId, mandateId, finalScore, dimensionScores);

//     console.log('╔════════════════════════════════════════════════════════════════╗');
//     console.log('║                  SCORING COMPLETED SUCCESSFULLY                ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log(`  ✅ Match Score ID: ${matchScoreId}`);
//     console.log(`  ✅ Score saved to database`);
//     console.log(`  ✅ Final Score: ${finalScore.toFixed(2)}/100`);
//     console.log('════════════════════════════════════════════════════════════════\n\n');

//     return {
//       matchScoreId,
//       finalScore,
//       dimensionScores,
//       semanticDetails,
//       candidate: {
//         id: candidate.id,
//         name: candidate.name,
//       },
//       mandate: {
//         id: mandate.id,
//         name: mandate.name,
//       },
//       firm: firm ? { id: firm.id, name: firm.name } : null,
//     };
//   } catch (error) {
//     console.error('[scoringModel] Error in runFitForCandidateAgainstMandate:', error);
//     throw error;
//   }
// }

// /**
//  * Orchestration: Run fit scoring for a candidate against all OPEN mandates
//  */
// async function runFitForCandidateAgainstAllMandates(candidateId) {
//   const { getCandidateById } = require('./candidateModel.cjs');
//   const { listMandates } = require('./mandateModel.cjs');
//   const { getFirmById } = require('./firmModel.cjs');

//   try {
//     // Load candidate
//     const candidate = await getCandidateById(candidateId);
//     if (!candidate) {
//       throw new Error(`Candidate not found: ${candidateId}`);
//     }

//     // Load all OPEN mandates
//     const mandates = await listMandates({ status: 'OPEN' });

//     console.log('\n\n╔════════════════════════════════════════════════════════════════╗');
//     console.log('║           BATCH SCORING: CANDIDATE vs ALL MANDATES            ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log(`  👤 Candidate: ${candidate.name} (ID: ${candidateId})`);
//     console.log(`  📋 Total OPEN Mandates: ${mandates.length}`);
//     console.log('════════════════════════════════════════════════════════════════\n');

//     const results = [];
//     let processedCount = 0;

//     for (const mandate of mandates) {
//       try {
//         processedCount++;
//         console.log(`  ⏳ Processing mandate ${processedCount}/${mandates.length}: ${mandate.name}`);
        
//         // Load firm (optional context)
//         const firm = mandate.firm_id ? await getFirmById(mandate.firm_id) : null;

//         // Compute fit score via API (falls back to local if API unavailable)
//   const { finalScore, dimensionScores, semanticDetails } = await computeFitScoreViaAPI(candidate, mandate, firm);

//         // Save match score
//         await saveMatchScore(candidateId, mandate.id, finalScore, dimensionScores);

//         console.log(`     ✅ Score: ${finalScore.toFixed(2)}/100 - Saved to database\n`);

//         results.push({
//           mandate: {
//             id: mandate.id,
//             name: mandate.name,
//             firm_id: mandate.firm_id,
//           },
//           firm: firm ? { id: firm.id, name: firm.name } : null,
//           finalScore,
//           dimensionScores,
//           semanticDetails,
//         });
//       } catch (error) {
//         console.error(`     ❌ Error scoring mandate ${mandate.id}: ${error.message}\n`);
//       }
//     }

//     // Sort by score descending
//     results.sort((a, b) => b.finalScore - a.finalScore);

//     console.log('╔════════════════════════════════════════════════════════════════╗');
//     console.log('║              BATCH SCORING COMPLETED                           ║');
//     console.log('╚════════════════════════════════════════════════════════════════╝');
//     console.log(`  ✅ Total Processed: ${results.length}/${mandates.length} mandates`);
//     console.log('');
//     console.log('  🏆 TOP MATCHES:');
//     results.slice(0, 5).forEach((r, i) => {
//       const firmName = r.firm ? ` (${r.firm.name})` : '';
//       console.log(`     ${i + 1}. ${r.mandate.name}${firmName}`);
//       console.log(`        Score: ${r.finalScore.toFixed(2)}/100`);
//     });
//     console.log('════════════════════════════════════════════════════════════════\n\n');

//     return results;
//   } catch (error) {
//     console.error('[scoringModel] Error in runFitForCandidateAgainstAllMandates:', error);
//     throw error;
//   }
// }

// /**
//  * Get match scores for a mandate (list of candidates scored against it)
//  */
// async function listMatchScoresForMandate(mandateId) {
//   const db = await initDatabase();

//   const rows = await db.all(`
//     SELECT 
//       ms.id,
//       ms.candidate_id,
//       ms.final_score,
//       ms.dimension_scores,
//       ms.created_at,
//       c.name AS candidate_name,
//       c.current_title,
//       c.current_firm
//     FROM match_scores ms
//     JOIN candidates c ON ms.candidate_id = c.id
//     WHERE ms.mandate_id = ?
//     ORDER BY ms.final_score DESC
//   `, [mandateId]);

//   return rows.map(row => ({
//     id: row.id,
//     candidate_id: row.candidate_id,
//     candidate_name: row.candidate_name,
//     current_title: row.current_title,
//     current_firm: row.current_firm,
//     final_score: row.final_score,
//     dimension_scores: JSON.parse(row.dimension_scores),
//     created_at: row.created_at,
//   }));
// }

// /**
//  * Get match scores for a candidate (list of mandates scored against)
//  */
// async function listMatchScoresForCandidate(candidateId) {
//   const db = await initDatabase();

//   const rows = await db.all(`
//     SELECT 
//       ms.id,
//       ms.mandate_id,
//       ms.final_score,
//       ms.dimension_scores,
//       ms.created_at,
//       m.name AS mandate_name,
//       m.firm_id,
//       f.name AS firm_name
//     FROM match_scores ms
//     JOIN mandates m ON ms.mandate_id = m.id
//     LEFT JOIN firms f ON m.firm_id = f.id
//     WHERE ms.candidate_id = ?
//     ORDER BY ms.final_score DESC
//   `, [candidateId]);

//   return rows.map(row => ({
//     id: row.id,
//     mandate_id: row.mandate_id,
//     mandate_name: row.mandate_name,
//     firm_id: row.firm_id,
//     firm_name: row.firm_name,
//     final_score: row.final_score,
//     dimension_scores: JSON.parse(row.dimension_scores),
//     created_at: row.created_at,
//   }));
// }

// module.exports = {
//   initMatchScoresTable,
//   computeCvQuality,
//   getQualityThresholds,
//   getCvQualityWeights,
//   computeFitScore,
//   computeFitScoreViaAPI,
//   getFitWeights,
//   getDummyMandate,
//   saveMatchScore,
//   getMatchScoresForCandidate,
//   getTopMatchesForMandate,
//   runFitForCandidateAgainstMandate,
//   runFitForCandidateAgainstAllMandates,
//   listMatchScoresForMandate,
//   listMatchScoresForCandidate,
// };
