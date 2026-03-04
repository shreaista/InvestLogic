import { redirect } from "next/navigation";
import { getMyAuthz } from "@/lib/authz";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  const authz = await getMyAuthz();

  if (!authz.ok) {
    redirect("/login");
  }

  const { role } = authz.data;

  if (role !== "assessor") {
    redirect("/dashboard");
  }

  return <QueueClient />;
}
