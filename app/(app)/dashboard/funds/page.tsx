import { requireRoleWithTenantContext } from "@/lib/authz";
import FundsClient from "./FundsClient";

export default async function FundsPage() {
  await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);

  return <FundsClient />;
}
