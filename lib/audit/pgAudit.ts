import "server-only";

import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";

export async function persistAuditLogToPostgres(params: {
  action: string;
  actorUserId: string;
  actorEmail?: string;
  tenantId: string | null;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  if (!params.tenantId) return;
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    await client.query(
      `INSERT INTO audit_log (id, tenant_id, action, actor_user_id, actor_email, resource_type, resource_id, details, created_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8::jsonb, NOW())`,
      [
        randomUUID(),
        params.tenantId,
        params.action,
        params.actorUserId,
        params.actorEmail ?? null,
        params.resourceType,
        params.resourceId,
        JSON.stringify(params.details ?? {}),
      ]
    );
  } catch (err) {
    console.warn("[pgAudit] insert skipped or failed:", err);
  } finally {
    client.release();
  }
}

export async function queryAuditLogPg(
  tenantId: string,
  limit: number
): Promise<
  Array<{
    id: string;
    action: string;
    resource_type: string;
    resource_id: string;
    details: Record<string, unknown> | null;
    created_at: string;
  }>
> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const result = await client.query(
      `SELECT id, action, resource_type, resource_id, details, created_at
       FROM audit_log
       WHERE tenant_id = $1
       ORDER BY created_at DESC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows.map((r) => ({
      id: String(r.id),
      action: String(r.action),
      resource_type: String(r.resource_type),
      resource_id: String(r.resource_id),
      details: (r.details as Record<string, unknown> | null) ?? null,
      created_at:
        r.created_at instanceof Date ? r.created_at.toISOString() : String(r.created_at),
    }));
  } catch (err) {
    console.warn("[pgAudit] query failed:", err);
    return [];
  } finally {
    client.release();
  }
}
