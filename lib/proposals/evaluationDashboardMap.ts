import type { EvaluationReport } from "@/lib/evaluation/types";
import type { EvaluationDashboardPayload } from "@/lib/proposals/evaluationDashboardTypes";

function normalizeConfidence(raw: string | null): "low" | "medium" | "high" {
  const c = (raw ?? "").toLowerCase().trim();
  if (c === "low" || c === "medium" || c === "high") return c;
  return "medium";
}

function parseStringArray(raw: unknown): string[] {
  if (Array.isArray(raw)) {
    return raw.filter((x): x is string => typeof x === "string" && x.trim().length > 0);
  }
  return [];
}

/**
 * Builds an `EvaluationReport` compatible object from persisted PG evaluation + dashboard context
 * so the evaluation cockpit can render without blob storage.
 */
export function buildEvaluationReportFromDashboardPayload(
  payload: EvaluationDashboardPayload,
  ctx: { tenantId: string; userId: string; userEmail: string }
): EvaluationReport | null {
  const ev = payload.evaluation;
  if (!ev) return null;

  const strengths = parseStringArray(ev.strengths_json);
  const risks = parseStringArray(ev.risks_json);
  const recommendations = parseStringArray(ev.recommendations_json);

  const mandateSummary = ev.mandate_summary?.trim() || "—";
  const proposalSummary = ev.proposal_summary?.trim() || "—";

  const structuredScores =
    ev.sector_fit != null &&
    ev.geography_fit != null &&
    ev.stage_fit != null &&
    ev.ticket_size_fit != null &&
    ev.risk_adjustment != null
      ? {
          sectorFit: Math.min(25, Math.max(0, ev.sector_fit)),
          geographyFit: Math.min(20, Math.max(0, ev.geography_fit)),
          stageFit: Math.min(15, Math.max(0, ev.stage_fit)),
          ticketSizeFit: Math.min(15, Math.max(0, ev.ticket_size_fit)),
          riskAdjustment: Math.min(0, Math.max(-20, ev.risk_adjustment)),
        }
      : undefined;

  const hasMandate = Boolean(payload.mandate?.mandate_id);
  const docCount = payload.documents.length;
  const charCount = payload.extraction?.char_count ?? 0;

  const evaluatedAt = ev.created_at ?? new Date().toISOString();

  return {
    evaluationId: ev.evaluation_id,
    proposalId: payload.proposal.proposal_id,
    tenantId: ctx.tenantId,
    evaluatedAt,
    evaluatedByUserId: ctx.userId,
    evaluatedByEmail: ctx.userEmail || "system",

    inputs: {
      proposalDocuments: docCount,
      mandateTemplates: hasMandate ? 1 : 0,
      mandateKey: payload.mandate?.mandate_id ?? null,
      totalCharactersProcessed: charCount,
      extractionWarnings: [],
    },

    fitScore: ev.fit_score != null ? Math.min(100, Math.max(0, ev.fit_score)) : null,
    mandateSummary,
    proposalSummary,
    strengths: strengths.length ? strengths : ["—"],
    risks: risks.length ? risks : ["—"],
    recommendations: recommendations.length ? recommendations : ["—"],
    confidence: normalizeConfidence(ev.confidence),

    structuredScores,
    scoringMethod: structuredScores ? "structured" : "fallback",

    model: ev.model_name?.trim() || "stored evaluation",
    version: "pg",
    engineType: "llm",

    validationSummary: payload.validation
      ? {
          validationScore: Math.min(
            100,
            Math.max(0, payload.validation.validation_score ?? 0)
          ),
          confidence: normalizeConfidence(payload.validation.confidence),
          summary: payload.validation.summary ?? undefined,
        }
      : undefined,
  };
}
