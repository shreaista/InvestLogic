import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { requireAuth } from "@/lib/authz";
import ProposalsClient from "./ProposalsClient";
import type { Proposal } from "@/lib/mock/proposals";

async function fetchProposals(): Promise<{ proposals: Proposal[]; error?: string }> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get("ipa_session");
  const tenantCookie = cookieStore.get("ipa_tenant");

  if (!sessionCookie) {
    return { proposals: [], error: "unauthenticated" };
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

  const cookieHeader = tenantCookie
    ? `ipa_session=${sessionCookie.value}; ipa_tenant=${tenantCookie.value}`
    : `ipa_session=${sessionCookie.value}`;

  const res = await fetch(`${baseUrl}/api/proposals`, {
    headers: {
      Cookie: cookieHeader,
    },
    cache: "no-store",
  });

  if (res.status === 401) {
    return { proposals: [], error: "unauthenticated" };
  }

  if (res.status === 403) {
    return { proposals: [], error: "forbidden" };
  }

  const data = await res.json();

  if (!data.ok) {
    return { proposals: [], error: data.error || "Unknown error" };
  }

  return { proposals: data.data.proposals };
}

export default async function ProposalsPage() {
  const user = await requireAuth();

  const allowedRoles = ["tenant_admin", "assessor", "saas_admin"];
  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  // saas_admin must have activeTenantId to view proposals
  if (user.role === "saas_admin" && !user.tenantId) {
    redirect("/dashboard/tenants");
  }

  // tenant_admin and assessor must have tenantId
  if ((user.role === "tenant_admin" || user.role === "assessor") && !user.tenantId) {
    redirect("/login");
  }

  const { proposals, error } = await fetchProposals();

  if (error === "unauthenticated") {
    redirect("/login");
  }

  return <ProposalsClient proposals={proposals} error={error} />;
}
