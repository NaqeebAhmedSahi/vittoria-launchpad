/**
 * Scoring Service
 * Handles CV quality scoring and fit scoring between candidates and mandates
 */

import * as fs from 'fs';
import * as path from 'path';
import {
  ParsedCv,
  Mandate,
  CvQualityResult,
  FitScoreResult,
  CvQualityConfig,
  FitScoringConfig,
} from '../types/scoring';

// Load configurations
let cvQualityConfig: CvQualityConfig;
let fitScoringConfig: FitScoringConfig;

try {
  const cvQualityPath = path.join(__dirname, '../../config/scoring/cv_quality.json');
  const fitScoringPath = path.join(__dirname, '../../config/scoring/fit_scoring.json');
  
  cvQualityConfig = JSON.parse(fs.readFileSync(cvQualityPath, 'utf-8'));
  fitScoringConfig = JSON.parse(fs.readFileSync(fitScoringPath, 'utf-8'));
} catch (error) {
  console.error('Failed to load scoring configurations:', error);
  throw new Error('Scoring configuration files are missing or invalid');
}

/**
 * Compute CV quality score based on completeness, experience, education, and parser confidence
 */
export function computeCvQuality(parsed: ParsedCv): CvQualityResult {
  const { weights } = cvQualityConfig.cv_quality;

  // 1. Completeness Score: Check required fields
  const completenessScore = computeCompletenessScore(parsed);

  // 2. Experience Score: % of experience entries with firm + title + dateFrom
  const experienceScore = computeExperienceScore(parsed);

  // 3. Education Score: % of education entries with institution
  const educationScore = computeEducationScore(parsed);

  // 4. Parser Confidence Score: Based on raw text length
  const parserConfidenceScore = computeParserConfidenceScore(parsed);

  // Weighted final score
  const score = 
    completenessScore * weights.completeness +
    experienceScore * weights.experience +
    educationScore * weights.education +
    parserConfidenceScore * weights.parser_confidence;

  return {
    score: Math.min(1.0, Math.max(0.0, score)), // Clamp between 0 and 1
    breakdown: {
      completeness: completenessScore,
      experience: experienceScore,
      education: educationScore,
      parser_confidence: parserConfidenceScore,
    },
  };
}

/**
 * Check completeness of required fields: name, current_title, current_firm, location
 */
function computeCompletenessScore(parsed: ParsedCv): number {
  const requiredFields = [
    parsed.name,
    parsed.current_title,
    parsed.current_firm,
    parsed.location,
  ];

  const filledFields = requiredFields.filter(
    (field) => field !== undefined && field !== null && field.trim() !== ''
  ).length;

  return filledFields / requiredFields.length;
}

/**
 * Compute experience score: % of experience entries with firm + title + dateFrom
 */
function computeExperienceScore(parsed: ParsedCv): number {
  if (!parsed.experience || parsed.experience.length === 0) {
    return 0;
  }

  const completeEntries = parsed.experience.filter(
    (exp) =>
      exp.firm &&
      exp.firm.trim() !== '' &&
      exp.title &&
      exp.title.trim() !== '' &&
      exp.dateFrom &&
      exp.dateFrom.trim() !== ''
  ).length;

  return completeEntries / parsed.experience.length;
}

/**
 * Compute education score: % of education entries with institution
 */
function computeEducationScore(parsed: ParsedCv): number {
  if (!parsed.education || parsed.education.length === 0) {
    return 0;
  }

  const completeEntries = parsed.education.filter(
    (edu) => edu.institution && edu.institution.trim() !== ''
  ).length;

  return completeEntries / parsed.education.length;
}

/**
 * Compute parser confidence score based on raw text length
 */
function computeParserConfidenceScore(parsed: ParsedCv): number {
  const textLength = parsed.raw_text?.length || 0;

  if (textLength < 500) {
    return 0.2; // Too short, likely incomplete
  } else if (textLength > 30000) {
    return 0.3; // Too long, likely parsing issues
  } else {
    return 1.0; // Good length
  }
}

/**
 * Get quality threshold values
 */
export function getQualityThresholds(): {
  good: number;
  borderline: number;
} {
  return {
    good: cvQualityConfig.cv_quality.good_threshold,
    borderline: cvQualityConfig.cv_quality.borderline_threshold,
  };
}

/**
 * Compute fit score between a candidate and a mandate
 */
export function computeFitScore(candidate: ParsedCv, mandate: Mandate): FitScoreResult {
  const { weights } = fitScoringConfig;

  // Compute dimension scores
  const sectorScore = computeSectorMatch(candidate.sectors, mandate.primary_sector);
  const functionScore = computeFunctionMatch(candidate.functions, mandate.primary_function);
  const assetClassScore = computeAssetClassMatch(
    candidate.asset_classes,
    mandate.primary_asset_class
  );
  const geographyScore = computeGeographyMatch(candidate.geographies, mandate.regions);
  const seniorityScore = computeSeniorityMatch(
    candidate.seniority,
    mandate.seniority_min,
    mandate.seniority_max
  );

  // Weighted final score (0-100)
  const finalScore =
    sectorScore * weights.sector * 100 +
    functionScore * weights.function * 100 +
    assetClassScore * weights.assetClass * 100 +
    geographyScore * weights.geography * 100 +
    seniorityScore * weights.seniority * 100;

  return {
    finalScore: Math.min(100, Math.max(0, finalScore)),
    dimensionScores: {
      sector: sectorScore,
      function: functionScore,
      assetClass: assetClassScore,
      geography: geographyScore,
      seniority: seniorityScore,
    },
  };
}

