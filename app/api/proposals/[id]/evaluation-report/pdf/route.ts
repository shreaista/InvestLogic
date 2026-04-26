// POST /api/proposals/[id]/evaluation-report/pdf
// Generates an investor-style PDF from evaluation dashboard data (no fabricated scores).

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requirePermission,
  PROPOSAL_READ,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { loadEvaluationDashboard } from "@/lib/proposals/evaluationDashboardPg";
import { buildEvaluationReportFromDashboardPayload } from "@/lib/proposals/evaluationDashboardMap";
import { generateEvaluationReportPdf } from "@/lib/evaluation/evaluationReportPdf";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(_request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();
    if (!ctx.user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);
    requirePermission(ctx, PROPOSAL_READ);

    const { id: proposalId } = await context.params;

    const payload = await loadEvaluationDashboard(tenantId, proposalId);
    if (!payload) {
      return NextResponse.json({ ok: false, error: "Proposal not found" }, { status: 404 });
    }

    const proposal: Proposal = {
      id: payload.proposal.proposal_id,
      tenantId,
    };
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const report = buildEvaluationReportFromDashboardPayload(payload, {
      tenantId,
      userId: ctx.user.id ?? "",
      userEmail: ctx.user.email ?? "",
    });

    const hasEvaluationInputs =
      payload.documents.length > 0 && Boolean(payload.mandate?.mandate_id);

    const pdfBytes = await generateEvaluationReportPdf({
      proposalName: payload.proposal.proposal_name,
      fundName: payload.fund?.fund_name ?? "",
      generatedAtIso: new Date().toISOString(),
      report,
      hasEvaluationInputs,
      extractionPreview: payload.extraction?.preview_text ?? null,
    });

    const safeId = proposalId.replace(/[^\w.-]+/g, "_");
    const filename = `IPA_Evaluation_${safeId}.pdf`;

    return new NextResponse(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Cache-Control": "no-store",
      },
    });
  } catch (error) {
    console.error("[evaluation-report/pdf]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to generate PDF" }, { status: 500 });
  }
}
