import { NextRequest, NextResponse } from "next/server";
import {
  requireSession,
  requireUserRole,
  requireTenant,
  jsonError,
  AuthzHttpError,
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
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin"]);
    const tenantId = requireTenant(user);

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
      // TODO: Replace with DB count later
      const currentAssessorCount = 0;
      assertCanCreateAssessor({ tenantId, role: user.role } as Parameters<typeof assertCanCreateAssessor>[0], currentAssessorCount);
    }

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
    return jsonError(error);
  }
}
