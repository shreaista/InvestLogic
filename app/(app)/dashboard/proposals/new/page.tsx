import { requirePermissionWithTenantContext, PROPOSAL_CREATE } from "@/lib/authz";
import NewProposalClient from "./NewProposalClient";

export default async function NewProposalPage() {
  await requirePermissionWithTenantContext(PROPOSAL_CREATE);

  return <NewProposalClient />;
}
