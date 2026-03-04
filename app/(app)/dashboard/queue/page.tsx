import { requirePageRole } from "@/lib/authz";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  await requirePageRole(["assessor"]);

  return <QueueClient />;
}
