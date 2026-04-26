// GET /api/tenant/proposals/[id]/report
// Returns latest saved report for proposal

import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalRecordPg } from "@/lib/proposals/proposalDetail";
import { getLatestReport } from "@/lib/evaluation/reportEngine";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  const { id: proposalId } = await context.params;

  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);

    const record = await getProposalRecordPg(tenantId, proposalId);
    if (!record) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (record.tenant_id !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    const report = await getLatestReport(tenantId, proposalId);

    return NextResponse.json({
      ok: true,
      data: {
        report: report ?? null,
      },
    });
  } catch (error) {
    console.error("[report] Error for proposal", proposalId, error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json(
      { ok: false, error: "Failed to get report" },
      { status: 500 }
    );
  }
}
