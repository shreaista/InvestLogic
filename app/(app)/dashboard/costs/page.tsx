import { redirect } from "next/navigation";
import { getMyAuthz } from "@/lib/authz";
import CostsClient from "./CostsClient";

export default async function CostsPage() {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { role, permissions } = authz.data;

  if (!permissions.includes("tenant:costs:read")) {
    redirect("/dashboard");
  }

  return <CostsClient role={role} />;
}
