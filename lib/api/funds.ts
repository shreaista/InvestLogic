/**
 * Shared client-side fund fetching for Funds page and New Proposal page.
 * Uses the same endpoint and tenant scope as the Funds page.
 */

const FUNDS_API_URL = "/api/tenant/funds";

export interface FundOption {
  id: string;
  tenantId: string;
  name: string;
  code?: string;
  status: string;
}

export interface FetchFundsResult {
  ok: boolean;
  funds?: FundOption[];
  error?: string;
}

export async function fetchFundsFromApi(): Promise<FetchFundsResult> {
  console.log("[fundsApi] Fetch started, endpoint:", FUNDS_API_URL);
  try {
    const res = await fetch(FUNDS_API_URL, { credentials: "include" });
    const data = await res.json();
    const rawFunds = data.data?.funds;
    const rawCount = Array.isArray(rawFunds) ? rawFunds.length : 0;
    console.log("[fundsApi] Raw funds returned:", rawCount, "items:", rawFunds?.map((f: FundOption) => ({ id: f.id, name: f.name, code: f.code, status: f.status })));

    if (!data.ok || !Array.isArray(rawFunds)) {
      const errMsg = data.error || "Failed to load funds";
      console.warn("[fundsApi] Fetch failed, ok:", data.ok, "rawCount:", rawCount, "error:", errMsg);
      return { ok: false, error: errMsg };
    }

    console.log("[fundsApi] Funds loaded, count:", rawFunds.length);
    return { ok: true, funds: rawFunds };
  } catch (err) {
    console.error("[fundsApi] Network error:", err);
    return { ok: false, error: "Network error" };
  }
}

/**
 * Returns funds for proposal dropdown. Same logic as Funds page:
 * - Include if status is "active" (case-insensitive)
 * - Include if status is missing/undefined
 * - Exclude only explicit "inactive"
 */
export function filterActiveFundsForProposal(funds: FundOption[]): FundOption[] {
  const filtered = funds.filter(
    (f) => !f.status || String(f.status).toLowerCase() === "active"
  );
  console.log("[fundsApi] Filtered active funds:", filtered.length, "from", funds.length, "dropdown options:", filtered.map((f) => (f.code ? `${f.name} (${f.code})` : f.name)));
  return filtered;
}

