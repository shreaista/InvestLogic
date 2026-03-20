import "server-only";

import { eq, and } from "drizzle-orm";
import type { Fund } from "@/lib/types";
import { getDb, funds as fundsTable, fundMandateLinks as fundMandateLinksTable } from "./index";

export type { Fund };

export interface CreateFundInput {
  name: string;
  code?: string;
}

export interface UpdateFundInput {
  name?: string;
  code?: string;
  status?: "active" | "inactive";
}

function rowToFund(row: { id: string; tenantId: string; name: string; code: string | null; status: string; createdAt: string; updatedAt: string }): Fund {
  return {
    id: row.id,
    tenantId: row.tenantId,
    name: row.name,
    code: row.code ?? undefined,
    status: row.status as "active" | "inactive",
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

export async function listFunds(tenantId: string): Promise<Fund[]> {
  const db = getDb();
  const rows = await db.select().from(fundsTable).where(eq(fundsTable.tenantId, tenantId));
  return rows.map(rowToFund);
}

export async function getFundById(tenantId: string, fundId: string): Promise<Fund | null> {
  const db = getDb();
  const rows = await db
    .select()
    .from(fundsTable)
    .where(and(eq(fundsTable.tenantId, tenantId), eq(fundsTable.id, fundId)))
    .limit(1);
  const row = rows[0];
  return row ? rowToFund(row) : null;
}

function normalize(s: string | undefined): string {
  if (!s || typeof s !== "string") return "";
  return s.trim().replace(/\s+/g, " ").toLowerCase();
}

export interface CreateFundResult {
  ok: boolean;
  fund?: Fund;
  error?: string;
}

export async function createFund(tenantId: string, input: CreateFundInput): Promise<CreateFundResult> {
  const rawName = (input.name ?? "").trim();
  if (!rawName) return { ok: false, error: "Fund name is required" };

  const db = getDb();
  const existing = await db.select().from(fundsTable).where(eq(fundsTable.tenantId, tenantId));

  const normName = normalize(rawName);
  const normCode = normalize(input.code);
  if (existing.some((f) => normalize(f.name) === normName)) {
    return { ok: false, error: "A fund with this name already exists" };
  }
  if (normCode && existing.some((f) => normalize(f.code ?? "") === normCode)) {
    return { ok: false, error: "A fund with this code already exists" };
  }

  const now = new Date().toISOString();
  const id = `fund-${Date.now()}`;
  await db.insert(fundsTable).values({
    id,
    tenantId,
    name: rawName,
    code: input.code?.trim() || null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  const fund = await getFundById(tenantId, id);
  return { ok: true, fund: fund ?? undefined };
}

export interface UpdateFundResult {
  ok: boolean;
  fund?: Fund;
  error?: string;
}

export async function updateFund(
  tenantId: string,
  fundId: string,
  input: UpdateFundInput
): Promise<UpdateFundResult> {
  const fund = await getFundById(tenantId, fundId);
  if (!fund) return { ok: false, error: "Fund not found" };

  const db = getDb();
  const updates: Record<string, unknown> = { updatedAt: new Date().toISOString() };

  if (input.name !== undefined) {
    if (!input.name.trim()) return { ok: false, error: "Fund name cannot be empty" };
    const existing = await db.select().from(fundsTable).where(eq(fundsTable.tenantId, tenantId));
    const duplicate = existing.find(
      (f) => f.id !== fundId && normalize(f.name) === normalize(input.name)
    );
    if (duplicate) return { ok: false, error: "A fund with this name already exists" };
    updates.name = input.name.trim();
  }
  if (input.code !== undefined) updates.code = input.code?.trim() || null;
  if (input.status !== undefined) updates.status = input.status;

  await db
    .update(fundsTable)
    .set(updates as Record<string, string>)
    .where(and(eq(fundsTable.tenantId, tenantId), eq(fundsTable.id, fundId)));

  const updated = await getFundById(tenantId, fundId);
  return { ok: true, fund: updated ?? undefined };
}

export async function deleteFund(tenantId: string, fundId: string): Promise<boolean> {
  const fund = await getFundById(tenantId, fundId);
  if (!fund) return false;

  const db = getDb();
  await db
    .delete(fundsTable)
    .where(and(eq(fundsTable.tenantId, tenantId), eq(fundsTable.id, fundId)));
  return true;
}

// ─────────────────────────────────────────────────────────────────────────────
// Fund-Mandate Links
// ─────────────────────────────────────────────────────────────────────────────

export async function getLinkedMandates(tenantId: string, fundId: string): Promise<string[]> {
  const db = getDb();
  const rows = await db
    .select({ mandateId: fundMandateLinksTable.mandateId })
    .from(fundMandateLinksTable)
    .where(and(eq(fundMandateLinksTable.fundId, fundId), eq(fundMandateLinksTable.tenantId, tenantId)));
  return rows.map((r) => r.mandateId);
}

export interface FundMandateLink {
  id: string;
  fundId: string;
  mandateId: string;
  tenantId: string;
  linkedAt: string;
  linkedByUserId: string;
}

export async function getFundMandateLinks(tenantId: string, fundId: string): Promise<FundMandateLink[]> {
  const db = getDb();
  const rows = await db
    .select()
    .from(fundMandateLinksTable)
    .where(and(eq(fundMandateLinksTable.fundId, fundId), eq(fundMandateLinksTable.tenantId, tenantId)));
  return rows.map((r) => ({
    id: r.id,
    fundId: r.fundId,
    mandateId: r.mandateId,
    tenantId: r.tenantId,
    linkedAt: r.linkedAt,
    linkedByUserId: r.linkedByUserId ?? "",
  }));
}

export async function linkMandateToFund(
  tenantId: string,
  fundId: string,
  mandateId: string,
  userId: string
): Promise<{ ok: boolean; link?: FundMandateLink; error?: string }> {
  const fund = await getFundById(tenantId, fundId);
  if (!fund) return { ok: false, error: "Fund not found" };

  const db = getDb();
  const existing = await db
    .select()
    .from(fundMandateLinksTable)
    .where(
      and(
        eq(fundMandateLinksTable.fundId, fundId),
        eq(fundMandateLinksTable.mandateId, mandateId),
        eq(fundMandateLinksTable.tenantId, tenantId)
      )
    )
    .limit(1);
  if (existing.length > 0) return { ok: false, error: "Mandate is already linked to this fund" };

  const now = new Date().toISOString();
  const id = `link-${Date.now()}`;
  await db.insert(fundMandateLinksTable).values({
    id,
    fundId,
    mandateId,
    tenantId,
    linkedAt: now,
    linkedByUserId: userId,
  });

  const links = await getFundMandateLinks(tenantId, fundId);
  const link = links.find((l) => l.mandateId === mandateId);
  return { ok: true, link };
}

export async function unlinkMandateFromFund(
  tenantId: string,
  fundId: string,
  mandateId: string
): Promise<boolean> {
  const db = getDb();
  const result = await db
    .delete(fundMandateLinksTable)
    .where(
      and(
        eq(fundMandateLinksTable.fundId, fundId),
        eq(fundMandateLinksTable.mandateId, mandateId),
        eq(fundMandateLinksTable.tenantId, tenantId)
      )
    );
  return true;
}
