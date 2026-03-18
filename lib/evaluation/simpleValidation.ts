/**
 * Simple proposal validation - keyword-based checks.
 * Returns score (0-100) and findings (list of issues).
 */

export interface SimpleValidationResult {
  score: number;
  findings: string[];
}

export function validate_proposal(text: string): SimpleValidationResult {
  let score = 100;
  const findings: string[] = [];

  const lower = text.toLowerCase();

  if (!lower.includes("revenue")) {
    score -= 20;
    findings.push("Missing revenue data");
  }

  if (!lower.includes("forecast")) {
    score -= 15;
    findings.push("Missing forecast");
  }

  if (!lower.includes("competitor")) {
    score -= 10;
    findings.push("No competitor info");
  }

  return {
    score: Math.max(0, score),
    findings,
  };
}
