import "server-only";

// Structured Scoring Model for Proposal Evaluation
//
// This module provides:
// - Structured investment scoring categories
// - Score computation from LLM evaluation output
// - Safe fallback to raw AI score

import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const SCORE_WEIGHTS = {
  sectorFit: 25,
  geographyFit: 20,
  stageFit: 15,
  ticketSizeFit: 15,
  // riskAdjustment is -20 to 0 (penalty only)
  riskAdjustmentMax: 0,
  riskAdjustmentMin: -20,
} as const;

// Maximum positive score before risk adjustment
export const MAX_POSITIVE_SCORE =
  SCORE_WEIGHTS.sectorFit +
  SCORE_WEIGHTS.geographyFit +
  SCORE_WEIGHTS.stageFit +
  SCORE_WEIGHTS.ticketSizeFit; // 75

// Base score added to make total possible 100
export const BASE_SCORE = 100 - MAX_POSITIVE_SCORE; // 25

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface StructuredScores {
  sectorFit: number; // 0 to 25
  geographyFit: number; // 0 to 20
  stageFit: number; // 0 to 15
  ticketSizeFit: number; // 0 to 15
  riskAdjustment: number; // -20 to 0
}

export interface ScoringInput {
  sectorMatch: "full" | "partial" | "none" | "unknown";
  geographyMatch: "full" | "partial" | "none" | "unknown";
  stageMatch: "full" | "partial" | "none" | "unknown";
  ticketSizeMatch: "full" | "partial" | "none" | "unknown";
  identifiedRisks: string[];
}

