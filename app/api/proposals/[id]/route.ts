import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { getProposalDetailPg, mockProposalToDetailRow } from "@/lib/proposals/proposalDetail";

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);
    const { id: proposalId } = await context.params;

    const fromDb = await getProposalDetailPg(tenantId, proposalId);
    if (fromDb) {
      return NextResponse.json({
        ok: true,
        data: { proposal: fromDb },
      });
    }

    const result = getProposalForUser({
      tenantId,
      userId: user.userId || "",
      role: user.role,
      proposalId,
    });

    if (result.accessDenied) {
      throw new AuthzHttpError(403, "You do not have access to this proposal");
    }

    if (!result.proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    return NextResponse.json({
      ok: true,
      data: { proposal: mockProposalToDetailRow(result.proposal) },
    });
  } catch (error) {
    return jsonError(error);
  }
}
