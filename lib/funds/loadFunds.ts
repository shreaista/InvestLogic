/**
 * Shared client-side fund loading.
 * Used by FundsClient and NewProposalClient so both show the same fund list.
 */

import type { Fund } from "@/lib/types";

export const FUNDS_API_URL = "/api/funds";

export interface LoadFundsResult {
  ok: boolean;
  funds?: Fund[];
  error?: string;
}

function mapApiFundToFund(row: {
  fund_id: string;
  fund_name: string;
  fund_code: string | null;
  status: string;
  created_at: string;
}): Fund {
  return {
    id: String(row.fund_id),
    tenantId: "tenant_ipa_001",
    name: row.fund_name,
    code: row.fund_code ?? undefined,
    status: (row.status?.toLowerCase() === "inactive" ? "inactive" : "active") as "active" | "inactive",
    createdAt: row.created_at ?? "",
    updatedAt: row.created_at ?? "",
  };
}

/**
 * Fetches funds from /api/funds (PostgreSQL).
 */
export async function loadFunds(): Promise<LoadFundsResult> {
  try {
    const res = await fetch(FUNDS_API_URL, { credentials: "include" });
    const data = await res.json();

    if (data.ok && Array.isArray(data.funds)) {
      const funds = data.funds.map(mapApiFundToFund);
      return { ok: true, funds };
    }

    const errMsg = data.error || "Failed to load funds";
    return { ok: false, error: errMsg };
  } catch (err) {
    console.error("[loadFunds] Network error:", err);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Filters to active funds for proposal dropdown.
 * Include if status is "active" (case-insensitive) or missing.
 */
export function filterActiveFunds(funds: Fund[]): Fund[] {
  const active = funds.filter(
    (f) => !f.status || String(f.status).toLowerCase() === "active"
  );
  const opts = active.map((f) => (f.code ? `${f.name} (${f.code})` : f.name));
  console.log("[loadFunds] Active funds:", active.length, "from", funds.length, "dropdown options:", opts);
  return active;
}
