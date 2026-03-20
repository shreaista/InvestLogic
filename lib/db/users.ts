import "server-only";

import { and, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";
import { getDb, users as usersTable } from "./index";
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

export async function findUserByEmail(email: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db.select().from(usersTable).where(eq(usersTable.email, email)).limit(1);
  return rows[0] ?? null;
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const db = getDb();
  const rows = await db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
  return rows[0] ?? null;
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
  const db = getDb();
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      tenantId: usersTable.tenantId,
    })
    .from(usersTable)
    .where(eq(usersTable.tenantId, tenantId));

  return rows as UserForSession[];
}

export async function listAssessorsForTenant(tenantId: string): Promise<UserForSession[]> {
  const db = getDb();
  const rows = await db
    .select({
      id: usersTable.id,
      email: usersTable.email,
      name: usersTable.name,
      role: usersTable.role,
      tenantId: usersTable.tenantId,
    })
    .from(usersTable)
    .where(and(eq(usersTable.tenantId, tenantId), eq(usersTable.role, "assessor")));

  return rows as UserForSession[];
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
  const db = getDb();
  const bcrypt = await import("bcryptjs");
  const id = `user-${Date.now()}`;
  const now = new Date().toISOString();
  const passwordHash = await bcrypt.default.hash(input.password, 10);

  await db.insert(usersTable).values({
    id,
    email: input.email,
    passwordHash,
    name: input.name,
    role: input.role,
    tenantId: input.tenantId,
    createdAt: now,
    updatedAt: now,
  });

  return {
    id,
    email: input.email,
    name: input.name,
    role: input.role,
    tenantId: input.tenantId,
  };
}
