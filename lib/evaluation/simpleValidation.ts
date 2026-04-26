/**
 * Simple proposal validation - keyword-based checks.
 * Returns score (0-100), findings (issues), structured checks for UI, and an overall label.
 */

export interface ValidationCheckItem {
  id: string;
  /** Short label for the checklist row */
  label: string;
  passed: boolean;
  /** Extra text, e.g. "85%" for completeness */
  detail?: string;
  /** Shown when !passed (e.g. "Missing financial projections") */
  issue?: string;
}

export interface SimpleValidationResult {
  score: number;
  findings: string[];
  checks: ValidationCheckItem[];
  /** Short status line for hero summary */
  overallLabel: string;
}

function overallLabelFromScore(score: number): string {
  if (score >= 70) return "Ready for evaluation";
  if (score >= 45) return "Needs attention";
  return "Critical gaps";
}

export function validate_proposal(text: string): SimpleValidationResult {
  let score = 100;
  const findings: string[] = [];

  const lower = text.toLowerCase();

  const hasRevenue = lower.includes("revenue");
  const hasForecast = lower.includes("forecast") || lower.includes("projection");
  const hasCompetitor = lower.includes("competitor") || lower.includes("competition");
  const hasRisk = lower.includes("risk");
  const hasTeam = lower.includes("team") || lower.includes("founder");

  if (!hasRevenue) {
    score -= 20;
    findings.push("Missing revenue data");
  }
  if (!hasForecast) {
    score -= 15;
    findings.push("Missing financial projections");
  }
  if (!hasCompetitor) {
    score -= 10;
    findings.push("No competitor info");
  }
  if (!hasRisk) {
    score -= 10;
    findings.push("Risk section incomplete");
  }
  if (!hasTeam) {
    score -= 8;
    findings.push("Team information thin or missing");
  }

  score = Math.max(0, Math.round(score));

  const checks: ValidationCheckItem[] = [
    {
      id: "completeness",
      label: "Document completeness",
      passed: score >= 70,
      detail: `${score}%`,
      issue: score < 70 ? "Strengthen narrative coverage" : undefined,
    },
    {
      id: "revenue",
      label: "Revenue narrative",
      passed: hasRevenue,
      issue: "Missing revenue data",
    },
    {
      id: "forecast",
      label: "Financial projections",
      passed: hasForecast,
      issue: "Missing financial projections",
    },
    {
      id: "risk",
      label: "Risk coverage",
      passed: hasRisk,
      issue: "Risk section incomplete",
    },
    {
      id: "competitors",
      label: "Competitive context",
      passed: hasCompetitor,
      issue: "No competitor info",
    },
    {
      id: "team",
      label: "Team information",
      passed: hasTeam,
      issue: "Team information thin or missing",
    },
  ];

  return {
    score,
    findings,
    checks,
    overallLabel: overallLabelFromScore(score),
  };
}
