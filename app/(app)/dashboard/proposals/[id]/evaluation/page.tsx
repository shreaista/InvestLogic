import { requirePermissionWithTenantContext, PROPOSAL_READ } from "@/lib/authz";
import ProposalEvaluationDashboardClient from "./ProposalEvaluationDashboardClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProposalEvaluationPage({ params }: PageProps) {
  const { user, tenantId } = await requirePermissionWithTenantContext(PROPOSAL_READ);
  const { id: proposalId } = await params;

  const canAssign = ["tenant_admin", "saas_admin", "fund_manager"].includes(user.role);
  const isReadOnly = user.role === "viewer";

  return (
    <ProposalEvaluationDashboardClient
      proposalId={proposalId}
      tenantId={tenantId}
      userId={user.userId}
      userEmail={user.email ?? ""}
      canAssign={canAssign}
      isReadOnly={isReadOnly}
    />
  );
}
