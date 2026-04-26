import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import { getProposalForUser } from "@/lib/mock/proposals";
import { getProposalQueueId, getQueueById } from "@/lib/mock/queues";
import {
  getProposalDetailPg,
  mockProposalToDetailRow,
} from "@/lib/proposals/proposalDetail";
import ProposalDetailClient from "./ProposalDetailClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalDetailPage({ params }: PageProps) {
  const { user, tenantId } = await requirePermissionWithTenantContext(PROPOSAL_READ);
  const { id: proposalId } = await params;

  const fromDb = await getProposalDetailPg(tenantId, proposalId);

  if (fromDb) {
    const canAssign = ["tenant_admin", "saas_admin", "fund_manager"].includes(user.role);
    const canManageDocuments =
      !["viewer"].includes(user.role) &&
      ["tenant_admin", "saas_admin", "assessor", "fund_manager"].includes(user.role);
    const isReadOnly = user.role === "viewer";

    return (
      <ProposalDetailClient
        proposal={fromDb}
        canAssign={canAssign}
        canManageDocuments={canManageDocuments}
        isReadOnly={isReadOnly}
        currentAssignment={{
          assignedToUserId: null,
          assignedToName: null,
          assignedQueueId: null,
          assignedQueueName: null,
        }}
      />
    );
  }

  const result = getProposalForUser({
    tenantId,
    userId: user.userId,
    role: user.role,
    proposalId,
  });

  if (result.accessDenied) {
    return (
      <ProposalDetailClient
        proposal={null}
        canAssign={false}
        isReadOnly={false}
        error="Not authorized to view this proposal"
      />
    );
  }

  if (!result.proposal) {
    return (
      <ProposalDetailClient
        proposal={null}
        canAssign={false}
        isReadOnly={false}
        error="Proposal not found"
      />
    );
  }

  const proposal = mockProposalToDetailRow(result.proposal);

  const canAssign = ["tenant_admin", "saas_admin", "fund_manager"].includes(user.role);
  const canManageDocuments =
    !["viewer"].includes(user.role) &&
    ["tenant_admin", "saas_admin", "assessor", "fund_manager"].includes(user.role);
  const isReadOnly = user.role === "viewer";

  const queueId = getProposalQueueId(result.proposal.id);
  const queue = queueId ? getQueueById(queueId) : null;
  const currentAssignment = {
    assignedToUserId: result.proposal.assignedToUserId,
    assignedToName: result.proposal.assignedToName,
    assignedQueueId: queueId,
    assignedQueueName: queue?.name || null,
  };

  return (
    <ProposalDetailClient
      proposal={proposal}
      canAssign={canAssign}
      canManageDocuments={canManageDocuments}
      isReadOnly={isReadOnly}
      currentAssignment={currentAssignment}
    />
  );
}
