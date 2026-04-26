// API route to run Proposal Evaluation with LLM
// POST /api/proposals/[id]/evaluate

import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  requireAnyPermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  LLM_USE,
  REPORT_GENERATE,
  type Proposal,
} from "@/lib/authz";
import { getProposalRecordPg } from "@/lib/proposals/proposalDetail";
import { runEvaluation } from "@/lib/evaluation/proposalEvaluator";
import { checkRateLimit } from "@/lib/evaluation/rateLimiter";
import { logAudit } from "@/lib/audit";
import { persistProposalEvaluation } from "@/lib/pg/persistProposalRecords";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

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

    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

    const rateLimitResult = checkRateLimit(tenantId);
    if (!rateLimitResult.allowed) {
      throw new AuthzHttpError(429, rateLimitResult.message || "Rate limit exceeded");
    }

    const record = await getProposalRecordPg(tenantId, id);
    if (!record) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const proposal: Proposal = {
      id: record.proposal_id,
      tenantId: record.tenant_id,
    };

    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const result = await runEvaluation({
      tenantId,
      proposalId: id,
      fundName: record.fund_name ?? record.proposal_name,
      fundId: record.fund_id || null,
      mandateKey: null,
      evaluatedByUserId: ctx.user.id || "",
      evaluatedByEmail: ctx.user.email || "",
    });

    await persistProposalEvaluation(tenantId, id, result.report, result.blobPath);

    logAudit({
      action: "proposal.evaluate",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_evaluation",
      resourceId: id,
      details: {
        evaluationId: result.report.evaluationId,
        blobPath: result.blobPath,
        fitScore: result.report.fitScore,
        engineType: result.report.engineType,
        model: result.report.model,
        proposalDocuments: result.report.inputs.proposalDocuments,
        mandateTemplates: result.report.inputs.mandateTemplates,
      },
    });

    return NextResponse.json({
      ok: true,
      data: {
        report: result.report,
        blobPath: result.blobPath,
      },
      rateLimit: {
        remaining: rateLimitResult.remaining,
      },
    });
  } catch (error) {
    console.error("[evaluate.route] Error processing evaluation for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to run evaluation" }, { status: 500 });
  }
}
