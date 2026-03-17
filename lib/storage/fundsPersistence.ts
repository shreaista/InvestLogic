import "server-only";
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import { join } from "path";
import type { Fund } from "@/lib/mock/fundsStore";

const DATA_DIR = join(process.cwd(), "data");
export const FUNDS_FILE_PATH = join(DATA_DIR, "funds.json");

export interface FundsPersistenceData {
  userCreated: Fund[];
  nextFundId: number;
}

const DEFAULT_DATA: FundsPersistenceData = {
  userCreated: [],
  nextFundId: 8,
};

/** Synchronous load for use in fundsStore (keeps listFunds/createFund sync). */
export function loadFundsFromFileSync(): FundsPersistenceData {
  try {
    if (!existsSync(FUNDS_FILE_PATH)) {
      return { ...DEFAULT_DATA };
    }
    const raw = readFileSync(FUNDS_FILE_PATH, "utf-8");
    const parsed = JSON.parse(raw) as FundsPersistenceData;
    if (parsed && Array.isArray(parsed.userCreated) && typeof parsed.nextFundId === "number") {
      return parsed;
    }
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code !== "ENOENT") {
      console.error("[fundsPersistence] Load error:", err);
    }
  }
  return { ...DEFAULT_DATA };
}

/** Synchronous save for use in fundsStore after createFund. */
export function saveFundsToFileSync(data: FundsPersistenceData): void {
  try {
    mkdirSync(DATA_DIR, { recursive: true });
    writeFileSync(FUNDS_FILE_PATH, JSON.stringify(data, null, 2), "utf-8");
  } catch (err) {
    console.error("[fundsPersistence] Save error:", err);
    throw err;
  }
}
