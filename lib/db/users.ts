import "server-only";

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";
import { normalizeRoleNameToKey, pickPrimaryRole } from "@/lib/auth/pgAuth";
import type { RoleKey } from "@/lib/authz/roles";
import type { DbRole } from "./schema";

export interface DbUser {
  id: string;
  email: string;
  passwordHash: string | null;
  name: string;
  role: DbRole;
  tenantId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface UserForSession {
  id: string;
  email: string;
  name: string;
  role: DbRole;
  tenantId: string | null;
}

async function loadRoleKeysForUserId(
  client: import("pg").PoolClient,
  userId: string
): Promise<RoleKey[]> {
  const rolesResult = await client.query(
    `SELECT r.role_name
     FROM user_roles ur
     JOIN roles r ON ur.role_id = r.role_id
     WHERE ur.user_id = $1`,
    [userId]
  );
  const rawRoles = rolesResult.rows.map((r: { role_name: string }) => r.role_name);
  return rawRoles.map(normalizeRoleNameToKey).filter(Boolean) as RoleKey[];
}

function rowToDbUser(
  row: {
    user_id: string;
    email: string;
    password_hash: string | null;
    full_name: string | null;
    tenant_id: string | null;
    created_at?: unknown;
    updated_at?: unknown;
  },
  roleKeys: RoleKey[]
): DbUser {
  const primary = pickPrimaryRole(roleKeys) as DbRole;
  const ca =
    row.created_at instanceof Date
      ? row.created_at.toISOString()
      : row.created_at != null
        ? String(row.created_at)
        : new Date().toISOString();
  const ua =
    row.updated_at instanceof Date
      ? row.updated_at.toISOString()
      : row.updated_at != null
        ? String(row.updated_at)
        : ca;
  return {
    id: String(row.user_id),
    email: String(row.email),
    passwordHash: row.password_hash,
    name: String(row.full_name ?? row.email ?? ""),
    role: primary,
    tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
    createdAt: ca,
    updatedAt: ua,
  };
}

function rowToSession(
  row: {
    user_id: string;
    email: string;
    full_name: string | null;
    tenant_id: string | null;
  },
  roleKeys: RoleKey[]
): UserForSession {
  return {
    id: String(row.user_id),
    email: String(row.email),
    name: String(row.full_name ?? row.email ?? ""),
    role: pickPrimaryRole(roleKeys) as DbRole,
    tenantId: row.tenant_id != null ? String(row.tenant_id) : null,
  };
}

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      `SELECT user_id, tenant_id, email, full_name, password_hash, status, created_at, updated_at
       FROM app_users
       WHERE LOWER(email) = LOWER($1) AND COALESCE(status, 'active') = 'active'
       LIMIT 1`,
      [email.trim()]
    );
    const row = userResult.rows[0] as
      | {
          user_id: string;
          tenant_id: string | null;
          email: string;
          full_name: string | null;
          password_hash: string | null;
        }
      | undefined;
    if (!row) return null;
    const roleKeys = await loadRoleKeysForUserId(client, String(row.user_id));
    return rowToDbUser(
      { ...row, created_at: userResult.rows[0].created_at, updated_at: userResult.rows[0].updated_at },
      roleKeys
    );
  } catch (e) {
    console.warn("[db/users] findUserByEmail failed", e);
    return null;
  } finally {
    client.release();
  }
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const userResult = await client.query(
      `SELECT user_id, tenant_id, email, full_name, password_hash, status, created_at, updated_at
       FROM app_users
       WHERE user_id = $1
       LIMIT 1`,
      [id]
    );
    const row = userResult.rows[0] as
      | {
          user_id: string;
          tenant_id: string | null;
          email: string;
          full_name: string | null;
          password_hash: string | null;
        }
      | undefined;
    if (!row) return null;
    const roleKeys = await loadRoleKeysForUserId(client, id);
    return rowToDbUser(
      { ...row, created_at: userResult.rows[0].created_at, updated_at: userResult.rows[0].updated_at },
      roleKeys
    );
  } catch (e) {
    console.warn("[db/users] findUserById failed", e);
    return null;
  } finally {
    client.release();
  }
}

export async function validateCredentials(
  email: string,
  password: string
): Promise<UserForSession | null> {
  const user = await findUserByEmail(email);
  if (!user || !user.passwordHash) return null;
  const ok = await bcrypt.compare(password, user.passwordHash);
  if (!ok) return null;
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    tenantId: user.tenantId,
  };
}

export async function listUsersByTenant(tenantId: string): Promise<UserForSession[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT user_id, email, full_name, tenant_id
       FROM app_users
       WHERE tenant_id = $1
       ORDER BY email`,
      [tenantId]
    );
    const out: UserForSession[] = [];
    for (const r of res.rows) {
      const roleKeys = await loadRoleKeysForUserId(client, String(r.user_id));
      out.push(rowToSession(r, roleKeys));
    }
    return out;
  } catch (e) {
    console.warn("[db/users] listUsersByTenant failed", e);
    return [];
  } finally {
    client.release();
  }
}

export async function listAssessorsForTenant(tenantId: string): Promise<UserForSession[]> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const res = await client.query(
      `SELECT u.user_id, u.email, u.full_name, u.tenant_id
       FROM app_users u
       WHERE u.tenant_id = $1
       ORDER BY u.email`,
      [tenantId]
    );
    const out: UserForSession[] = [];
    for (const r of res.rows) {
      const roleKeys = await loadRoleKeysForUserId(client, String(r.user_id));
      if (roleKeys.includes("assessor")) {
        out.push(rowToSession(r, roleKeys));
      }
    }
    return out;
  } catch (e) {
    console.warn("[db/users] listAssessorsForTenant failed", e);
    return [];
  } finally {
    client.release();
  }
}

export async function isUserInTenant(userId: string, tenantId: string): Promise<boolean> {
  const user = await findUserById(userId);
  if (!user) return false;
  if (user.role === "saas_admin") return true;
  return user.tenantId === tenantId;
}

export interface CreateUserInput {
  email: string;
  name: string;
  role: DbRole;
  tenantId: string;
  password: string;
}

export async function createUser(input: CreateUserInput): Promise<UserForSession> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  const bcryptMod = await import("bcryptjs");
  const id = randomUUID();
  const now = new Date().toISOString();
  const passwordHash = await bcryptMod.default.hash(input.password, 10);

  try {
    await client.query("BEGIN");
    await client.query(
      `INSERT INTO app_users (
         user_id, tenant_id, email, full_name, password_hash,
         auth_provider, status, created_at, updated_at
       ) VALUES ($1, $2, $3, $4, $5, 'local', 'active', NOW(), NOW())`,
      [id, input.tenantId, input.email, input.name, passwordHash]
    );

    const rolesRes = await client.query(`SELECT role_id, role_name FROM roles`);
    const match = rolesRes.rows.find(
      (r: { role_id: string; role_name: string }) => normalizeRoleNameToKey(r.role_name) === input.role
    ) as { role_id: string } | undefined;
    if (match) {
      await client.query(`INSERT INTO user_roles (user_id, role_id) VALUES ($1, $2)`, [id, match.role_id]);
    } else {
      console.warn("[db/users] createUser: no matching role in roles table for", input.role);
    }
    await client.query("COMMIT");
  } catch (e) {
    try {
      await client.query("ROLLBACK");
    } catch {
      /* ignore */
    }
    throw e;
  } finally {
    client.release();
  }

  return {
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    tenantId: input.tenantId,
  };
}
