import { redirect } from "next/navigation";
import { getMyAuthz } from "@/lib/authz";
import FundsClient from "./FundsClient";

export default async function FundsPage() {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { role } = authz.data;

  if (role !== "tenant_admin") {
    redirect("/dashboard");
  }

  return <FundsClient />;
}
