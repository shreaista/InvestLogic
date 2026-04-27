import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/authz";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { getTenantEntitlements } from "@/lib/entitlements/demoEntitlements";
import { getActiveTenantId } from "@/lib/tenantContext";
import { listTenants } from "@/lib/db/tenants";
import { findUserById } from "@/lib/db/users";

export async function GET() {
  try {
    const session = await requireSession();
    const activeTenantId = await getActiveTenantId();

    const permissions = getPermissionsForRole(session.role);
    const entitlements = activeTenantId
      ? getTenantEntitlements(activeTenantId)
      : null;

    let allowedTenants: { id: string; name: string }[] = [];
    if (session.role === "saas_admin") {
      try {
        const tenants = await listTenants();
        allowedTenants = tenants.map((t) => ({ id: t.id, name: t.name }));
      } catch (e) {
        console.error("[me/authz] listTenants failed", e);
        allowedTenants = [];
      }
    } else if (session.tenantId) {
      try {
        const user = await findUserById(session.userId ?? "");
        if (user?.tenantId) {
          const tenants = await listTenants();
          const t = tenants.find((x) => x.id === user.tenantId);
          if (t) allowedTenants = [{ id: t.id, name: t.name }];
        }
      } catch (e) {
        console.error("[me/authz] allowedTenants for tenant user failed", e);
        allowedTenants = [];
      }
    }

    return NextResponse.json({
      ok: true,
      data: {
        user: {
          userId: session.userId,
          email: session.email,
          name: session.name,
        },
        role: session.role,
        tenantId: activeTenantId,
        activeTenantId,
        allowedTenants,
        permissions,
        entitlements,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
