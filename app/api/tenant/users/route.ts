import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  isAuthzError,
  requirePermission,
  USER_CREATE,
} from "@/lib/authz";
import { assertCanCreateAssessor, isEntitlementError } from "@/lib/entitlements";

type CreateUserRole = "tenant_admin" | "assessor";

interface CreateUserBody {
  email: string;
  name?: string;
  role: CreateUserRole;
}

export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    let ctx;
    try {
      ctx = await getAuthzContext();
    } catch (error) {
      if (isAuthzError(error)) {
        return NextResponse.json(
          { ok: false, error: "Authentication required" },
          { status: 401 }
        );
      }
      throw error;
    }

    // 2. Require tenant context
    if (!ctx.tenantId) {
      return NextResponse.json(
        { ok: false, error: "Tenant context required" },
        { status: 400 }
      );
    }

    // 3. Enforce permission
    try {
      requirePermission(ctx, USER_CREATE);
    } catch {
      return NextResponse.json(
        { ok: false, error: "Forbidden" },
        { status: 403 }
      );
    }

    // 4. Parse and validate body
    let body: CreateUserBody;
    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        { ok: false, error: "Invalid JSON body" },
        { status: 400 }
      );
    }

    if (!body.email || typeof body.email !== "string") {
      return NextResponse.json(
        { ok: false, error: "Validation error: email is required" },
        { status: 422 }
      );
    }

    if (!body.role || !["tenant_admin", "assessor"].includes(body.role)) {
      return NextResponse.json(
        { ok: false, error: "Validation error: role must be 'tenant_admin' or 'assessor'" },
        { status: 422 }
      );
    }

    // 5. Deny creating saas_admin via this endpoint
    if ((body.role as string) === "saas_admin") {
      return NextResponse.json(
        { ok: false, error: "Cannot create saas_admin via this endpoint" },
        { status: 403 }
      );
    }

    // 6. Enforce maxAssessors entitlement for assessor role
    if (body.role === "assessor") {
      // TODO: Replace with DB count later
      // e.g., const currentAssessorCount = await db.users.count({ where: { tenantId: ctx.tenantId, role: 'assessor' } });
      const currentAssessorCount = 0;

      assertCanCreateAssessor(ctx, currentAssessorCount);
    }

    // TODO: Actually create user in DB
    // await db.users.create({ email: body.email, name: body.name, role: body.role, tenantId: ctx.tenantId });

    // 7. Success
    return NextResponse.json({
      ok: true,
      data: { created: true },
    });
  } catch (error) {
    if (isEntitlementError(error)) {
      return NextResponse.json(
        { ok: false, error: error.safeMessage, details: error.details },
        { status: error.status }
      );
    }

    console.error("[POST /api/tenant/users]", error);
    return NextResponse.json(
      { ok: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}
