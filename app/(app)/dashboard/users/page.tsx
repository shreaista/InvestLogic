import { requireRoleWithTenantContext } from "@/lib/authz";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  await requireRoleWithTenantContext(["tenant_admin", "saas_admin"]);

  return <UsersClient />;
}
