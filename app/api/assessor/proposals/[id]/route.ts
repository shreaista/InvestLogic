import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  canAccessProposal,
  AuthzHttpError,
  type Proposal,
} from "@/lib/authz";
import { logAssessorAction } from "@/lib/rbac/audit";

const demoProposals: (Proposal & { name: string; applicant: string; fund: string; amount: number; status: string; due: string; priority: string })[] = [
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", fund: "Healthcare Init", amount: 120000, status: "In Progress", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 3, 2026", priority: "High" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", fund: "Innovation Grant", amount: 78000, status: "Not Started", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 5, 2026", priority: "High" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", fund: "Emergency Reserve", amount: 55000, status: "In Progress", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 4, 2026", priority: "Medium" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", fund: "Community Dev", amount: 25000, status: "Not Started", assignedAssessorId: "demo-assessor", queueAssessorIds: ["demo-assessor"], tenantId: "demo-tenant", due: "Mar 6, 2026", priority: "Medium" },
];

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["assessor"]);
    const tenantId = requireTenant(user);
    const { id } = await context.params;

    const proposal = demoProposals.find((p) => p.id === id);

    if (!proposal) {
      throw new AuthzHttpError(404, "Proposal not found");
    }

    const ctx = {
      user: { id: user.userId, email: user.email, name: user.name, role: user.role },
      tenantId,
      role: user.role,
      permissions: [] as const,
      entitlements: null,
    };

    if (!canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    await logAssessorAction(
      {
        userId: user.userId || "",
        email: user.email || "",
        name: user.name || "",
        role: user.role,
        tenantId,
        permissions: [],
      },
      "proposal.view",
      "proposal",
      proposal.id,
      { proposalName: proposal.name }
    );

    return NextResponse.json({
      ok: true,
      data: { proposal },
    });
  } catch (error) {
    return jsonError(error);
  }
}
