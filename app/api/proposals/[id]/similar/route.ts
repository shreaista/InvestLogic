// API route for Similar Deals / Deal Comparison
// GET /api/proposals/[id]/similar

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
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  listEvaluations,
  downloadEvaluation,
} from "@/lib/evaluation/proposalEvaluator";
import { findSimilarDeals } from "@/lib/evaluation/dealComparison";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);
    requireAnyPermission(ctx, [LLM_USE, REPORT_GENERATE]);

    const proposalResult = getProposalForUser({
      tenantId,
      userId: ctx.user.id || "",
      role: ctx.role,
      proposalId: id,
    });

    if (proposalResult.accessDenied) {
      throw new AuthzHttpError(403, "You do not have access to this proposal");
    }

    if (!proposalResult.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const proposal = proposalResult.proposal as Proposal;

    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const evaluations = await listEvaluations(tenantId, id, true);
    if (evaluations.length === 0) {
      return NextResponse.json({
        ok: true,
        data: { similar: [], message: "No evaluation found. Run an evaluation first." },
      });
    }

    const latestEvalMeta = evaluations[0];
    const currentReport = await downloadEvaluation(tenantId, id, latestEvalMeta.blobPath);

    if (!currentReport) {
      return NextResponse.json({
        ok: true,
        data: { similar: [], message: "Could not load current evaluation." },
      });
    }

    const topK = Math.min(5, Math.max(3, parseInt(request.nextUrl.searchParams.get("topK") || "5", 10) || 5));
    const similar = await findSimilarDeals({
      tenantId,
      currentProposalId: id,
      currentEvaluation: currentReport,
      topK,
    });

    return NextResponse.json({
      ok: true,
      data: { similar },
    });
  } catch (error) {
    console.error("[similar.route] Error for proposal", id, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to get similar deals" },
      { status: 500 }
    );
  }
}
