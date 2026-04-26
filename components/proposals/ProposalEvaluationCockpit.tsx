"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import type { ProposalDetailRow } from "@/lib/proposals/proposalDetailTypes";
import type { EvaluationDashboardPayload } from "@/lib/proposals/evaluationDashboardTypes";
import type { EvaluationReport } from "@/lib/evaluation/types";
import {
  buildCategoryBreakdowns,
  buildInsightTags,
  formatAIParagraph,
  recommendationFromFit,
} from "@/lib/proposals/evaluationCategories";
import { EvaluationActionsPanel, EvaluationCategoryBreakdown, type AssessorOption } from "./ProposalEvaluationEnterprise";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Building2,
  Calendar,
  FileText,
  Landmark,
  Loader2,
  Sparkles,
} from "lucide-react";

function formatDisplayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

function formatCurrency(n: number | null): string {
  if (n === null || Number.isNaN(n)) return "Not specified";
  return new Intl.NumberFormat(undefined, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(n);
}

function MandateFitCompact({
  proposal,
  report,
}: {
  proposal: ProposalDetailRow;
  report: EvaluationReport | null;
}) {
  const s = report?.structuredScores;
  const rows: { key: string; display: string; pct: number | null }[] = [
    {
      key: "Sector fit",
      display: proposal.sector?.trim() || "—",
      pct: s ? (s.sectorFit / 25) * 100 : null,
    },
    {
      key: "Geography fit",
      display: proposal.geography?.trim() || "—",
      pct: s ? (s.geographyFit / 20) * 100 : null,
    },
    {
      key: "Stage fit",
      display: proposal.stage?.trim() || "—",
      pct: s ? (s.stageFit / 15) * 100 : null,
    },
    {
      key: "Ticket size fit",
      display: formatCurrency(proposal.requested_amount),
      pct: s ? (s.ticketSizeFit / 15) * 100 : null,
    },
  ];

  return (
    <div className="space-y-2">
      <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">Mandate fit</p>
      {rows.map((row) => (
        <div key={row.key} className="rounded-lg border border-border/80 bg-muted/20 px-2.5 py-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-foreground">{row.key}</span>
            {row.pct != null ? (
              <span className="tabular-nums text-[11px] font-medium text-ipa-primary">{Math.round(row.pct)}%</span>
            ) : (
              <span className="text-[11px] text-muted-foreground">—</span>
            )}
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-muted-foreground">{row.display}</p>
          {row.pct != null && (
            <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-muted">
              <div
                className="h-full rounded-full bg-ipa-primary/85 transition-[width]"
                style={{ width: `${Math.min(100, row.pct)}%` }}
              />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export interface ProposalEvaluationCockpitProps {
  proposal: ProposalDetailRow;
  initialReport: EvaluationReport | null;
  documentCount: number;
  canAssign: boolean;
  isReadOnly: boolean;
  /** When set, shows fund, mandate, documents, validation, and readiness from PostgreSQL-backed dashboard API. */
  dashboardPayload?: EvaluationDashboardPayload | null;
  /** Called after a successful POST /evaluate so the client can refetch dashboard data. */
  onEvaluationComplete?: () => void;
  /** When true, omits back link and hero so the screen can sit under a dedicated evaluation layout. */
  embedded?: boolean;
}

export function ProposalEvaluationCockpit({
  proposal,
  initialReport,
  documentCount,
  canAssign,
  isReadOnly,
  dashboardPayload,
  onEvaluationComplete,
  embedded = false,
}: ProposalEvaluationCockpitProps) {
  const router = useRouter();
  const [report, setReport] = useState<EvaluationReport | null>(initialReport);
  const [running, setRunning] = useState(false);
  const [analystNotes, setAnalystNotes] = useState("");
  const [assessors, setAssessors] = useState<AssessorOption[]>([]);
  const [selectedReviewerId, setSelectedReviewerId] = useState("");

  useEffect(() => {
    setReport(initialReport);
  }, [initialReport]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/tenant/assessors");
        const data = await res.json();
        if (!cancelled && res.ok && data.data?.assessors) {
          setAssessors(data.data.assessors);
        }
      } catch {
        /* ignore */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const evaluatedAtDisplay = useMemo(() => {
    if (!report?.evaluatedAt) return "—";
    return formatDisplayDate(report.evaluatedAt);
  }, [report]);

  const hasInputs = documentCount > 0 && (report?.inputs?.mandateTemplates ?? 0) > 0;

  const recommendation = useMemo(
    () => recommendationFromFit(report?.fitScore ?? null, hasInputs),
    [report?.fitScore, hasInputs]
  );

  const aiParagraph = useMemo(
    () => formatAIParagraph(report?.proposalSummary || report?.mandateSummary || ""),
    [report?.proposalSummary, report?.mandateSummary]
  );

  const categories = useMemo(
    () =>
      buildCategoryBreakdowns(
        report?.fitScore ?? null,
        hasInputs,
        report?.structuredScores,
        report?.strengths ?? [],
        report?.risks ?? []
      ),
    [report?.fitScore, hasInputs, report?.structuredScores, report?.strengths, report?.risks]
  );

  const insightTags = useMemo(
    () => buildInsightTags(report?.strengths ?? [], report?.risks ?? [], 6),
    [report?.strengths, report?.risks]
  );

  async function runEvaluation() {
    setRunning(true);
    try {
      const res = await fetch(`/api/proposals/${proposal.proposal_id}/evaluate`, { method: "POST" });
      if (!res.ok) return;
      onEvaluationComplete?.();
      router.refresh();
    } finally {
      setRunning(false);
    }
  }

  return (
    <div className="space-y-8">
      {!embedded && (
        <>
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/dashboard/proposals/${proposal.proposal_id}`}
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-600 transition-colors hover:text-primary"
            >
              <ArrowLeft className="h-4 w-4" />
              Back to proposal
            </Link>
          </div>

          {/* Hero */}
          <div className="rounded-2xl border border-slate-200/90 bg-white p-6 shadow-[0_1px_3px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_4px_16px_rgba(15,23,42,0.06)]">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0 space-y-2">
                <h1 className="text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                  {proposal.proposal_name}
                </h1>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-4 w-4 text-slate-400" />
                    {proposal.applicant_name}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Landmark className="h-4 w-4 text-slate-400" />
                    {proposal.fund_name ?? "Fund not linked"}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-400" />
                    {proposal.status.replace(/_/g, " ")}
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <Calendar className="h-4 w-4 text-slate-400" />
                    Submitted {formatDisplayDate(proposal.created_at)}
                  </span>
                </div>
              </div>
              <div className="shrink-0 text-right">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Requested amount</p>
                <p className="mt-1 text-lg font-semibold tabular-nums text-slate-900">
                  {formatCurrency(proposal.requested_amount)}
                </p>
              </div>
            </div>
          </div>
        </>
      )}

      {embedded && (
        <div className="border-t border-slate-200/80 pt-10">
          <h2 className="text-sm font-semibold tracking-tight text-slate-900">Workspace &amp; data</h2>
          <p className="mt-1 text-sm text-slate-600">
            Fund context, documents, extraction, and run evaluation below.
          </p>
        </div>
      )}

      {dashboardPayload && (
        <div className="grid gap-4 lg:grid-cols-2">
          {dashboardPayload.fund && (
            <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Fund</p>
              <p className="mt-2 text-base font-semibold text-slate-900">
                {dashboardPayload.fund.fund_name ?? "—"}{" "}
                {dashboardPayload.fund.fund_code ? (
                  <span className="font-normal text-slate-500">({dashboardPayload.fund.fund_code})</span>
                ) : null}
              </p>
              {dashboardPayload.fund.thesis ? (
                <p className="mt-2 text-sm leading-relaxed text-slate-600 line-clamp-4">{dashboardPayload.fund.thesis}</p>
              ) : (
                <p className="mt-2 text-xs text-slate-500">Thesis not recorded for this fund.</p>
              )}
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
                <span>Geo: {dashboardPayload.fund.geography ?? "—"}</span>
                <span>Stage focus: {dashboardPayload.fund.stage_focus ?? "—"}</span>
                <span>
                  Ticket:{" "}
                  {dashboardPayload.fund.ticket_size_min != null && dashboardPayload.fund.ticket_size_max != null
                    ? `${formatCurrency(dashboardPayload.fund.ticket_size_min)} – ${formatCurrency(dashboardPayload.fund.ticket_size_max)}`
                    : "—"}
                </span>
              </div>
            </div>
          )}
          {dashboardPayload.mandate && (
            <div className="rounded-2xl border border-slate-200/90 bg-slate-50/40 p-5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Active mandate</p>
              <p className="mt-2 text-sm font-medium text-slate-900">
                {dashboardPayload.mandate.mandate_name ?? "Mandate"}{" "}
                {dashboardPayload.mandate.mandate_version != null ? (
                  <span className="font-normal text-slate-500">v{dashboardPayload.mandate.mandate_version}</span>
                ) : null}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Uploaded {dashboardPayload.mandate.uploaded_at ? formatDisplayDate(dashboardPayload.mandate.uploaded_at) : "—"}
              </p>
              {dashboardPayload.mandate.extracted_text ? (
                <p className="mt-3 max-h-32 overflow-y-auto text-xs leading-relaxed text-slate-700">
                  {dashboardPayload.mandate.extracted_text.slice(0, 1200)}
                  {dashboardPayload.mandate.extracted_text.length > 1200 ? "…" : ""}
                </p>
              ) : (
                <p className="mt-3 text-xs text-slate-500">No extracted mandate text on file.</p>
              )}
            </div>
          )}
        </div>
      )}

      {dashboardPayload && dashboardPayload.documents.length > 0 && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Documents</p>
          <ul className="mt-3 divide-y divide-slate-100">
            {dashboardPayload.documents.slice(0, 12).map((d) => (
              <li key={d.proposal_document_id} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span className="font-medium text-slate-800">{d.file_name}</span>
                <span className="text-xs text-slate-500">
                  {d.file_type} · {(d.file_size_bytes / 1024).toFixed(1)} KB
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {dashboardPayload && (
        <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Extracted text</p>
          <p className="mt-2 text-xs text-slate-600">
            {dashboardPayload.extraction?.has_extracted && dashboardPayload.extraction.preview_text
              ? dashboardPayload.extraction.preview_text.slice(0, 2000) +
                (dashboardPayload.extraction.preview_text.length > 2000 ? "…" : "")
              : "Document text preview unavailable. Run extraction on the proposal when ready."}
          </p>
        </div>
      )}

      {dashboardPayload?.report && (
        <div className="rounded-2xl border border-emerald-200/70 bg-emerald-50/25 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-emerald-900/80">Investment report</p>
          <p className="mt-2 text-sm font-semibold text-slate-900">{dashboardPayload.report.report_title ?? "Report"}</p>
          <p className="mt-1 text-xs text-slate-600 line-clamp-3">{dashboardPayload.report.executive_summary ?? "—"}</p>
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-slate-600">
            <span>Score: {dashboardPayload.report.score ?? "—"}</span>
            <span>Decision: {dashboardPayload.report.decision ?? "—"}</span>
            {dashboardPayload.report.pdf_storage_url ? (
              <a
                href={dashboardPayload.report.pdf_storage_url}
                className="font-medium text-primary underline-offset-2 hover:underline"
                target="_blank"
                rel="noreferrer"
              >
                Open PDF
              </a>
            ) : null}
          </div>
        </div>
      )}

      {dashboardPayload?.validation && (
        <div className="rounded-2xl border border-blue-200/80 bg-blue-50/30 p-5">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-blue-900/80">Latest validation</p>
          <div className="mt-2 flex flex-wrap items-end gap-4">
            <div>
              <p className="text-3xl font-semibold tabular-nums text-slate-900">
                {dashboardPayload.validation.validation_score ?? "—"}
              </p>
              <p className="text-xs text-slate-500">Score</p>
            </div>
            <p className="text-sm text-slate-700">
              {dashboardPayload.validation.summary ?? "No summary stored."}
            </p>
          </div>
          <div className="mt-3 flex flex-wrap gap-2 text-[11px] text-slate-600">
            {[
              ["Revenue", dashboardPayload.validation.revenue_status],
              ["Forecast", dashboardPayload.validation.forecast_status],
              ["Stage", dashboardPayload.validation.stage_status],
              ["IP", dashboardPayload.validation.ip_status],
              ["Competitors", dashboardPayload.validation.competitor_status],
              ["Model", dashboardPayload.validation.business_model_status],
            ].map(([k, v]) => (
              <span key={k} className="rounded-md bg-white/80 px-2 py-0.5 ring-1 ring-slate-200/80">
                {k}: {v ?? "—"}
              </span>
            ))}
          </div>
        </div>
      )}

      {dashboardPayload && dashboardPayload.derived.missingPrerequisites.length > 0 && (
        <div className="rounded-2xl border border-amber-200/80 bg-amber-50/40 px-5 py-4 text-sm text-amber-950">
          <p className="font-medium">Prerequisites</p>
          <ul className="mt-2 list-inside list-disc text-amber-900/90">
            {dashboardPayload.derived.missingPrerequisites.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
          <p className="mt-2 text-xs text-amber-900/80">
            Readiness: {dashboardPayload.derived.evaluationReadiness.replace(/_/g, " ")} · Confidence label:{" "}
            {dashboardPayload.derived.confidenceLabel}
          </p>
        </div>
      )}

      {!report && (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 px-6 py-14 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-slate-200 bg-white shadow-sm">
            <Sparkles className="h-6 w-6 text-slate-500" />
          </div>
          <h2 className="mt-4 text-base font-semibold text-slate-900">No evaluation yet</h2>
          <p className="mx-auto mt-2 max-w-md text-sm leading-relaxed text-slate-600">
            Run an AI evaluation to score mandate fit, surface risks, and generate a structured breakdown for IC
            review. Ensure documents are uploaded and a fund is selected on the proposal.
          </p>
          <Button
            className="mt-6"
            disabled={running || documentCount === 0 || isReadOnly}
            onClick={() => void runEvaluation()}
          >
            {running ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Running…
              </>
            ) : (
              "Run evaluation"
            )}
          </Button>
          {documentCount === 0 && (
            <p className="mt-3 text-xs text-amber-800">Upload at least one document on the proposal before running.</p>
          )}
        </div>
      )}

      {report && (
        <div className="space-y-4">
          {/* Top evaluation summary */}
          <div className="rounded-xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-8">
              <div className="flex flex-shrink-0 flex-wrap items-end gap-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Overall score
                  </p>
                  <p className="mt-1 text-4xl font-semibold tabular-nums tracking-tight text-foreground sm:text-5xl">
                    {report.fitScore !== null && hasInputs ? report.fitScore : "—"}
                    <span className="ml-1 text-base font-medium text-muted-foreground sm:text-lg">/100</span>
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <span
                    className={cn(
                      "rounded-full px-3 py-1 text-xs font-semibold ring-1",
                      recommendation === "Invest" && "bg-emerald-50 text-emerald-900 ring-emerald-200/80",
                      recommendation === "Consider" && "bg-amber-50 text-amber-950 ring-amber-200/80",
                      recommendation === "Reject" && "bg-red-50 text-red-900 ring-red-200/80"
                    )}
                  >
                    {recommendation}
                  </span>
                  <span className="rounded-full border border-border bg-muted/50 px-2.5 py-0.5 text-[11px] font-medium capitalize text-muted-foreground">
                    {report.confidence} confidence
                  </span>
                </div>
              </div>
              <div className="min-w-0 flex-1 border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-8 lg:pt-0">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  AI summary
                </p>
                <p className="mt-2 text-sm leading-relaxed text-foreground/90">{aiParagraph}</p>
                <p className="mt-2 text-[11px] text-muted-foreground">
                  {report.model ?? "—"} · {evaluatedAtDisplay} · {report.evaluatedByEmail}
                </p>
              </div>
            </div>
          </div>

          {/* Three-column cockpit */}
          <div className="grid gap-4 lg:grid-cols-12 lg:items-stretch">
            <div className="flex min-h-0 flex-col gap-3 rounded-xl border border-border bg-card p-4 shadow-sm lg:col-span-3">
              <MandateFitCompact proposal={proposal} report={report} />
              <div className="border-t border-border pt-3">
                <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                  AI insights
                </p>
                {insightTags.length > 0 ? (
                  <div className="mt-2 flex flex-wrap gap-1.5">
                    {insightTags.map((tag, i) => (
                      <Badge
                        key={`${tag}-${i}`}
                        variant="outline"
                        className="border-border bg-muted/30 px-2 py-0.5 text-[11px] font-normal text-foreground/90"
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : (
                  <p className="mt-2 text-[11px] text-muted-foreground">Insights appear as strengths and risks populate.</p>
                )}
              </div>
            </div>

            <div className="flex min-h-0 flex-col rounded-xl border border-border bg-muted/25 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.5)] lg:col-span-6">
              <div className="flex flex-wrap items-end justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-muted-foreground">
                    Score breakdown
                  </p>
                  <h2 className="mt-0.5 text-base font-semibold tracking-tight text-foreground">
                    Category pillars
                  </h2>
                </div>
              </div>
              <div className="mt-3 min-h-0 flex-1">
                <EvaluationCategoryBreakdown categories={categories} compact />
              </div>
            </div>

            <div className="min-h-0 lg:col-span-3">
              <EvaluationActionsPanel
                analystNotes={analystNotes}
                onAnalystNotesChange={setAnalystNotes}
                assessors={assessors}
                selectedReviewerId={selectedReviewerId}
                onReviewerChange={setSelectedReviewerId}
                onAssignReviewer={undefined}
                assigning={false}
                onSaveDecision={() => {}}
                readOnly={isReadOnly}
              />
            </div>
          </div>

          {canAssign && (
            <p className="text-xs text-muted-foreground">
              Reviewer assignment uses the proposal detail workflow. Open the proposal to assign queues and assessors.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
