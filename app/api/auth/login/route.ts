import { NextRequest, NextResponse } from "next/server";
import { signSession } from "@/lib/auth";
import { validateCredentialsPostgres } from "@/lib/auth/pgAuth";
import { logAuthEvent } from "@/lib/rbac";
import { TENANT_COOKIE_NAME } from "@/lib/tenantContext";

export async function POST(request: NextRequest) {
  console.log("login request received");
  const ipAddress = request.headers.get("x-forwarded-for") || request.headers.get("x-real-ip") || undefined;

  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    console.log("email:", email);

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    console.log("connecting to postgres");
    const authResult = await validateCredentialsPostgres(email, password);

    if (!authResult) {
      await logAuthEvent("auth.login_failed", email, false, ipAddress, {
        reason: "invalid_credentials",
      });

      return NextResponse.json(
        { ok: false, error: "Invalid email or password. Please try again." },
        { status: 401 }
      );
    }

    const { user, roles, primaryRole, permissions, tenantId } = authResult;

    const token = await signSession({
      userId: user.userId,
      email: user.email,
      role: primaryRole as "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer",
      name: user.fullName,
      tenantId: tenantId ?? undefined,
    });

    await logAuthEvent("auth.login", user.email, true, ipAddress, {
      userId: user.userId,
      role: primaryRole,
      tenantId,
    });

    const response = NextResponse.json({
      ok: true,
      role: primaryRole,
      name: user.fullName,
      tenantId: tenantId ?? null,
      roles,
      permissions,
    });

    response.cookies.set("ipa_session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 7,
    });

    // Set tenant cookie for tenant-scoped roles so they don't need to select
    if (tenantId && primaryRole !== "saas_admin") {
      response.cookies.set(TENANT_COOKIE_NAME, tenantId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 60 * 60 * 24 * 7,
      });
    }

    return response;
  } catch (error) {
    console.error("LOGIN ERROR:", error);
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
