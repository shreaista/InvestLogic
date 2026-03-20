import { requirePermissionWithTenantContext, PROPOSAL_CREATE } from "@/lib/authz";
import { listFunds } from "@/lib/db/funds";
import type { Fund } from "@/lib/types";
import NewProposalClient from "./NewProposalClient";

export default async function NewProposalPage() {
  const { tenantId } = await requirePermissionWithTenantContext(PROPOSAL_CREATE);

  const funds: Fund[] = await listFunds(tenantId);
  console.log("[NewProposal Page] SSR funds, tenantId:", tenantId, "count:", funds.length, "ids:", funds.map((f) => f.id));

  return <NewProposalClient initialFunds={funds} />;
}
