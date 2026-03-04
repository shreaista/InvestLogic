import { redirect } from "next/navigation";
import { getMyAuthz } from "@/lib/authz";
import UsersClient from "./UsersClient";

export default async function UsersPage() {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { permissions } = authz.data;

  if (!permissions.includes("user:read")) {
    redirect("/dashboard");
  }

  return <UsersClient />;
}