export interface ScoringResult {
  structuredScores: StructuredScores;
  finalScore: number;
  scoringMethod: "structured" | "fallback";
  breakdown: {
    baseScore: number;
    sectorFit: number;
    geographyFit: number;
    stageFit: number;
    ticketSizeFit: number;
    riskAdjustment: number;
    total: number;
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Zod Schema for LLM Structured Scoring Response
// ─────────────────────────────────────────────────────────────────────────────

export const ScoringInputSchema = z.object({
  sectorMatch: z.enum(["full", "partial", "none", "unknown"]),
  geographyMatch: z.enum(["full", "partial", "none", "unknown"]),
  stageMatch: z.enum(["full", "partial", "none", "unknown"]),
  ticketSizeMatch: z.enum(["full", "partial", "none", "unknown"]),
  identifiedRisks: z.array(z.string()),
});

export const StructuredScoresSchema = z.object({
  sectorFit: z.number().min(0).max(25),
  geographyFit: z.number().min(0).max(20),
  stageFit: z.number().min(0).max(15),
  ticketSizeFit: z.number().min(0).max(15),
  riskAdjustment: z.number().min(-20).max(0),
});

export type ScoringInputType = z.infer<typeof ScoringInputSchema>;

// ─────────────────────────────────────────────────────────────────────────────
// Score Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Convert match level to score percentage.
 */
function matchToPercentage(match: "full" | "partial" | "none" | "unknown"): number {
  switch (match) {
    case "full":
      return 1.0;
    case "partial":
      return 0.5;
    case "none":
      return 0.0;
    case "unknown":
      return 0.25; // Small score for unknown to avoid penalizing missing data
    default:
      return 0.0;
  }
}

/**
 * Calculate risk adjustment based on number and severity of identified risks.
 * More risks = larger penalty.
 */
function calculateRiskAdjustment(risks: string[]): number {
  if (!risks || risks.length === 0) {
    return 0; // No penalty if no risks identified
  }

  // Each risk contributes to the penalty
  // Scale: 1 risk = -3, 2 risks = -6, 3 risks = -9, etc.
  // Cap at -20
  const penalty = Math.min(risks.length * 3, 20);
  return -penalty;
}

/**
 * Compute structured scores from scoring input.
 */
export function computeStructuredScores(input: ScoringInput): StructuredScores {
  return {
    sectorFit: Math.round(
      matchToPercentage(input.sectorMatch) * SCORE_WEIGHTS.sectorFit
    ),
    geographyFit: Math.round(
      matchToPercentage(input.geographyMatch) * SCORE_WEIGHTS.geographyFit
    ),
    stageFit: Math.round(
      matchToPercentage(input.stageMatch) * SCORE_WEIGHTS.stageFit
    ),
    ticketSizeFit: Math.round(
      matchToPercentage(input.ticketSizeMatch) * SCORE_WEIGHTS.ticketSizeFit
    ),
    riskAdjustment: calculateRiskAdjustment(input.identifiedRisks),
  };
}

/**
 * Calculate final score from structured scores.
 * finalScore = base + sectorFit + geographyFit + stageFit + ticketSizeFit + riskAdjustment
 * Clamped between 0 and 100.
 */
export function calculateFinalScore(scores: StructuredScores): number {
  const rawScore =
    BASE_SCORE +
    scores.sectorFit +
    scores.geographyFit +
    scores.stageFit +
    scores.ticketSizeFit +
    scores.riskAdjustment;

  // Clamp between 0 and 100
  return Math.max(0, Math.min(100, rawScore));
}

/**
 * Full scoring computation from input to result.
 */
export function computeScoring(input: ScoringInput): ScoringResult {
  const structuredScores = computeStructuredScores(input);
  const finalScore = calculateFinalScore(structuredScores);

  return {
    structuredScores,
    finalScore,
    scoringMethod: "structured",
    breakdown: {
      baseScore: BASE_SCORE,
      sectorFit: structuredScores.sectorFit,
      geographyFit: structuredScores.geographyFit,
      stageFit: structuredScores.stageFit,
      ticketSizeFit: structuredScores.ticketSizeFit,
      riskAdjustment: structuredScores.riskAdjustment,
      total: finalScore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Parsing
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Parse scoring input from LLM response.
 * Returns null if parsing fails.
 */
export function parseScoringInput(data: unknown): ScoringInput | null {
  const result = ScoringInputSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  console.warn("[scoringModel] Failed to parse scoring input:", result.error);
  return null;
}

/**
 * Validate structured scores.
 */
export function validateStructuredScores(data: unknown): StructuredScores | null {
  const result = StructuredScoresSchema.safeParse(data);
  if (result.success) {
    return result.data;
  }
  return null;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fallback Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Create a fallback scoring result from a raw AI score.
 * Used when structured scoring fails or is not available.
 */
export function createFallbackScoring(rawScore: number): ScoringResult {
  // Distribute the raw score proportionally across categories
  const normalizedScore = Math.max(0, Math.min(100, rawScore));
  const proportion = normalizedScore / 100;

  const structuredScores: StructuredScores = {
    sectorFit: Math.round(proportion * SCORE_WEIGHTS.sectorFit),
    geographyFit: Math.round(proportion * SCORE_WEIGHTS.geographyFit),
    stageFit: Math.round(proportion * SCORE_WEIGHTS.stageFit),
    ticketSizeFit: Math.round(proportion * SCORE_WEIGHTS.ticketSizeFit),
    riskAdjustment: 0, // No risk data available in fallback
  };

  return {
    structuredScores,
    finalScore: normalizedScore,
    scoringMethod: "fallback",
    breakdown: {
      baseScore: BASE_SCORE,
      sectorFit: structuredScores.sectorFit,
      geographyFit: structuredScores.geographyFit,
      stageFit: structuredScores.stageFit,
      ticketSizeFit: structuredScores.ticketSizeFit,
      riskAdjustment: 0,
      total: normalizedScore,
    },
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Scoring Computation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Compute scoring safely, falling back to raw score if structured scoring fails.
 *
 * @param scoringInput - Parsed scoring input from LLM (may be null)
 * @param rawScore - Raw AI score to use as fallback
 * @returns Scoring result with structured scores
 */
export function computeScoringSafe(
  scoringInput: ScoringInput | null,
  rawScore: number
): ScoringResult {
  if (scoringInput) {
    try {
      const result = computeScoring(scoringInput);
      console.log(
        `[scoringModel] Structured scoring computed: finalScore=${result.finalScore}, method=${result.scoringMethod}`
      );
      return result;
    } catch (error) {
      console.error("[scoringModel] Structured scoring failed:", error);
    }
  }

  console.log(
    `[scoringModel] Using fallback scoring from raw AI score: ${rawScore}`
  );
  return createFallbackScoring(rawScore);
}

// ─────────────────────────────────────────────────────────────────────────────
// Score Display Helpers
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get display information for a scoring category.
 */
export function getScoreCategoryInfo(category: keyof StructuredScores): {
  label: string;
  maxScore: number;
  description: string;
} {
  switch (category) {
    case "sectorFit":
      return {
        label: "Sector Fit",
        maxScore: SCORE_WEIGHTS.sectorFit,
        description: "How well the proposal's sector matches mandate criteria",
      };
    case "geographyFit":
      return {
        label: "Geography Fit",
        maxScore: SCORE_WEIGHTS.geographyFit,
        description: "Geographic alignment with mandate requirements",
      };
    case "stageFit":
      return {
        label: "Stage Fit",
        maxScore: SCORE_WEIGHTS.stageFit,
        description: "Investment stage alignment (seed, series A, etc.)",
      };
    case "ticketSizeFit":
      return {
        label: "Ticket Size Fit",
        maxScore: SCORE_WEIGHTS.ticketSizeFit,
        description: "Investment amount alignment with mandate range",
      };
    case "riskAdjustment":
      return {
        label: "Risk Adjustment",
        maxScore: 0, // Max is 0 (best case)
        description: "Penalty for identified risks (-20 to 0)",
      };
    default:
      return {
        label: category,
        maxScore: 0,
        description: "",
      };
  }
}
