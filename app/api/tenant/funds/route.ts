import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listFunds, createFund, type CreateFundInput } from "@/lib/db/funds";

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    let funds: Awaited<ReturnType<typeof listFunds>> = [];
    try {
      funds = await listFunds(tenantId);
    } catch (e) {
      console.error("[Tenant Funds API] GET list failed, returning empty", e);
    }
    const rawCount = funds.length;
    const fundIds = funds.map((f) => f.id);
    const fundNames = funds.map((f) => f.name);

    console.log("[Funds API] GET", {
      tenantId,
      rawCount,
      fundIds,
      fundNames,
    });

    const debug = request.nextUrl.searchParams.get("debug") === "1";
    if (debug) {
      return NextResponse.json({
        ok: true,
        tenantId,
        count: rawCount,
        funds: funds.map((f) => ({ id: f.id, name: f.name, code: f.code, status: f.status })),
      });
    }

    return NextResponse.json({
      ok: true,
      data: { funds },
    });
  } catch (error) {
    return jsonError(error);
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const body = await request.json();
    const name = body?.name;
    const code = body?.code;
    const incomingPayload = { name, code };

    console.log("[Funds API] POST", { tenantId, incomingPayload });

    const result = await createFund(tenantId, { name, code } as CreateFundInput);

    if (!result.ok) {
      console.error("[Funds API] POST create failure:", result.error);
      return NextResponse.json(
        { ok: false, error: result.error || "Failed to create fund" },
        { status: 400 }
      );
    }

    const createdFundId = result.fund?.id;
    const createdFundName = result.fund?.name;

    console.log("[Funds API] POST success", {
      tenantId,
      createdFundId,
      createdFundName,
    });

    return NextResponse.json({
      ok: true,
      data: { fund: result.fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}
