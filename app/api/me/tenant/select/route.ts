import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";
import { TENANT_COOKIE_NAME } from "@/lib/tenantContext";
import { listTenants } from "@/lib/db/tenants";
import { findUserById } from "@/lib/db/users";

export async function POST(request: NextRequest) {
  try {
    const { user } = await getSessionSafe();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    const body = await request.json();
    const tenantId = typeof body?.tenantId === "string" ? body.tenantId.trim() : "";

    if (!tenantId) {
      return NextResponse.json(
        { ok: false, error: "tenantId is required" },
        { status: 400 }
      );
    }

    let allowedTenantIds: string[] = [];
    try {
      if (user.role === "saas_admin") {
        const tenants = await listTenants();
        allowedTenantIds = tenants.map((t) => t.id);
      } else {
        const dbUser = await findUserById(user.userId ?? "");
        if (dbUser?.tenantId) allowedTenantIds = [dbUser.tenantId];
      }
    } catch (e) {
      console.error("[me/tenant/select] tenant resolution failed, using session fallback if any", e);
      if (user.role !== "saas_admin" && user.tenantId) {
        allowedTenantIds = [user.tenantId];
      }
    }

    if (!allowedTenantIds.includes(tenantId)) {
      return NextResponse.json(
        { ok: false, error: "You do not have access to this tenant" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true, tenantId });

    response.cookies.set(TENANT_COOKIE_NAME, tenantId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
