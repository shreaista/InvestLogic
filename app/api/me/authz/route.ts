import { NextResponse } from "next/server";
import { requireSession, jsonError } from "@/lib/authz";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { getTenantEntitlements } from "@/lib/entitlements/demoEntitlements";
import { getActiveTenantId } from "@/lib/tenantContext";

interface TenantInfo {
  id: string;
  name: string;
}

const TENANT_DATA: Record<string, TenantInfo> = {
  "tenant-001": { id: "tenant-001", name: "Acme Foundation" },
  "tenant-002": { id: "tenant-002", name: "Beta Grants Inc" },
  "tenant-003": { id: "tenant-003", name: "Community Trust" },
};

const ALLOWED_TENANTS: Record<string, string[]> = {
  saas_admin: ["tenant-001", "tenant-002", "tenant-003"],
  tenant_admin: ["tenant-001", "tenant-002"],
  assessor: ["tenant-001"],
};

export async function GET() {
  try {
    const session = await requireSession();
    const activeTenantId = await getActiveTenantId();

    const permissions = getPermissionsForRole(session.role);
    const entitlements = activeTenantId
      ? getTenantEntitlements(activeTenantId)
      : null;

    const allowedTenantIds = ALLOWED_TENANTS[session.role] || [];
    const allowedTenants = allowedTenantIds
      .map((id) => TENANT_DATA[id])
      .filter(Boolean);

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
