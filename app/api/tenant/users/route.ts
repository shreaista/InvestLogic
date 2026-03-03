import { NextRequest, NextResponse } from "next/server";
import { getAuthzContext, ROLES, isAuthzError } from "@/lib/authz";
import { assertCanCreateAssessor, isEntitlementError } from "@/lib/entitlements";

type CreateUserRole = "tenant_admin" | "assessor";

interface CreateUserBody {
  email: string;
  name?: string;
  role: CreateUserRole;
}

export async function POST(request: NextRequest) {
  try {
    const ctx = await getAuthzContext();

    if (ctx.role !== ROLES.SAAS_ADMIN && ctx.role !== ROLES.TENANT_ADMIN) {
      return NextResponse.json(
        { ok: false, error: "Forbidden: insufficient role" },
        { status: 403 }
      );
    }

    const body = (await request.json()) as CreateUserBody;

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

    if (body.role === "assessor") {
      // TODO: Replace with DB count later (e.g., await db.users.count({ tenantId, role: 'assessor' }))
      const currentAssessorCount = 0;

      assertCanCreateAssessor(ctx, currentAssessorCount);
    }

    // TODO: Actually create user in DB
    // await db.users.create({ email: body.email, name: body.name, role: body.role, tenantId: ctx.tenantId });

    return NextResponse.json({
      ok: true,
      data: { created: true },
    });
  } catch (error) {
    if (isAuthzError(error)) {
      return NextResponse.json(
        { ok: false, error: error.safeMessage },
        { status: error.status }
      );
    }

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
