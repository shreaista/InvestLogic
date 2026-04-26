import { requirePermissionWithTenantContext, PROPOSAL_CREATE } from "@/lib/authz";
import { listFunds } from "@/lib/db/funds";
import type { Fund } from "@/lib/types";
import NewProposalClient from "./NewProposalClient";

export default async function NewProposalPage() {
  const { tenantId } = await requirePermissionWithTenantContext(PROPOSAL_CREATE);

  const funds: Fund[] = await listFunds(tenantId);

  return <NewProposalClient initialFunds={funds} />;
}
