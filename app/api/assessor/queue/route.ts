import { NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listProposalsForAssessorAccess } from "@/lib/mock/proposals";

export async function GET() {
  try {
    const user = await requireSession();
    requireUserRole(user, ["assessor"]);
    const tenantId = requireTenant(user);

    const proposals = listProposalsForAssessorAccess({
      tenantId,
      userId: user.userId || "",
    });

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}
