import { getSessionSafe } from "@/lib/session";
import { redirect } from "next/navigation";
import { getActiveTenantId } from "@/lib/tenantContext";
import DashboardSummaryClient from "./DashboardSummaryClient";

export default async function DashboardPage() {
  const session = await getSessionSafe();

  if (!session.user) {
    redirect("/login");
  }

  const tenantId = await getActiveTenantId();

  return (
    <DashboardSummaryClient
      user={{
        id: session.user.userId,
        email: session.user.email,
        name: session.user.name,
        role: session.user.role,
      }}
      tenantId={tenantId}
    />
  );
}
