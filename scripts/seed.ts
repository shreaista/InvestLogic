/**
 * Seed script: creates initial tenant and users against PostgreSQL.
 * Run: npx tsx scripts/seed.ts
 * Requires: DB_HOST, DB_PORT, DB_NAME, DB_USER, DB_PASSWORD (and DB_SSLMODE for Azure).
 */

import "dotenv/config";
import bcrypt from "bcryptjs";
import { db } from "../lib/db";
import { getPostgresPool } from "../lib/postgres";
import * as schema from "../lib/db/schema";

const now = new Date().toISOString();

async function hash(pwd: string): Promise<string> {
  return bcrypt.hash(pwd, 10);
}

async function main() {
  try {
    await db.insert(schema.tenants).values({
      id: "tenant-001",
      name: "Default Tenant",
      slug: "default",
      createdAt: now,
      updatedAt: now,
    });
  } catch {
    // Already exists
  }

  const users = [
    { id: "user-001", email: "admin@ipa.com", pwd: "Admin#123", name: "SaaS Admin", tenantId: null as string | null },
    { id: "user-002", email: "tenant@ipa.com", pwd: "Tenant#123", name: "Tenant Admin", tenantId: "tenant-001" },
    { id: "user-003", email: "assessor@ipa.com", pwd: "Assess#123", name: "Analyst", tenantId: "tenant-001" },
    { id: "user-004", email: "fundmanager@ipa.com", pwd: "Fund#123", name: "Fund Manager", tenantId: "tenant-001" },
    { id: "user-005", email: "viewer@ipa.com", pwd: "View#123", name: "Viewer", tenantId: "tenant-001" },
  ];

  for (const u of users) {
    try {
      const passwordHash = await hash(u.pwd);
      await db.insert(schema.users).values({
        id: u.id,
        email: u.email,
        passwordHash,
        name: u.name,
        tenantId: u.tenantId,
        authProvider: "local",
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    } catch {
      // Already exists
    }
  }

  try {
    await db.insert(schema.tenantEntitlements).values({
      tenantId: "tenant-001",
      maxAssessors: 15,
      maxUploadsPerAssessment: 10,
      maxReportsPerMonth: 50,
      fundMandatesEnabled: true,
      canManageFundMandates: true,
      updatedAt: now,
    });
  } catch {
    // Already exists
  }

  console.log(
    "Seed complete. Users: admin@ipa.com, tenant@ipa.com, assessor@ipa.com, fundmanager@ipa.com, viewer@ipa.com"
  );

  await getPostgresPool().end();
}

main()
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
