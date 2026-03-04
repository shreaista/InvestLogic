import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import { getActiveTenantId } from "@/lib/tenantContext";
import TenantSelectClient from "./TenantSelectClient";

export default async function TenantSelectPage() {
  const { user } = await getSessionSafe();

  if (!user) {
    redirect("/login");
  }

  // SaaS admin can operate without tenant - redirect to dashboard
  if (user.role === "saas_admin") {
    redirect("/dashboard");
  }

  // If tenant already selected, redirect to dashboard
  const activeTenantId = await getActiveTenantId();
  if (activeTenantId) {
    redirect("/dashboard");
  }

  return <TenantSelectClient />;
}
