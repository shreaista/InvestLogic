import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
} from "@/lib/authz";
import { listFunds, createFund, type CreateFundInput } from "@/lib/mock/fundsStore";
import { FUNDS_FILE_PATH } from "@/lib/storage/fundsPersistence";

const STORAGE_SOURCE = `fundsStore (durable JSON: ${FUNDS_FILE_PATH})`;

export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

    const funds = listFunds(tenantId);
    const rawCount = funds.length;
    const fundIds = funds.map((f) => f.id);
    const fundNames = funds.map((f) => f.name);

    console.log("[Funds API] GET", {
      tenantId,
      source: STORAGE_SOURCE,
      rawCount,
      fundIds,
      fundNames,
    });

    const debug = request.nextUrl.searchParams.get("debug") === "1";
    if (debug) {
      return NextResponse.json({
        ok: true,
        tenantId,
        source: STORAGE_SOURCE,
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

    console.log("[Funds API] POST", {
      tenantId,
      incomingPayload,
      storageDestination: FUNDS_FILE_PATH,
    });

    const result = createFund(tenantId, { name, code } as CreateFundInput);

    if (!result.ok) {
      console.error("[Funds API] POST create failure:", result.error, "debug:", result.debug);
      const isDev = process.env.NODE_ENV !== "production";
      return NextResponse.json(
        {
          ok: false,
          error: result.error || "Failed to create fund",
          ...(isDev && result.debug && { debug: result.debug }),
        },
        { status: 400 }
      );
    }

    const createdFundId = result.fund?.id;
    const createdFundName = result.fund?.name;
    const persistedCount = listFunds(tenantId).length;

    console.log("[Funds API] POST success", {
      tenantId,
      createdFundId,
      createdFundName,
      storageDestination: FUNDS_FILE_PATH,
      persistedTotalCount: persistedCount,
    });

    return NextResponse.json({
      ok: true,
      data: { fund: result.fund },
    });
  } catch (error) {
    return jsonError(error);
  }
}
