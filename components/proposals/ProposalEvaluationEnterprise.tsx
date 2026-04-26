"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import {
  buildCategoryBreakdowns,
  formatSummaryLines,
  recommendationFromFit,
  type EvaluationRecommendation,
} from "@/lib/proposals/evaluationCategories";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sparkles, ChevronDown, UserPlus, Save, Building2, Cpu } from "lucide-react";

/** Mirrors EvaluationReport fields used by this workspace */
export interface EnterpriseEvaluationSource {
  fitScore: number | null;
  confidence: "low" | "medium" | "high";
  proposalSummary: string;
  mandateSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  scoringMethod?: "structured" | "fallback";
  structuredScores?: {
    sectorFit: number;
    geographyFit: number;
    stageFit: number;
    ticketSizeFit: number;
    riskAdjustment: number;
  };
  engineType?: string;
  evaluatedAt: string;
  evaluatedByEmail: string;
  /** Pre-formatted for display */
  evaluatedAtDisplay: string;
}

export interface AssessorOption {
  id: string;
  name: string;
  email: string;
}

export interface ProposalEvaluationEnterpriseProps {
  evaluation: EnterpriseEvaluationSource;
  hasInputs: boolean;
  analystNotes: string;
  onAnalystNotesChange: (value: string) => void;
  assessors: AssessorOption[];
  selectedReviewerId: string;
  onReviewerChange: (id: string) => void;
  onAssignReviewer?: () => void;
  assigning?: boolean;
  onSaveDecision?: (payload: { notes: string; scoreOverride: string | null }) => void;
  readOnly?: boolean;
  className?: string;
  /** When true, only category breakdown + decision panel (for dedicated evaluation page hero layout). */
  omitSummaryColumn?: boolean;
}

const recStyles: Record<
  EvaluationRecommendation,
  { label: string; className: string }
> = {
  Invest: {
    label: "Invest",
    className: "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80",
  },
  Consider: {
    label: "Consider",
    className: "bg-amber-50 text-amber-900 ring-1 ring-amber-200/80",
  },
  Reject: {
    label: "Reject",
    className: "bg-red-50 text-red-800 ring-1 ring-red-200/80",
  },
};

function ConfidenceBadge({ level }: { level: "low" | "medium" | "high" }) {
  const map = {
    high: "text-slate-700 ring-slate-200/80 bg-slate-50",
    medium: "text-slate-700 ring-slate-200/80 bg-slate-50",
    low: "text-slate-700 ring-slate-200/80 bg-slate-50",
  } as const;
  const label = level.charAt(0).toUpperCase() + level.slice(1);
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-2.5 py-0.5 text-[11px] font-medium ring-1",
        map[level]
      )}
    >
      {label} confidence
    </span>
  );
}

function InsightPills({
  scoringMethod,
  engineType,
}: {
  scoringMethod?: "structured" | "fallback";
  engineType?: string;
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-slate-600">
        <Sparkles className="h-3 w-3 text-ipa-primary" aria-hidden />
        AI
      </span>
      {scoringMethod && (
        <span className="rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
          {scoringMethod === "structured" ? "Structured" : "Estimated"}
        </span>
      )}
      {engineType && (
        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/90 bg-white px-2 py-0.5 text-[10px] font-medium text-slate-600">
          <Cpu className="h-3 w-3" aria-hidden />
          {engineType}
        </span>
      )}
    </div>
  );
}

type CategoryItem = ReturnType<typeof buildCategoryBreakdowns>[number];

function CategoryRowCompact({ category }: { category: CategoryItem }) {
  return (
    <div className="rounded-lg border border-border/80 bg-card px-3 py-2.5 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[13px] font-semibold text-foreground">{category.label}</span>
        <span className="tabular-nums text-[13px] font-semibold text-ipa-primary">{category.score}</span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div
          className="h-full rounded-full bg-ipa-primary transition-[width] duration-500 ease-out"
          style={{ width: `${category.score}%` }}
        />
      </div>
      <p className="mt-2 text-[12px] leading-snug text-muted-foreground">{category.explanation}</p>
    </div>
  );
}

