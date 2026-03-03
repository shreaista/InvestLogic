import { redirect } from "next/navigation";
import { getAuthzContextOrNull, ROLES } from "@/lib/authz";
import DevtoolsClient from "./DevtoolsClient";

export default async function DevtoolsPage() {
  const ctx = await getAuthzContextOrNull();

  if (!ctx) {
    redirect("/login");
  }

  if (ctx.role !== ROLES.SAAS_ADMIN && ctx.role !== ROLES.TENANT_ADMIN) {
    redirect("/dashboard");
  }

  return <DevtoolsClient />;
}
