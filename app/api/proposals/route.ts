import { NextResponse } from "next/server";
import {
  requireSession,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listProposalsForUser } from "@/lib/mock/proposals";

export async function GET() {
  try {
    const user = await requireSession();
    const tenantId = requireTenant(user);

    const proposals = listProposalsForUser({
      tenantId,
      userId: user.userId || "",
      role: user.role,
    });

    return NextResponse.json({
      ok: true,
      data: { proposals },
    });
  } catch (error) {
    return jsonError(error);
  }
}
