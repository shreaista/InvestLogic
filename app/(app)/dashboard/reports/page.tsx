import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import ReportsClient from "./ReportsClient";

export default async function ReportsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <ReportsClient role={user.role} />;
}
