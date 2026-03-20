/**
 * Shared client-side fund loading - EXACT same logic as Funds page.
 * Used by FundsClient and NewProposalClient so both show the same fund list.
 */

import type { Fund } from "@/lib/types";

export const FUNDS_API_URL = "/api/tenant/funds";

export interface LoadFundsResult {
  ok: boolean;
  funds?: Fund[];
  error?: string;
}

/**
 * Fetches funds from /api/tenant/funds with credentials.
 * Same endpoint, tenant scoping (via cookies), no transformation, no filtering.
 * Returns raw funds array exactly as Funds page does.
 */
export async function loadFunds(): Promise<LoadFundsResult> {
  console.log("[loadFunds] Started, endpoint:", FUNDS_API_URL);
  try {
    const res = await fetch(FUNDS_API_URL, { credentials: "include" });
    const data = await res.json();
    const rawFunds = data.data?.funds;
    const rawCount = Array.isArray(rawFunds) ? rawFunds.length : 0;

    console.log(
      "[loadFunds] Raw response: status:",
      res.status,
      "body:",
      JSON.stringify(data),
      "raw funds count:",
      rawCount
    );

    if (data.ok && Array.isArray(rawFunds)) {
      console.log("[loadFunds] Normalized funds array:", rawFunds.length, "items:", rawFunds.map((f: Fund) => ({ id: f.id, name: f.name, code: f.code, status: f.status })));
      return { ok: true, funds: rawFunds };
    }

    const errMsg = data.error || "Failed to load funds";
    console.error("[loadFunds] Failed:", res.status, errMsg);
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
