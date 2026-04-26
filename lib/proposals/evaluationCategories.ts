/**
 * Maps backend structured scores into the five enterprise evaluation pillars.
 * When structured scores are absent, derives neutral placeholders from fit score.
 */

export type EvaluationRecommendation = "Invest" | "Consider" | "Reject";

export interface CategoryBreakdown {
  id: string;
  label: string;
  /** 0–100 display score */
  score: number;
  explanation: string;
  /** Longer text for expandable detail */
  detail: string;
}

export interface StructuredScoresInput {
  sectorFit: number;
  geographyFit: number;
  stageFit: number;
  ticketSizeFit: number;
  riskAdjustment: number;
}

export function recommendationFromFit(fit: number | null, hasInputs: boolean): EvaluationRecommendation {
  if (!hasInputs || fit === null) return "Consider";
  if (fit >= 72) return "Invest";
  if (fit >= 45) return "Consider";
  return "Reject";
}

function clamp01(n: number): number {
  return Math.max(0, Math.min(100, n));
}

/** Risk adjustment -20..0 → 0..100 (higher is better = lower penalty). */
function riskToDisplay(riskAdjustment: number): number {
  return clamp01(((20 + riskAdjustment) / 20) * 100);
}

export function buildCategoryBreakdowns(
  fitScore: number | null,
  hasInputs: boolean,
  structured: StructuredScoresInput | undefined,
  strengths: string[],
  risks: string[]
): CategoryBreakdown[] {
  const s = strengths.slice(0, 2).join(" ");
  const r = risks.slice(0, 2).join(" ");

  if (structured && hasInputs) {
    const market = clamp01(((structured.sectorFit / 25 + structured.geographyFit / 20) / 2) * 100);
    const product = clamp01((structured.stageFit / 15) * 100);
    const financials = clamp01((structured.ticketSizeFit / 15) * 100);
    const team = clamp01(
      ((structured.sectorFit / 25) * 45 + (structured.stageFit / 15) * 55)
    );
    const riskPillar = riskToDisplay(structured.riskAdjustment);

    return [
      {
        id: "market",
        label: "Market",
        score: Math.round(market),
        explanation:
          market >= 70
            ? "Sector and geography align well with mandate focus."
            : market >= 45
              ? "Partial alignment with mandate market parameters."
              : "Market fit requires closer review versus mandate.",
        detail: s || "Derived from sector and geography fit versus the active mandate.",
      },
      {
        id: "product",
        label: "Product",
        score: Math.round(product),
        explanation:
          product >= 70
            ? "Stage and product narrative fit the fund thesis."
            : product >= 45
              ? "Product–stage fit is acceptable but not definitive."
              : "Stage or product scope may sit outside mandate comfort.",
        detail: s || "Based on stage fit and proposal narrative consistency.",
      },
      {
        id: "financials",
        label: "Financials",
        score: Math.round(financials),
        explanation:
          financials >= 70
            ? "Ticket size and financial posture match mandate constraints."
            : financials >= 45
              ? "Financial envelope is broadly workable."
              : "Ticket or financial profile may need structuring or is misaligned.",
        detail: "Uses ticket-size fit relative to mandate min/max and stated ask.",
      },
      {
        id: "team",
        label: "Team",
        score: Math.round(team),
        explanation:
          team >= 70
            ? "Execution signals are consistent with mandate expectations."
            : team >= 45
              ? "Team evidence is present but not fully validated."
              : "Limited evidence on team depth versus comparable portfolio.",
        detail: s || "Inferred from sector and stage alignment with mandate (proxy metric).",
      },
      {
        id: "risk",
        label: "Risk",
        score: Math.round(riskPillar),
        explanation:
          riskPillar >= 70
            ? "Risk adjustments are limited; no major mandate conflicts flagged."
            : riskPillar >= 45
              ? "Moderate risk offsets applied in scoring."
              : "Material risk penalties applied—review downside cases.",
        detail: r || "Combines model risk adjustment with stated risk factors from the evaluation.",
      },
    ];
  }

  const base = fitScore !== null && hasInputs ? clamp01(fitScore) : 50;
  const jitter = (i: number) => clamp01(base + (i % 3) * 3 - 3);

  return [
    {
      id: "market",
      label: "Market",
      score: Math.round(jitter(0)),
      explanation: "Upload documents and run a structured evaluation for mandate-grade category scores.",
      detail: strengths[0] || "Category-level breakdown becomes available when structured scoring is returned.",
    },
    {
      id: "product",
      label: "Product",
      score: Math.round(jitter(1)),
      explanation: "Product and stage assessment refines once structured scores are present.",
      detail: strengths[1] || "Derived temporarily from overall fit pending structured pillars.",
    },
    {
      id: "financials",
      label: "Financials",
      score: Math.round(jitter(2)),
      explanation: "Financials pillar reflects ticket and forecast alignment when data is available.",
      detail: risks[0] || "Placeholder until structured financials scoring is available.",
    },
    {
      id: "team",
      label: "Team",
      score: Math.round(jitter(3)),
      explanation: "Team execution signals strengthen with richer document extraction.",
      detail: strengths[2] || "Proxy score from overall evaluation until pillar scores exist.",
    },
    {
      id: "risk",
      label: "Risk",
      score: Math.round(jitter(4)),
      explanation: "Risk aggregates mandate conflicts, model penalties, and stated exposures.",
      detail: risks[1] || "Review risk list alongside this score once evaluation completes.",
    },
  ];
}

export function formatSummaryLines(text: string, maxLines = 6, maxChars = 520): string[] {
  const cleaned = text.replace(/\s+/g, " ").trim();
  if (!cleaned) return ["No AI summary available yet. Run evaluation after documents and mandate are loaded."];
  const slice = cleaned.slice(0, maxChars);
  const sentences = slice.split(/(?<=[.!?])\s+/).filter(Boolean);
  const lines: string[] = [];
  for (const sent of sentences) {
    if (lines.length >= maxLines) break;
    lines.push(sent);
  }
  if (lines.length === 0) lines.push(slice);
  return lines;
}

/** One short paragraph for cockpit summary (first sentences, capped). */
export function formatAIParagraph(text: string, maxLines = 3, maxChars = 480): string {
  const lines = formatSummaryLines(text, maxLines, maxChars);
  return lines.join(" ");
}

const MAX_TAG_LEN = 28;

/** Short labels for insight chips (strengths / risks). */
export function buildInsightTags(strengths: string[], risks: string[], maxTags = 6): string[] {
  const raw = [...strengths.slice(0, 4), ...risks.slice(0, 3)];
  const out: string[] = [];
  for (const s of raw) {
    const t = s.replace(/\s+/g, " ").trim();
    if (!t) continue;
    const clipped = t.length <= MAX_TAG_LEN ? t : `${t.slice(0, MAX_TAG_LEN - 1)}…`;
    if (!out.includes(clipped)) out.push(clipped);
    if (out.length >= maxTags) break;
  }
  return out;
}
