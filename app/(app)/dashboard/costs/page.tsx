import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import CostsClient from "./CostsClient";

export default async function CostsPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return <CostsClient role={user.role} />;
}
