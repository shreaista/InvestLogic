import { NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";
import { TENANT_COOKIE_NAME } from "@/lib/tenantContext";

export async function POST() {
  try {
    const { user } = await getSessionSafe();

    if (!user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Only SaaS Admin can clear to global view
    // tenant_admin and assessor must always have a tenant selected
    if (user.role !== "saas_admin") {
      return NextResponse.json(
        { ok: false, error: "Only SaaS Admin can switch to global view" },
        { status: 403 }
      );
    }

    const response = NextResponse.json({ ok: true, tenantId: null });

    response.cookies.set(TENANT_COOKIE_NAME, "", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 0,
    });

    return response;
  } catch {
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
