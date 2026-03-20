import { requireRoleWithTenantContext } from "@/lib/authz";
import { redirect } from "next/navigation";
import PromptsClient from "./PromptsClient";
import { listFunds } from "@/lib/db/funds";

export default async function PromptsPage() {
  const { tenantId } = await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);
  const funds = await listFunds(tenantId);

  return <PromptsClient funds={funds} />;
}