/**
 * Compute sector match score
 */
function computeSectorMatch(candidateSectors: string[], mandateSector: string): number {
  if (!candidateSectors || candidateSectors.length === 0) {
    return 0;
  }

  // Exact match
  if (candidateSectors.some((s) => s.toLowerCase() === mandateSector.toLowerCase())) {
    return 1.0;
  }

  // Partial match (contains substring)
  if (
    candidateSectors.some((s) =>
      s.toLowerCase().includes(mandateSector.toLowerCase()) ||
      mandateSector.toLowerCase().includes(s.toLowerCase())
    )
  ) {
    return 0.5;
  }

  return 0;
}

/**
 * Compute function match score
 */
function computeFunctionMatch(candidateFunctions: string[], mandateFunction: string): number {
  if (!candidateFunctions || candidateFunctions.length === 0) {
    return 0;
  }

  // Exact match
  if (candidateFunctions.some((f) => f.toLowerCase() === mandateFunction.toLowerCase())) {
    return 1.0;
  }

  // Partial match
  if (
    candidateFunctions.some((f) =>
      f.toLowerCase().includes(mandateFunction.toLowerCase()) ||
      mandateFunction.toLowerCase().includes(f.toLowerCase())
    )
  ) {
    return 0.5;
  }

  return 0;
}

/**
 * Compute asset class match score
 */
function computeAssetClassMatch(
  candidateAssetClasses: string[],
  mandateAssetClass: string
): number {
  if (!candidateAssetClasses || candidateAssetClasses.length === 0) {
    return 0;
  }

  // Exact match
  if (
    candidateAssetClasses.some((ac) => ac.toLowerCase() === mandateAssetClass.toLowerCase())
  ) {
    return 1.0;
  }

  // Partial match
  if (
    candidateAssetClasses.some((ac) =>
      ac.toLowerCase().includes(mandateAssetClass.toLowerCase()) ||
      mandateAssetClass.toLowerCase().includes(ac.toLowerCase())
    )
  ) {
    return 0.5;
  }

  return 0;
}

/**
 * Compute geography match score
 */
function computeGeographyMatch(candidateGeographies: string[], mandateRegions: string[]): number {
  if (!candidateGeographies || candidateGeographies.length === 0) {
    return 0;
  }

  // Exact match
  const exactMatches = candidateGeographies.filter((cg) =>
    mandateRegions.some((mr) => cg.toLowerCase() === mr.toLowerCase())
  );

  if (exactMatches.length > 0) {
    return 1.0;
  }

  // Partial match
  const partialMatches = candidateGeographies.filter((cg) =>
    mandateRegions.some(
      (mr) =>
        cg.toLowerCase().includes(mr.toLowerCase()) ||
        mr.toLowerCase().includes(cg.toLowerCase())
    )
  );

  if (partialMatches.length > 0) {
    return 0.5;
  }

  return 0;
}

/**
 * Compute seniority match score
 * Seniority levels: Analyst < Associate < VP < Director < MD
 */
function computeSeniorityMatch(
  candidateSeniority: string,
  minSeniority: string,
  maxSeniority: string
): number {
  const seniorityLevels = ['Analyst', 'Associate', 'VP', 'Director', 'MD'];

  const candidateLevel = seniorityLevels.findIndex(
    (level) => level.toLowerCase() === candidateSeniority?.toLowerCase()
  );
  const minLevel = seniorityLevels.findIndex(
    (level) => level.toLowerCase() === minSeniority?.toLowerCase()
  );
  const maxLevel = seniorityLevels.findIndex(
    (level) => level.toLowerCase() === maxSeniority?.toLowerCase()
  );

  // If not found in predefined levels, return 0
  if (candidateLevel === -1 || minLevel === -1 || maxLevel === -1) {
    return 0;
  }

  // Inside band
  if (candidateLevel >= minLevel && candidateLevel <= maxLevel) {
    return 1.0;
  }

  // Adjacent (one level above or below)
  if (
    candidateLevel === minLevel - 1 ||
    candidateLevel === maxLevel + 1
  ) {
    return 0.5;
  }

  // Outside band
  return 0;
}

/**
 * Get dummy mandate for testing
 */
export function getDummyMandate(): Mandate {
  return {
    primary_sector: 'ECM',
    primary_function: 'Coverage',
    primary_asset_class: 'Equity',
    regions: ['UK'],
    seniority_min: 'VP',
    seniority_max: 'Director',
  };
}
