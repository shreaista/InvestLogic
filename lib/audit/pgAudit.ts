import "server-only";

import { randomUUID } from "crypto";
import { getPostgresPool } from "@/lib/postgres";

/** Prefer audit_logs; fall back to legacy audit_log if present. */
const AUDIT_TABLE_CANDIDATES = ["audit_logs", "audit_log"] as const;

let resolvedAuditTable: string | null | undefined;
let cachedAuditColumns: Set<string> | null = null;

export async function getAuditTableName(): Promise<string | null> {
  if (resolvedAuditTable !== undefined) return resolvedAuditTable;
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    for (const name of AUDIT_TABLE_CANDIDATES) {
      const r = await client.query(
        `SELECT 1 FROM information_schema.tables
         WHERE table_schema = 'public' AND table_name = $1
         LIMIT 1`,
        [name]
      );
      if (r.rows.length > 0) {
        resolvedAuditTable = name;
        return name;
      }
    }
    resolvedAuditTable = null;
    return null;
  } catch (e) {
    console.warn("[pgAudit] resolve audit table failed", e);
    resolvedAuditTable = null;
    return null;
  } finally {
    client.release();
  }
}

async function loadAuditColumns(): Promise<Set<string>> {
  if (cachedAuditColumns) return cachedAuditColumns;
  const tableName = await getAuditTableName();
  if (!tableName) {
    cachedAuditColumns = new Set();
    return cachedAuditColumns;
  }
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const r = await client.query(
      `SELECT column_name FROM information_schema.columns
       WHERE table_schema = 'public' AND table_name = $1`,
      [tableName]
    );
    cachedAuditColumns = new Set(
      (r.rows as { column_name: string }[]).map((x) => x.column_name)
    );
  } catch (e) {
    console.warn("[pgAudit] loadAuditColumns failed", e);
    cachedAuditColumns = new Set();
  } finally {
    client.release();
  }
  return cachedAuditColumns;
}

