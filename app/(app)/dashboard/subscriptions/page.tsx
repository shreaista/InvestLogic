import { requirePageRole } from "@/lib/authz";
import SubscriptionsClient from "./SubscriptionsClient";

export default async function SubscriptionsPage() {
  await requirePageRole(["saas_admin"]);

  return <SubscriptionsClient />;
}
