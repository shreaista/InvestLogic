import { NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";

const demoProposals = [
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", fund: "Healthcare Init", amount: 120000, status: "In Progress", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 3, 2026", priority: "High" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", fund: "Innovation Grant", amount: 78000, status: "Not Started", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 5, 2026", priority: "High" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", fund: "Emergency Reserve", amount: 55000, status: "In Progress", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 4, 2026", priority: "Medium" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", fund: "Community Dev", amount: 25000, status: "Not Started", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 6, 2026", priority: "Medium" },
];

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["assessor"]);
    const tenantId = requireTenant(user);

    const userId = user.userId || "demo-assessor";

    const proposals = demoProposals.filter((p) => {
      if (p.tenantId !== tenantId) return false;
      if (p.assignedAssessorId === userId) return true;
      if (p.queueAssessorIds?.includes(userId)) return true;
      return false;
    });

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}
