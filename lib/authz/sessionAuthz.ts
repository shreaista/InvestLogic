import "server-only";

import { getSessionSafe } from "@/lib/session";
import type { RoleKey } from "./roles";
import { isValidRole } from "./roles";
import type { Entitlements } from "@/lib/entitlements/types";
import { getDemoEntitlements } from "@/lib/entitlements/demoEntitlements";
import { getPermissionsForRole } from "@/lib/rbac/permissions";
import { getActiveTenantId } from "@/lib/tenantContext";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface MyAuthzData {
  role: RoleKey;
  tenantId: string | null;
  activeTenantId: string | null;
  permissions: string[];
  entitlements: Entitlements | null;
}

export type MyAuthzResult =
  | { ok: true; data: MyAuthzData }
  | { ok: false; error: string };

// ─────────────────────────────────────────────────────────────────────────────
// Get My Authorization Context
// Loads role, tenant_id, permissions from session; used for menu visibility
// ─────────────────────────────────────────────────────────────────────────────

export async function getMyAuthz(): Promise<MyAuthzResult> {
  const { user } = await getSessionSafe();

  if (!user) {
    return { ok: false, error: "unauthenticated" };
  }

  const role: RoleKey = isValidRole(user.role) ? user.role : "assessor";
  const tenantId: string | null = user.tenantId ?? null;
  const activeTenantId = await getActiveTenantId() ?? tenantId;
  const permissions = [...getPermissionsForRole(role)];
  const entitlements = getDemoEntitlements(tenantId ?? activeTenantId);

  return {
    ok: true,
    data: {
      role,
      tenantId,
      activeTenantId,
      permissions,
      entitlements,
    },
  };
}
