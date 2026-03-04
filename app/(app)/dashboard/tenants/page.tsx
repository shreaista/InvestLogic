import { redirect } from "next/navigation";
import { getMyAuthz } from "@/lib/authz";
import TenantsClient from "./TenantsClient";

export default async function TenantsPage() {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { role, permissions } = authz.data;

  if (role !== "saas_admin" && !permissions.includes("tenant:manage")) {
    redirect("/dashboard");
  }

  return <TenantsClient />;
}
