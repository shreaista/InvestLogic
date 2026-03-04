import { requireRoleWithTenantContext } from "@/lib/authz";
import { listProposalsForAssessorAccess } from "@/lib/mock/proposals";
import QueueClient from "./QueueClient";

export default async function QueuePage() {
  const { user, tenantId } = await requireRoleWithTenantContext(["assessor"]);

  const proposals = listProposalsForAssessorAccess({
    tenantId,
    userId: user.userId,
  });

  return <QueueClient proposals={proposals} />;
}
