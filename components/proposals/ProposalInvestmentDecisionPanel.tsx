"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Lightbulb, ListChecks, ShieldAlert, Sparkles } from "lucide-react";

const CATEGORY_LABELS = [
  "Market Opportunity",
  "Team Strength",
  "Financial Health",
  "Product Differentiation",
  "Risk Factors",
] as const;

const PLACEHOLDER_DASH = "—";

function confidenceLabel(c: "low" | "medium" | "high" | null | undefined): string {
  if (!c) return PLACEHOLDER_DASH;
  return c.charAt(0).toUpperCase() + c.slice(1);
}

function riskLevelFromRisks(riskCount: number): string {
  if (riskCount <= 0) return PLACEHOLDER_DASH;
  if (riskCount <= 2) return "Low";
  if (riskCount <= 5) return "Medium";
  return "High";
}

export interface ProposalInvestmentDecisionPanelProps {
  fitScore: number | null;
  confidence: "low" | "medium" | "high" | null;
  /** When false, scores and AI fields show placeholders */
  hasEvaluation: boolean;
  hasMandateInputs?: boolean;
  insights?: string[];
  keyRisks?: string[];
  recommendation?: string | null;
  readOnly?: boolean;
  onApprove?: () => void;
  onNeedsReview?: () => void;
  onReject?: () => void;
}

export function ProposalInvestmentDecisionPanel({
  fitScore,
  confidence,
  hasEvaluation,
  hasMandateInputs = true,
  insights = [],
  keyRisks = [],
  recommendation,
  readOnly = false,
  onApprove,
  onNeedsReview,
  onReject,
}: ProposalInvestmentDecisionPanelProps) {
  const showScore =
    hasEvaluation && fitScore != null && hasMandateInputs;
  const insightItems =
    hasEvaluation && insights.length > 0
      ? insights.slice(0, 5)
      : [PLACEHOLDER_DASH, PLACEHOLDER_DASH, PLACEHOLDER_DASH];
  const riskItems =
    hasEvaluation && keyRisks.length > 0
      ? keyRisks.slice(0, 5)
      : [PLACEHOLDER_DASH, PLACEHOLDER_DASH];
  const recText =
    hasEvaluation && recommendation?.trim()
      ? recommendation.trim()
      : "AI-generated recommendation will appear here after you run an evaluation.";

  const riskLevel =
    hasEvaluation && keyRisks.length > 0
      ? riskLevelFromRisks(keyRisks.length)
      : PLACEHOLDER_DASH;

  return (
    <div className="border-b border-slate-100 bg-white">
      <div className="px-5 py-8 sm:px-6">
        <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              Investment score
            </p>
            <p
              className={cn(
                "mt-1 text-5xl font-bold tabular-nums tracking-tight sm:text-6xl",
                showScore ? "text-slate-900" : "text-slate-300"
              )}
            >
              {showScore ? fitScore : PLACEHOLDER_DASH}
              <span className="text-2xl font-semibold text-slate-400 sm:text-3xl"> / 100</span>
            </p>
          </div>
          <div className="flex flex-wrap gap-4 lg:pt-2">
            <div className="min-w-[140px] rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Confidence
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">
                {hasEvaluation && confidence ? confidenceLabel(confidence) : PLACEHOLDER_DASH}
              </p>
            </div>
            <div className="min-w-[140px] rounded-lg border border-slate-100 bg-slate-50/80 px-4 py-3">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                Risk level
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-900">{riskLevel}</p>
            </div>
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2">
            <Lightbulb className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">AI key insights</h3>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {insightItems.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2">
            <ListChecks className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">Category scores</h3>
          </div>
          <div className="mt-4 divide-y divide-slate-100 rounded-lg border border-slate-100">
            {CATEGORY_LABELS.map((label) => (
              <div
                key={label}
                className="flex items-center justify-between gap-4 px-4 py-3 text-sm"
              >
                <span className="text-slate-700">{label}</span>
                <span className="tabular-nums font-medium text-slate-500">{PLACEHOLDER_DASH}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">Key risks</h3>
          </div>
          <ul className="mt-3 list-disc space-y-2 pl-5 text-sm leading-relaxed text-slate-700">
            {riskItems.map((line, i) => (
              <li key={i}>{line}</li>
            ))}
          </ul>
        </div>

        <div className="mt-10">
          <div className="flex items-center gap-2">
            <Sparkles className="h-4 w-4 text-slate-500" aria-hidden />
            <h3 className="text-sm font-semibold text-slate-900">AI recommendation</h3>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-slate-600">{recText}</p>
        </div>

        <div className="mt-10 flex flex-wrap gap-2 border-t border-slate-100 pt-8">
          <Button
            type="button"
            size="sm"
            disabled={readOnly}
            className="bg-emerald-700 text-white shadow-sm hover:bg-emerald-800"
            onClick={onApprove}
          >
            Approve
          </Button>
          <Button type="button" size="sm" variant="outline" className="border-slate-200" onClick={onNeedsReview}>
            Needs Review
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="border-red-200 text-red-800 hover:bg-red-50"
            disabled={readOnly}
            onClick={onReject}
          >
            Reject
          </Button>
        </div>
      </div>
    </div>
  );
}
