import { NextRequest, NextResponse } from "next/server";
import { getAuthzContext, jsonError, AuthzHttpError } from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import {
  getFundById,
  getLinkedMandates,
  getFundMandateLinks,
  linkMandateToFund,
  unlinkMandateFromFund,
} from "@/lib/mock/fundsStore";
import { listFundMandates, getFundMandateById } from "@/lib/mock/fundMandates";

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
      throw new AuthzHttpError(403, "Only administrators can view fund mandates");
    }

    const fund = getFundById(tenantId, fundId);
    if (!fund) {
      throw new AuthzHttpError(404, "Fund not found");
    }

    const linkedMandateIds = getLinkedMandates(tenantId, fundId);
    const links = getFundMandateLinks(tenantId, fundId);
    const allMandates = listFundMandates(tenantId);

    const linkedMandates = linkedMandateIds
      .map((id) => {
        const mandate = getFundMandateById(tenantId, id);
        const link = links.find((l) => l.mandateId === id);
        return mandate ? { ...mandate, linkedAt: link?.linkedAt } : null;
      })
      .filter(Boolean);

    const availableMandates = allMandates.filter(
      (m) => !linkedMandateIds.includes(m.id)
    );

    return NextResponse.json({
      ok: true,
      data: {
        fund,
        linkedMandates,
        availableMandates,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
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
      throw new AuthzHttpError(403, "Only administrators can link mandates");
    }

    const body = await request.json();
    const { mandateId } = body;

    if (!mandateId || typeof mandateId !== "string") {
      throw new AuthzHttpError(400, "mandateId is required");
    }

    const mandate = getFundMandateById(tenantId, mandateId);
    if (!mandate) {
      throw new AuthzHttpError(404, "Mandate not found");
    }

    const result = linkMandateToFund(tenantId, fundId, mandateId, ctx.user.id || "");

    if (!result.ok) {
      throw new AuthzHttpError(400, result.error || "Failed to link mandate");
    }

    return NextResponse.json({
      ok: true,
      data: { link: result.link },
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
      throw new AuthzHttpError(403, "Only administrators can unlink mandates");
    }

    const { searchParams } = new URL(request.url);
    const mandateId = searchParams.get("mandateId");

    if (!mandateId) {
      throw new AuthzHttpError(400, "mandateId query parameter is required");
    }

    const unlinked = unlinkMandateFromFund(tenantId, fundId, mandateId);

    if (!unlinked) {
      throw new AuthzHttpError(404, "Link not found");
    }

    return NextResponse.json({
      ok: true,
      data: { message: "Mandate unlinked successfully" },
    });
  } catch (error) {
    return jsonError(error);
  }
}
