import "server-only";

import { compare } from "bcryptjs";
import { getPostgresPool } from "@/lib/postgres";
import type { RoleKey } from "@/lib/authz/roles";

export interface PgAuthResult {
  user: {
    userId: string;
    tenantId: string | null;
    email: string;
    fullName: string;
  };
  roles: string[];
  primaryRole: RoleKey;
  permissions: string[];
  tenantId: string | null;
}

/**
 * Validate credentials against PostgreSQL.
 * Tables: app_users, user_roles, roles, role_permissions, permissions
 * Uses bcrypt to verify password against stored password_hash.
 */
export async function validateCredentialsPostgres(
  email: string,
  password: string
): Promise<PgAuthResult | null> {
  const pool = getPostgresPool();
  let client;
  try {
    client = await pool.connect();
    console.log("postgres connected");
  } catch (err) {
    console.log("postgres connection failure:", err);
    throw err;
  }

  try {
    console.log("querying user");
    const userResult = await client.query(
      `SELECT user_id, tenant_id, email, full_name, password_hash, status 
       FROM app_users 
       WHERE LOWER(email) = LOWER($1) AND COALESCE(status, 'active') = 'active'
       LIMIT 1`,
      [email.trim()]
    );

    const row = userResult.rows[0];
    if (!row) {
      console.log("user not found");
      return null;
    }
    console.log("user found");

    console.log("checking password");
    const storedHash = row.password_hash ?? "";
    if (!storedHash || !(await compare(password, storedHash))) return null;

    const userId = row.user_id;

    console.log("loading roles");
    const rolesResult = await client.query(
      `SELECT r.role_name 
       FROM user_roles ur 
       JOIN roles r ON ur.role_id = r.role_id 
       WHERE ur.user_id = $1`,
      [userId]
    );
    const rawRoles = rolesResult.rows.map((r: { role_name: string }) => r.role_name);
    const roleKeys = rawRoles.map(normalizeRoleNameToKey).filter(Boolean) as RoleKey[];
    const primaryRole = pickPrimaryRole(roleKeys);

    console.log("loading permissions");
    const permsResult = await client.query(
      `SELECT DISTINCT p.permission_name 
       FROM role_permissions rp 
       JOIN permissions p ON rp.permission_id = p.permission_id 
       WHERE rp.role_id IN (SELECT role_id FROM user_roles WHERE user_id = $1)`,
      [userId]
    );
    const permissions = permsResult.rows
      .map((p: { permission_name: string }) => p.permission_name)
      .filter(Boolean);

    return {
      user: {
        userId: String(row.user_id),
        tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
        email: row.email,
        fullName: row.full_name || row.email || "",
      },
      roles: roleKeys,
      primaryRole,
      permissions,
      tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
    };
  } finally {
    client.release();
  }
}

/** Map role_name from DB (e.g. "Tenant Admin" or "tenant_admin") to RoleKey. */
export function normalizeRoleNameToKey(roleName: string): RoleKey | null {
  const s = (roleName ?? "").trim().toLowerCase();
  if (["saas_admin", "tenant_admin", "fund_manager", "assessor", "viewer"].includes(s)) return s as RoleKey;
  const mapping: Record<string, RoleKey> = {
    "tenant admin": "tenant_admin",
    "saas admin": "saas_admin",
    "fund manager": "fund_manager",
    analyst: "assessor",
    assessor: "assessor",
  };
  return mapping[s] ?? null;
}

/** Role priority for picking primary when user has multiple (higher index = higher precedence). */
const ROLE_PRIORITY: RoleKey[] = ["viewer", "assessor", "fund_manager", "tenant_admin", "saas_admin"];

export function pickPrimaryRole(roles: RoleKey[]): RoleKey {
  if (roles.length === 0) return "viewer";
  let best = roles[0];
  for (const r of roles) {
    if (ROLE_PRIORITY.indexOf(r) > ROLE_PRIORITY.indexOf(best)) best = r;
  }
  return best;
}