function firstCol(cols: Set<string>, names: string[]): string | undefined {
  for (const n of names) {
    if (cols.has(n)) return n;
  }
  return undefined;
}

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
  const auditTable = await getAuditTableName();
  if (!auditTable) return;
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const cols = await loadAuditColumns();
    if (cols.size === 0) return;

    const idCol = firstCol(cols, ["id", "log_id", "audit_id"]) ?? "id";
    const tenantCol = firstCol(cols, ["tenant_id"]) ?? "tenant_id";
    const actionCol = firstCol(cols, ["action"]) ?? "action";
    const actorCol =
      firstCol(cols, ["actor_user_id", "user_id", "performed_by", "actor_id"]) ?? "actor_user_id";
    const emailCol = firstCol(cols, ["actor_email", "user_email"]);
    const rtCol = firstCol(cols, ["resource_type", "entity_type", "object_type", "target_type"]);
    const riCol = firstCol(cols, ["resource_id", "entity_id", "object_id", "target_id"]);
    const detCol = firstCol(cols, ["details", "metadata", "detail_json", "payload", "meta"]);
    const createdCol = firstCol(cols, ["created_at", "logged_at", "occurred_at"]);

    const insertCols: string[] = [];
    const values: unknown[] = [];
    const placeholders: string[] = [];
    let p = 1;

    const push = (col: string, value: unknown, jsonb = false) => {
      insertCols.push(`"${col}"`);
      values.push(value);
      placeholders.push(jsonb ? `$${p++}::jsonb` : `$${p++}`);
    };

    if (cols.has(idCol)) push(idCol, randomUUID());
    if (cols.has(tenantCol)) push(tenantCol, params.tenantId);
    if (cols.has(actionCol)) push(actionCol, params.action);
    if (cols.has(actorCol)) push(actorCol, params.actorUserId);
    if (emailCol && cols.has(emailCol) && params.actorEmail) {
      push(emailCol, params.actorEmail);
    }
    if (rtCol && cols.has(rtCol)) push(rtCol, params.resourceType);
    if (riCol && cols.has(riCol)) push(riCol, params.resourceId);
    if (detCol && cols.has(detCol)) {
      const merged: Record<string, unknown> = { ...(params.details ?? {}) };
      if (!rtCol || !cols.has(rtCol)) merged._resourceType = params.resourceType;
      if (!riCol || !cols.has(riCol)) merged._resourceId = params.resourceId;
      insertCols.push(`"${detCol}"`);
      values.push(merged);
      placeholders.push(`$${p++}::jsonb`);
    }

    if (insertCols.length === 0) return;

    if (createdCol && cols.has(createdCol) && !insertCols.some((c) => c === `"${createdCol}"`)) {
      insertCols.push(`"${createdCol}"`);
      placeholders.push(`NOW()`);
    }

    const sql = `INSERT INTO "${auditTable}" (${insertCols.join(", ")}) VALUES (${placeholders.join(", ")})`;
    await client.query(sql, values);
  } catch (err) {
    console.error("[pgAudit] insert skipped or failed:", err);
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
  const auditTable = await getAuditTableName();
  if (!auditTable) return [];

  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const cols = await loadAuditColumns();
    if (cols.size === 0) return [];

    const tenantCol = firstCol(cols, ["tenant_id"]) ?? "tenant_id";
    const idCol = firstCol(cols, ["id", "log_id", "audit_id"]) ?? "id";
    const actionCol = firstCol(cols, ["action"]) ?? "action";
    const rtCol = firstCol(cols, ["resource_type", "entity_type", "object_type", "target_type"]);
    const riCol = firstCol(cols, ["resource_id", "entity_id", "object_id", "target_id"]);
    const detCol = firstCol(cols, ["details", "metadata", "detail_json", "payload", "meta"]);
    const createdCol = firstCol(cols, ["created_at", "logged_at", "occurred_at"]) ?? "created_at";

    if (!cols.has(tenantCol)) return [];

    const selectParts: string[] = [];
    if (cols.has(idCol)) selectParts.push(`"${idCol}" AS id`);
    if (cols.has(actionCol)) selectParts.push(`"${actionCol}" AS action`);
    if (rtCol && cols.has(rtCol)) {
      selectParts.push(`"${rtCol}" AS resource_type`);
    } else {
      selectParts.push(`'unknown' AS resource_type`);
    }
    if (riCol && cols.has(riCol)) {
      selectParts.push(`"${riCol}"::text AS resource_id`);
    } else {
      selectParts.push(`''::text AS resource_id`);
    }
    if (detCol && cols.has(detCol)) {
      selectParts.push(`"${detCol}" AS details`);
    } else {
      selectParts.push(`NULL::jsonb AS details`);
    }
    if (createdCol && cols.has(createdCol)) {
      selectParts.push(`"${createdCol}" AS created_at`);
    } else {
      selectParts.push(`NOW() AS created_at`);
    }

    const orderBy =
      createdCol && cols.has(createdCol) ? `"${createdCol}"` : idCol && cols.has(idCol) ? `"${idCol}"` : "1";
    const result = await client.query(
      `SELECT ${selectParts.join(", ")}
       FROM "${auditTable}"
       WHERE "${tenantCol}" = $1
       ORDER BY ${orderBy} DESC
       LIMIT $2`,
      [tenantId, limit]
    );
    return result.rows.map((r) => {
      const det = r.details;
      let detailsObj: Record<string, unknown> | null = null;
      if (det != null) {
        if (typeof det === "string") {
          try {
            detailsObj = JSON.parse(det) as Record<string, unknown>;
          } catch {
            detailsObj = { raw: det };
          }
        } else if (typeof det === "object") {
          detailsObj = det as Record<string, unknown>;
        }
      }
      let resource_type = String(r.resource_type ?? "unknown");
      let resource_id = String(r.resource_id ?? "");
      if (detailsObj && resource_type === "unknown" && detailsObj._resourceType) {
        resource_type = String(detailsObj._resourceType);
      }
      if (detailsObj && !resource_id && detailsObj._resourceId) {
        resource_id = String(detailsObj._resourceId);
      }
      return {
        id: String(r.id ?? randomUUID()),
        action: String(r.action ?? ""),
        resource_type,
        resource_id,
        details: detailsObj,
        created_at:
          r.created_at instanceof Date
            ? r.created_at.toISOString()
            : String(r.created_at ?? new Date().toISOString()),
      };
    });
  } catch (err) {
    console.warn("[pgAudit] query failed:", err);
    return [];
  } finally {
    client.release();
  }
}
