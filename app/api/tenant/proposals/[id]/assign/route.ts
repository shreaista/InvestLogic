import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
} from "@/lib/authz";
import { assignProposal, getProposalById } from "@/lib/mock/proposals";
import { getQueueById } from "@/lib/mock/queues";

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface AssignRequestBody {
  assignToUserId?: string;
  assignToUserName?: string;
  assignToQueueId?: string;
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);
    const { id: proposalId } = await context.params;

    const proposal = getProposalById(proposalId);
    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    if (proposal.tenantId !== tenantId) {
      throw new AuthzHttpError(403, "Proposal not in your tenant");
    }

    const body: AssignRequestBody = await request.json();
    const { assignToUserId, assignToUserName, assignToQueueId } = body;

    if (assignToUserId && assignToQueueId) {
      throw new AuthzHttpError(400, "Cannot assign to both user and queue");
    }

    if (!assignToUserId && !assignToQueueId) {
      throw new AuthzHttpError(400, "Must assign to user or queue");
    }

    if (assignToQueueId) {
      const queue = getQueueById(assignToQueueId);
      if (!queue || queue.tenantId !== tenantId) {
        throw new AuthzHttpError(400, "Queue not found in tenant");
      }
    }

    const result = assignProposal({
      tenantId,
      proposalId,
      assignToUserId,
      assignToUserName,
      assignToQueueId,
    });

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Assignment failed");
    }

    console.log("[audit] proposal.assign", {
      proposalId,
      tenantId,
      userId: user.userId,
      assignedToUserId: result.assignedToUserId,
      assignedQueueId: result.assignedQueueId,
      timestamp: new Date().toISOString(),
    });

    return NextResponse.json({
      ok: true,
      data: {
        assignedToUserId: result.assignedToUserId,
        assignedQueueId: result.assignedQueueId,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
