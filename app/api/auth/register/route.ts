import { NextRequest, NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = typeof body?.email === "string" ? body.email.trim() : "";
    const fullName = typeof body?.fullName === "string" ? body.fullName.trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const tenantId = body?.tenantId != null ? String(body.tenantId).trim() : null;

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: "Email and password are required" },
        { status: 400 }
      );
    }

    const pool = getPostgresPool();
    const client = await pool.connect();

    try {
      const existsResult = await client.query(
        `SELECT 1 FROM app_users 
         WHERE LOWER(email) = LOWER($1) AND (tenant_id IS NOT DISTINCT FROM $2) 
         LIMIT 1`,
        [email, tenantId || null]
      );

      if (existsResult.rows.length > 0) {
        return NextResponse.json(
          { ok: false, error: "Email already registered for this tenant" },
          { status: 409 }
        );
      }

      const userId = randomUUID();
      const passwordHash = await hash(password, 10);

      await client.query(
        `INSERT INTO app_users (
          user_id, tenant_id, email, full_name, password_hash,
          auth_provider, status, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, 'local', 'active', NOW(), NOW())`,
        [userId, tenantId || null, email, fullName || email, passwordHash]
      );

      return NextResponse.json({ ok: true });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("REGISTER ERROR:", error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 }
    );
  }
}
