import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  requireRBACPermission,
  RBAC_PERMISSIONS,
  AuthzHttpError,
} from "@/lib/authz";
import { logAdminAction } from "@/lib/rbac";
import { assertCanCreateAssessor, isEntitlementError } from "@/lib/entitlements";
import { listUsersByTenant, listAssessorsForTenant, createUser } from "@/lib/db/users";

export async function GET() {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.USER_READ);
    const tenantId = requireTenant(session);

    let users: Awaited<ReturnType<typeof listUsersByTenant>> = [];
    try {
      users = await listUsersByTenant(tenantId);
    } catch (e) {
      console.error("[Tenant Users API] GET list failed, returning empty", e);
    }

    return NextResponse.json({ ok: true, data: { users } });
  } catch (error) {
    return jsonError(error);
  }
}

type CreateUserRole = "tenant_admin" | "assessor";

interface CreateUserBody {
  email: string;
  name?: string;
  role: CreateUserRole;
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireSession();
    requireUserRole(session, ["tenant_admin", "saas_admin"]);
    requireRBACPermission(session, RBAC_PERMISSIONS.USER_CREATE);
    const tenantId = requireTenant(session);

    let body: CreateUserBody;
    try {
      body = await request.json();
    } catch {
      throw new AuthzHttpError(400, "Invalid JSON body");
    }

    if (!body.email || typeof body.email !== "string") {
      throw new AuthzHttpError(422, "Validation error: email is required");
    }

    if (!body.role || !["tenant_admin", "assessor"].includes(body.role)) {
      throw new AuthzHttpError(422, "Validation error: role must be 'tenant_admin' or 'assessor'");
    }

    if ((body.role as string) === "saas_admin") {
      throw new AuthzHttpError(403, "Cannot create saas_admin via this endpoint");
    }

    if (body.role === "assessor") {
      const assessors = await listAssessorsForTenant(tenantId);
      assertCanCreateAssessor(
        { tenantId, role: session.role } as Parameters<typeof assertCanCreateAssessor>[0],
        assessors.length
      );
    }

    const password = (body as { password?: string }).password ?? `Temp${Date.now()}!`;
    const newUser = await createUser({
      email: body.email,
      name: body.name || body.email.split("@")[0],
      role: body.role,
      tenantId,
      password,
    });

    await logAdminAction(
      { userId: session.userId || "", email: session.email || "", role: session.role, tenantId, permissions: [], name: session.name || "" },
      "user.create",
      "user",
      newUser.id,
      { email: newUser.email, role: newUser.role }
    );

    return NextResponse.json(
      { ok: true, data: { user: { ...newUser, tenantId }, created: true } },
      { status: 201 }
    );
  } catch (error) {
    if (isEntitlementError(error)) {
      return NextResponse.json(
        { ok: false, error: error.safeMessage, details: error.details },
        { status: error.status }
      );
    }
    return jsonError(error);
  }
}
