import "server-only";

import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import type { RoleKey } from "./roles";

// ─────────────────────────────────────────────────────────────────────────────
// Page Guard Types
// ─────────────────────────────────────────────────────────────────────────────

export interface AuthenticatedUser {
  userId: string;
  email: string;
  name: string;
  role: RoleKey;
  tenantId?: string;
}

export interface TenantContext {
  user: AuthenticatedUser;
  tenantId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireAuth
// ─────────────────────────────────────────────────────────────────────────────

export async function requireAuth(): Promise<AuthenticatedUser> {
  const { user } = await getSessionSafe();

  if (!user) {
    redirect("/login");
  }

  return {
    userId: user.userId || "",
    email: user.email || "",
    name: user.name || "",
    role: user.role as RoleKey,
    tenantId: user.tenantId,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRole
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRole(
  allowedRoles: Array<"saas_admin" | "tenant_admin" | "assessor">
): Promise<AuthenticatedUser> {
  const user = await requireAuth();

  if (!allowedRoles.includes(user.role)) {
    redirect("/dashboard");
  }

  return user;
}

// ─────────────────────────────────────────────────────────────────────────────
// requireTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export async function requireTenantContext(): Promise<TenantContext> {
  const user = await requireAuth();

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}

// ─────────────────────────────────────────────────────────────────────────────
// requireRoleWithTenantContext
// ─────────────────────────────────────────────────────────────────────────────

export async function requireRoleWithTenantContext(
  allowedRoles: Array<"saas_admin" | "tenant_admin" | "assessor">
): Promise<TenantContext> {
  const user = await requireRole(allowedRoles);

  if (user.role === "saas_admin") {
    if (!user.tenantId) {
      redirect("/dashboard/tenants");
    }
    return { user, tenantId: user.tenantId };
  }

  if (!user.tenantId) {
    redirect("/login");
  }

  return { user, tenantId: user.tenantId };
}
