// POST /api/tenant/proposals/[id]/generate-report
// Full Report Engine - generates AI investment memo

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalRecordPg } from "@/lib/proposals/proposalDetail";
import { generateInvestmentReport } from "@/lib/evaluation/reportEngine";
import { logAudit } from "@/lib/audit";
import { persistProposalReport } from "@/lib/pg/persistProposalRecords";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);

    const record = await getProposalRecordPg(tenantId, proposalId);
    if (!record) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const report = await generateInvestmentReport({
      tenantId,
      proposalId,
      proposalName: record.proposal_name,
      applicant: record.applicant_name,
      fundName: record.fund_name ?? "",
      fundId: record.fund_id || null,
      amount: record.requested_amount ?? 0,
      generatedByUserId: user.userId || "",
      generatedByEmail: user.email || "",
    });

    await persistProposalReport(tenantId, proposalId, report, null);

    logAudit({
      action: "proposal.report_generated",
      actorUserId: user.userId || "",
      actorEmail: user.email,
      tenantId,
      resourceType: "proposal_report",
      resourceId: proposalId,
      details: {
        reportId: report.reportId,
        score: report.score,
        decision: report.decision,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        reportId: report.reportId,
        proposalId: report.proposalId,
        title: report.title,
        generatedAt: report.generatedAt,
        score: report.score,
        confidence: report.confidence,
        summary: report.summary,
        investmentThesis: report.investmentThesis,
        strengths: report.strengths,
        risks: report.risks,
        recommendations: report.recommendations,
        validationSummary: report.validationSummary,
        fitSummary: report.fitSummary,
        decision: report.decision,
        warnings: report.warnings,
      },
    });
  } catch (error) {
    console.error("[generate-report] Error for proposal", proposalId, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    const message = error instanceof Error ? error.message : "Failed to generate report";
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
