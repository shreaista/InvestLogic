import { requireRoleWithTenantContext } from "@/lib/authz";
import { listProposalsWithAssignmentFromPg } from "@/lib/proposals/listProposalsPg";
import ProposalsClient from "./ProposalsClient";

export default async function ProposalsPage() {
  const { user, tenantId } = await requireRoleWithTenantContext([
    "tenant_admin",
    "saas_admin",
    "fund_manager",
    "assessor",
    "viewer",
  ]);

  const proposals = await listProposalsWithAssignmentFromPg(tenantId);

  return (
    <ProposalsClient
      proposals={proposals}
      role={user.role}
      proposalCount={proposals.length}
    />
  );
}