function CategoryRow({
  category,
  expanded,
  onToggle,
}: {
  category: CategoryItem;
  expanded: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-border bg-card transition-all duration-200",
        expanded && "shadow-sm ring-1 ring-border"
      )}
    >
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left transition-colors hover:bg-muted/50"
      >
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[13px] font-semibold text-foreground">{category.label}</span>
            <span className="tabular-nums text-[13px] font-semibold text-ipa-primary">{category.score}</span>
          </div>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-ipa-primary transition-[width] duration-500 ease-out"
              style={{ width: `${category.score}%` }}
            />
          </div>
          <p className="mt-2 text-[12px] leading-relaxed text-muted-foreground">{category.explanation}</p>
        </div>
        <ChevronDown
          className={cn(
            "mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
            expanded && "rotate-180"
          )}
        />
      </button>
      {expanded && (
        <div className="border-t border-border px-3 pb-3 pt-0">
          <p className="pt-3 text-[12px] leading-relaxed text-foreground/80">{category.detail}</p>
        </div>
      )}
    </div>
  );
}

export function EvaluationCategoryBreakdown({
  categories,
  compact = false,
  className,
}: {
  categories: CategoryItem[];
  compact?: boolean;
  className?: string;
}) {
  const [expandedId, setExpandedId] = useState<string | null>(compact ? null : "market");

  if (compact) {
    return (
      <div className={cn("space-y-2", className)}>
        {categories.map((cat) => (
          <CategoryRowCompact key={cat.id} category={cat} />
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-2.5", className)}>
      {categories.map((cat) => (
        <CategoryRow
          key={cat.id}
          category={cat}
          expanded={expandedId === cat.id}
          onToggle={() => setExpandedId((id) => (id === cat.id ? null : cat.id))}
        />
      ))}
    </div>
  );
}

export function EvaluationActionsPanel({
  analystNotes,
  onAnalystNotesChange,
  assessors,
  selectedReviewerId,
  onReviewerChange,
  onAssignReviewer,
  assigning,
  onSaveDecision,
  readOnly = false,
  className,
}: Pick<
  ProposalEvaluationEnterpriseProps,
  | "analystNotes"
  | "onAnalystNotesChange"
  | "assessors"
  | "selectedReviewerId"
  | "onReviewerChange"
  | "onAssignReviewer"
  | "assigning"
  | "onSaveDecision"
  | "readOnly"
  | "className"
>) {
  const [scoreOverride, setScoreOverride] = useState("");

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm",
        className
      )}
    >
      <div>
        <Label htmlFor="eval-notes" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Analyst notes
        </Label>
        <Textarea
          id="eval-notes"
          value={analystNotes}
          onChange={(e) => onAnalystNotesChange(e.target.value)}
          disabled={readOnly}
          placeholder="Private notes for IC / file…"
          className="mt-1.5 min-h-[88px] resize-y text-sm"
        />
      </div>

      <div>
        <Label htmlFor="score-override" className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Score override (optional)
        </Label>
        <Input
          id="score-override"
          inputMode="numeric"
          value={scoreOverride}
          onChange={(e) => setScoreOverride(e.target.value)}
          disabled={readOnly}
          placeholder="e.g. 78"
          className="mt-1.5 text-sm"
        />
        <p className="mt-1 text-[11px] text-muted-foreground">Does not change the model; for committee records only.</p>
      </div>

      <div>
        <Label className="text-[11px] font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Assign reviewer
        </Label>
        <Select
          value={selectedReviewerId || "__none__"}
          onValueChange={(v) => onReviewerChange(v === "__none__" ? "" : v)}
          disabled={readOnly}
        >
          <SelectTrigger className="mt-1.5">
            <SelectValue placeholder="Select reviewer" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="__none__">None</SelectItem>
            {assessors.map((a) => (
              <SelectItem key={a.id} value={a.id}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onAssignReviewer && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="mt-2 w-full"
            disabled={readOnly || !selectedReviewerId || assigning}
            onClick={onAssignReviewer}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            {assigning ? "Assigning…" : "Apply assignment"}
          </Button>
        )}
      </div>

      <div className="mt-auto border-t border-border pt-3">
        <Button
          type="button"
          className="w-full"
          disabled={readOnly}
          onClick={() =>
            onSaveDecision?.({
              notes: analystNotes,
              scoreOverride: scoreOverride.trim() || null,
            })
          }
        >
          <Save className="mr-2 h-4 w-4" />
          Save decision
        </Button>
      </div>
    </div>
  );
}

/**
 * Premium three-column evaluation workspace: AI summary (left), category breakdown (center), actions (right).
 */
export function ProposalEvaluationEnterprise({
  evaluation,
  hasInputs,
  analystNotes,
  onAnalystNotesChange,
  assessors,
  selectedReviewerId,
  onReviewerChange,
  onAssignReviewer,
  assigning,
  onSaveDecision,
  readOnly = false,
  className,
  omitSummaryColumn = false,
}: ProposalEvaluationEnterpriseProps) {
  const recommendation = useMemo(
    () => recommendationFromFit(evaluation.fitScore, hasInputs),
    [evaluation.fitScore, hasInputs]
  );

  const categories = useMemo(
    () =>
      buildCategoryBreakdowns(
        evaluation.fitScore,
        hasInputs,
        evaluation.structuredScores,
        evaluation.strengths,
        evaluation.risks
      ),
    [
      evaluation.fitScore,
      hasInputs,
      evaluation.structuredScores,
      evaluation.strengths,
      evaluation.risks,
    ]
  );

  const summaryLines = useMemo(
    () => formatSummaryLines(evaluation.proposalSummary || evaluation.mandateSummary),
    [evaluation.proposalSummary, evaluation.mandateSummary]
  );

  const displayScore =
    evaluation.fitScore !== null && hasInputs ? evaluation.fitScore : null;

  return (
    <div
      className={cn(
        "grid gap-4 lg:grid-cols-12 lg:gap-5",
        "animate-in fade-in duration-500 ease-out",
        className
      )}
    >
      {!omitSummaryColumn && (
        <section className="lg:col-span-3">
          <div className="flex h-full flex-col rounded-xl border border-border bg-card p-4 shadow-sm transition-shadow duration-300">
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
              AI summary
            </p>
            <div className="mt-3 flex flex-col items-center text-center">
              <span className="text-5xl font-semibold tabular-nums tracking-tight text-foreground">
                {displayScore !== null ? displayScore : "—"}
              </span>
              <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                Overall score
              </p>
            </div>

            <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
              <span
                className={cn(
                  "rounded-full px-3 py-1 text-xs font-semibold",
                  recStyles[recommendation].className
                )}
              >
                {recStyles[recommendation].label}
              </span>
              <ConfidenceBadge level={evaluation.confidence} />
            </div>

            <div className="mt-4">
              <InsightPills scoringMethod={evaluation.scoringMethod} engineType={evaluation.engineType} />
            </div>

            <div className="mt-4 border-t border-border pt-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-muted-foreground">
                Narrative
              </p>
              <div className="mt-2 space-y-2">
                {summaryLines.map((line, i) => (
                  <p key={i} className="text-[13px] leading-relaxed text-muted-foreground">
                    {line}
                  </p>
                ))}
              </div>
            </div>

            <div className="mt-auto border-t border-border pt-3">
              <div className="flex items-start gap-2 text-[11px] text-muted-foreground">
                <Building2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <span>
                  Evaluated {evaluation.evaluatedAtDisplay} · {evaluation.evaluatedByEmail}
                </span>
              </div>
            </div>
          </div>
        </section>
      )}

      <section className={omitSummaryColumn ? "lg:col-span-7" : "lg:col-span-6"}>
        <div className="rounded-xl border border-border bg-muted/30 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)]">
          <div className="flex flex-wrap items-end justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                Evaluation breakdown
              </p>
              <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                Category scores
              </h2>
            </div>
            <span className="text-[11px] text-muted-foreground">Expand for detail</span>
          </div>

          <div className="mt-4">
            <EvaluationCategoryBreakdown categories={categories} compact={false} />
          </div>
        </div>
      </section>

      <section className={omitSummaryColumn ? "lg:col-span-5" : "lg:col-span-3"}>
        <EvaluationActionsPanel
          analystNotes={analystNotes}
          onAnalystNotesChange={onAnalystNotesChange}
          assessors={assessors}
          selectedReviewerId={selectedReviewerId}
          onReviewerChange={onReviewerChange}
          onAssignReviewer={onAssignReviewer}
          assigning={assigning}
          onSaveDecision={onSaveDecision}
          readOnly={readOnly}
        />
      </section>
    </div>
  );
}
