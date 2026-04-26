import { requireRoleWithTenantContext } from "@/lib/authz";
import PromptsClient from "../prompts/PromptsClient";
import { listFunds } from "@/lib/db/funds";

export default async function ScoringRulesPage() {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin", "fund_manager"]);

  const funds = await listFunds(tenantId);

  return (
    <PromptsClient
      funds={funds}
      pageTitle="Scoring Rules"
      pageSubtitle="Configure evaluation and validation prompts that drive mandate fit scoring"
    />
  );
}
