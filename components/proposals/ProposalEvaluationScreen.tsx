"use client";

import Link from "next/link";
import { ArrowLeft, AlertTriangle, FileDown, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const CATEGORY_LABELS = [
  "Market Opportunity",
  "Team Strength",
  "Financial Health",
  "Product Differentiation",
  "Risk Factors",
] as const;

const INSIGHT_SLOTS = 5;
const RISK_SLOTS = 3;
const RECOMMENDATION_LINES = 3;

export interface ProposalEvaluationScreenProps {
  proposalName: string;
  proposalId: string;
  backHref: string;
  /** When set, shows Generate Report and calls this handler (e.g. POST PDF + download). */
  onGenerateReport?: () => void | Promise<void>;
  generateReportLoading?: boolean;
}

/**
 * Investment proposal evaluation layout: scoring, insights, categories, risks, recommendation, and IC-style actions.
 * Uses placeholders until wired to evaluation API data.
 */
export function ProposalEvaluationScreen({
  proposalName,
  proposalId,
  backHref,
  onGenerateReport,
  generateReportLoading = false,
}: ProposalEvaluationScreenProps) {
  return (
    <div className="mx-auto max-w-3xl space-y-8">
      <div>
        <Link
          href={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4 shrink-0" />
          Back to proposal
        </Link>
        <h1 className="mt-4 text-2xl font-semibold tracking-tight text-slate-900">{proposalName}</h1>
        <p className="mt-1 font-mono text-xs text-slate-500">{proposalId}</p>
        <p className="mt-2 text-sm text-slate-600">Evaluation</p>
      </div>

      {/* 1. Top summary */}
      <section
        className="rounded-[14px] border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        aria-labelledby="eval-summary-heading"
      >
        <h2 id="eval-summary-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Summary
        </h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Investment score</p>
            <p className="mt-2 flex items-baseline gap-1">
              <span className="text-4xl font-semibold tabular-nums tracking-tight text-slate-400">—</span>
              <span className="text-sm font-medium text-slate-400">/100</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Label</p>
            <p className="mt-2">
              <span
                className={cn(
                  "inline-flex rounded-full border px-3 py-1 text-xs font-semibold",
                  "border-slate-200 bg-slate-50 text-slate-500"
                )}
              >
                —
              </span>
            </p>
            <p className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden />
                Strong
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-400" aria-hidden />
                Moderate
              </span>
              <span className="inline-flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-rose-500" aria-hidden />
                Weak
              </span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Confidence</p>
            <p className="mt-2 text-sm font-medium text-slate-400">—</p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              <span>Low</span>
              <span>Medium</span>
              <span>High</span>
            </p>
          </div>
          <div>
            <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">Risk level</p>
            <p className="mt-2 text-sm font-medium text-slate-400">—</p>
            <p className="mt-1 flex flex-wrap gap-x-3 text-[11px] text-slate-500">
              <span className="text-emerald-700">Low</span>
              <span className="text-amber-700">Medium</span>
              <span className="text-rose-700">High</span>
            </p>
          </div>
        </div>
      </section>

      {/* 2. AI key insights */}
      <section
        className="rounded-[14px] border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        aria-labelledby="eval-insights-heading"
      >
        <h2 id="eval-insights-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          AI key insights
        </h2>
        <ul className="mt-4 list-none space-y-2.5">
          {Array.from({ length: INSIGHT_SLOTS }, (_, i) => (
            <li key={i} className="flex gap-3 text-sm leading-snug text-slate-600">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-slate-300" aria-hidden />
              <span className="text-slate-400">—</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 3. Category scores */}
      <section
        className="rounded-[14px] border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]"
        aria-labelledby="eval-categories-heading"
      >
        <h2 id="eval-categories-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Category scores
        </h2>
        <ul className="mt-4 space-y-4">
          {CATEGORY_LABELS.map((label) => (
            <li key={label}>
              <div className="flex items-center justify-between gap-4 text-sm">
                <span className="font-medium text-slate-800">{label}</span>
                <span className="shrink-0 tabular-nums text-slate-400">—</span>
              </div>
              <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full w-0 rounded-full bg-slate-200" aria-hidden />
              </div>
            </li>
          ))}
        </ul>
      </section>

      {/* 4. Risks & gaps */}
      <section
        className="rounded-[14px] border border-amber-200/60 bg-amber-50/40 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        aria-labelledby="eval-risks-heading"
      >
        <h2 id="eval-risks-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-amber-900/70">
          Risks &amp; gaps
        </h2>
        <ul className="mt-4 space-y-3">
          {Array.from({ length: RISK_SLOTS }, (_, i) => (
            <li key={i} className="flex items-start gap-2.5 text-sm text-amber-950/90">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" aria-hidden />
              <span className="text-slate-500">—</span>
            </li>
          ))}
        </ul>
      </section>

      {/* 5. Recommendation */}
      <section
        className="rounded-[14px] border border-slate-200/90 bg-slate-50/50 p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)]"
        aria-labelledby="eval-rec-heading"
      >
        <h2 id="eval-rec-heading" className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
          Recommendation
        </h2>
        <div className="mt-3 space-y-2">
          {Array.from({ length: RECOMMENDATION_LINES }, (_, i) => (
            <p key={i} className="text-sm leading-relaxed text-slate-400">
              —
            </p>
          ))}
        </div>
      </section>

      {/* Report PDF */}
      {onGenerateReport && (
        <section className="rounded-[14px] border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
          <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Report export</h2>
          <p className="mt-1 text-sm leading-relaxed text-slate-600">
            Generate a clean PDF with cover page, executive summary, insights, scoring, risks, and appendix highlights.
          </p>
          <Button
            type="button"
            className="mt-4 h-11 bg-blue-950 px-6 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            onClick={() => void onGenerateReport()}
            disabled={generateReportLoading}
          >
            {generateReportLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden />
                Generating report…
              </>
            ) : (
              <>
                <FileDown className="mr-2 h-4 w-4" aria-hidden />
                Generate Report
              </>
            )}
          </Button>
        </section>
      )}

      {/* 6. Actions */}
      <section className="rounded-[14px] border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.06)]">
        <h2 className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">Actions</h2>
        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-emerald-200 bg-emerald-50/80 text-emerald-900 hover:bg-emerald-50 disabled:opacity-60"
            title="Awaiting workflow connection"
          >
            Approve
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-amber-200 bg-amber-50/80 text-amber-950 hover:bg-amber-50 disabled:opacity-60"
            title="Awaiting workflow connection"
          >
            Needs review
          </Button>
          <Button
            type="button"
            variant="outline"
            disabled
            className="border-rose-200 bg-rose-50/80 text-rose-900 hover:bg-rose-50 disabled:opacity-60"
            title="Awaiting workflow connection"
          >
            Reject
          </Button>
        </div>
        <p className="mt-3 text-xs text-slate-500">Decision actions will connect to your review workflow.</p>
      </section>
    </div>
  );
}
