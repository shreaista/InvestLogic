import { NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  jsonError,
  AuthzHttpError,
  PROPOSAL_READ,
  requirePermission,
  canAccessProposal,
  type Proposal,
} from "@/lib/authz";
import { loadEvaluationDashboard } from "@/lib/proposals/evaluationDashboardPg";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(_request: Request, context: RouteContext) {
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

    return NextResponse.json({ ok: true, data: payload });
  } catch (error) {
    console.error("[evaluation-dashboard]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to load evaluation dashboard" }, { status: 500 });
  }
}
