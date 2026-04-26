import { NextResponse } from "next/server";
import {
  getAuthzContext,
  requireTenantAccess,
  jsonError,
  AuthzHttpError,
  PROPOSAL_READ,
  requirePermission,
} from "@/lib/authz";
import { buildDashboardSummary } from "@/lib/dashboard/dashboardSummaryPg";

export async function GET() {
  try {
    const ctx = await getAuthzContext();
    if (!ctx.user) {
      return NextResponse.json({ ok: false, error: "Authentication required" }, { status: 401 });
    }

    const tenantId = ctx.tenantId ?? ctx.user.id;
    if (!tenantId) {
      throw new AuthzHttpError(400, "Tenant context required");
    }
    requireTenantAccess(ctx, tenantId);
    requirePermission(ctx, PROPOSAL_READ);

    const userId = ctx.user.id || "";
    const summary = await buildDashboardSummary(tenantId, userId);
    if (!summary) {
      return NextResponse.json(
        { ok: false, error: "Unable to load dashboard data. Please try again later." },
        { status: 503 }
      );
    }

    return NextResponse.json({ ok: true, data: summary });
  } catch (error) {
    console.error("[dashboard/summary]", error);
    if (error instanceof AuthzHttpError) {
      return jsonError(error);
    }
    return NextResponse.json({ ok: false, error: "Failed to load dashboard summary" }, { status: 500 });
  }
}
