"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ProposalEvaluationCockpit, ProposalEvaluationScreen } from "@/components/proposals";
import type { EvaluationDashboardPayload } from "@/lib/proposals/evaluationDashboardTypes";
import { buildEvaluationReportFromDashboardPayload } from "@/lib/proposals/evaluationDashboardMap";
import type { EvaluationReport } from "@/lib/evaluation/types";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

export default function ProposalEvaluationDashboardClient({
  proposalId,
  tenantId,
  userId,
  userEmail,
  canAssign,
  isReadOnly,
}: {
  proposalId: string;
  tenantId: string;
  userId: string;
  userEmail: string;
  canAssign: boolean;
  isReadOnly: boolean;
}) {
  const router = useRouter();
  const [payload, setPayload] = useState<EvaluationDashboardPayload | null>(null);
  const [report, setReport] = useState<EvaluationReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [pdfError, setPdfError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(proposalId)}/evaluation-dashboard`, {
        credentials: "include",
      });
      const json = (await res.json()) as { ok?: boolean; data?: EvaluationDashboardPayload; error?: string };
      if (res.status === 404 || !json.data) {
        setError(json.error ?? "Proposal not found");
        setPayload(null);
        setReport(null);
        return;
      }
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? `Unable to load evaluation (${res.status})`);
        setPayload(null);
        setReport(null);
        return;
      }
      setPayload(json.data);
      setReport(
        buildEvaluationReportFromDashboardPayload(json.data, {
          tenantId,
          userId,
          userEmail,
        })
      );
    } catch {
      setError("Network error loading evaluation");
      setPayload(null);
      setReport(null);
    } finally {
      setLoading(false);
    }
  }, [proposalId, tenantId, userId, userEmail]);

  useEffect(() => {
    void load();
  }, [load]);

  const onEvaluationComplete = useCallback(() => {
    void load();
    router.refresh();
  }, [load, router]);

  const handleGenerateEvaluationPdf = useCallback(async () => {
    setPdfLoading(true);
    setPdfError(null);
    try {
      const res = await fetch(
        `/api/proposals/${encodeURIComponent(proposalId)}/evaluation-report/pdf`,
        { method: "POST", credentials: "include" }
      );
      if (!res.ok) {
        const errJson = (await res.json().catch(() => ({}))) as { error?: string };
        throw new Error(errJson.error ?? `PDF failed (${res.status})`);
      }
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `InvestLogic_Evaluation_${proposalId.replace(/[^\w.-]+/g, "_")}.pdf`;
      a.rel = "noopener";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (e) {
      console.error("[evaluation pdf]", e);
      setPdfError(e instanceof Error ? e.message : "Failed to generate PDF");
    } finally {
      setPdfLoading(false);
    }
  }, [proposalId]);

  if (loading && !payload) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-12 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-slate-600">Loading evaluation workspace…</p>
      </div>
    );
  }

  if (error || !payload) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 text-sm text-amber-950">
        <p className="font-medium">{error ?? "Unable to load this proposal"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-14 pb-12">
      {pdfError && (
        <div className="rounded-lg border border-rose-200 bg-rose-50/90 px-4 py-3 text-sm text-rose-900">
          {pdfError}
        </div>
      )}
      <ProposalEvaluationScreen
        proposalName={payload.proposal.proposal_name}
        proposalId={payload.proposal.proposal_id}
        backHref={`/dashboard/proposals/${proposalId}`}
        onGenerateReport={handleGenerateEvaluationPdf}
        generateReportLoading={pdfLoading}
      />
      <ProposalEvaluationCockpit
        proposal={payload.proposal}
        initialReport={report}
        documentCount={payload.documents.length}
        canAssign={canAssign}
        isReadOnly={isReadOnly}
        dashboardPayload={payload}
        onEvaluationComplete={onEvaluationComplete}
        embedded
      />
    </div>
  );
}
