import { NextRequest, NextResponse } from "next/server";
import { getAuthzContext, jsonError, AuthzHttpError } from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import { getFundById, updateFund, deleteFund, type UpdateFundInput } from "@/lib/db/funds";

interface RouteContext {
  params: Promise<{ fundId: string }>;
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();
    const { fundId } = await context.params;

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can view fund details");
    }

    const fund = await getFundById(tenantId, fundId);

    if (!fund) {
      throw new AuthzHttpError(404, "Fund not found");
    }

    return NextResponse.json({
      ok: true,
      data: { fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function PATCH(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();
    const { fundId } = await context.params;

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can update funds");
    }

    const body: UpdateFundInput = await request.json();

    const result = await updateFund(tenantId, fundId, body);

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to update fund");
    }

    return NextResponse.json({
      ok: true,
      data: { fund: result.fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const tenantId = await requireActiveTenantId();
    const { fundId } = await context.params;

    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin") {
      throw new AuthzHttpError(403, "Only administrators can delete funds");
    }

    const deleted = await deleteFund(tenantId, fundId);

    if (!deleted) {
      throw new AuthzHttpError(404, "Fund not found");
    }

    return NextResponse.json({
      ok: true,
      data: { message: "Fund deleted successfully" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
