import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/authz";
import CostsClient from "./CostsClient";

export default async function CostsPage() {
  const user = await requireAuth();

  const allowedRoles = ["saas_admin", "tenant_admin"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  // tenant_admin must have tenant context
  if (user.role === "tenant_admin" && !user.tenantId) {
    redirect("/login");
  }

  // saas_admin can view global costs without tenant context
  // (no redirect needed for saas_admin without tenantId)

  return <CostsClient role={user.role} />;
}
