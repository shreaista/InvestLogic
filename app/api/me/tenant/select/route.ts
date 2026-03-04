import { NextRequest, NextResponse } from "next/server";
import { getSessionSafe } from "@/lib/session";
import { TENANT_COOKIE_NAME } from "@/lib/tenantContext";

const ALLOWED_TENANTS: Record<string, string[]> = {
  "saas_admin": ["tenant-001", "tenant-002", "tenant-003"],
  "tenant_admin": ["tenant-001", "tenant-002"],
  "assessor": ["tenant-001"],
};

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
    const { tenantId } = body;

    if (!tenantId || typeof tenantId !== "string") {
      return NextResponse.json(
        { ok: false, error: "tenantId is required" },
        { status: 400 }
      );
    }

    const allowedTenants = ALLOWED_TENANTS[user.role] || [];
    if (!allowedTenants.includes(tenantId)) {
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
