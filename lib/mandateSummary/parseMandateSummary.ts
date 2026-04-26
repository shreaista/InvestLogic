/**
 * Heuristic extraction of common mandate fields from plain text (no LLM).
 * Skips sections that are not clearly present.
 */

export type MandateSummary = {
  targetSectors?: string;
  geography?: string;
  investmentStage?: string;
  ticketSize?: string;
  returnTargets?: string;
  esgRequirements?: string;
  holdingPeriod?: string;
};

const SECTION_SPECS: Array<{
  key: keyof MandateSummary;
  /** Line-start patterns (regex source, no anchors) */
  linePatterns: string[];
}> = [
  {
    key: "targetSectors",
    linePatterns: [
      "target\\s+sectors?",
      "sector\\s+focus",
      "preferred\\s+sectors?",
    ],
  },
  {
    key: "geography",
    linePatterns: ["geography", "geographic\\s+focus", "regional\\s+focus", "regions?"],
  },
  {
    key: "investmentStage",
    linePatterns: [
      "investment\\s+stage",
      "stage\\s+focus",
      "funding\\s+stage",
    ],
  },
  {
    key: "ticketSize",
    linePatterns: [
      "ticket\\s+size",
      "investment\\s+size",
      "deal\\s+size",
      "check\\s+size",
    ],
  },
  {
    key: "returnTargets",
    linePatterns: [
      "return\\s+targets?",
      "target\\s+returns?",
      "(?:target\\s+)?irr\\b",
      "(?:target\\s+)?moic\\b",
    ],
  },
  {
    key: "esgRequirements",
    linePatterns: [
      "esg\\s+requirements?",
      "esg",
      "sustainability\\s+requirements?",
      "environmental[,\\s]+social",
    ],
  },
  {
    key: "holdingPeriod",
    linePatterns: ["holding\\s+period", "investment\\s+horizon", "exit\\s+horizon"],
  },
];

/** Any line that looks like another section header (avoid swallowing next section). */
function lineLooksLikeAnySectionHeader(line: string): boolean {
  const t = line.trim();
  if (t.length < 2) return false;
  for (const spec of SECTION_SPECS) {
    for (const p of spec.linePatterns) {
      const re = new RegExp(`^\\s*(?:${p})\\s*[:.\-–\\s]`, "i");
      if (re.test(t)) return true;
    }
  }
  return false;
}

function extractAfterLabel(line: string, labelRe: RegExp): string | null {
  const m = line.match(
    new RegExp(`^\\s*(?:${labelRe.source})\\s*[:.\-–]?\\s*(.*)$`, "i")
  );
  if (!m) return null;
  return m[1]?.trim() ?? "";
}

/**
 * Try line-by-line: first line matching label, then continuation until blank or next header.
 */
function extractSection(
  lines: string[],
  labelPatternSources: string[]
): string | null {
  for (const src of labelPatternSources) {
    const labelRe = new RegExp(src, "i");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const after = extractAfterLabel(line, labelRe);
      if (after === null) continue;
      const parts: string[] = [];
      if (after.length > 0) parts.push(after);
      for (let j = i + 1; j < lines.length; j++) {
        const next = lines[j];
        if (!next.trim()) {
          if (parts.length > 0) break;
          continue;
        }
        if (lineLooksLikeAnySectionHeader(next)) break;
        parts.push(next.trim());
      }
      const joined = parts.join(" ").trim();
      if (joined.length > 0) return joined;
    }
  }
  return null;
}

/**
 * Fallback: first occurrence of "Label ... : value" in a single blob (PDFs sometimes flatten lines).
 */
function extractFromBlob(text: string, labelPatternSources: string[]): string | null {
  const flat = text.replace(/\r\n/g, "\n");
  for (const src of labelPatternSources) {
    const re = new RegExp(
      `(?:^|\\n|\\s)${src}\\s*[:.\-–]\\s*([^\\n]+(?:\\n(?![\\s]*[A-Za-z][^\\n:]{0,50}[:.\-–])[^\\n]+)*)`,
      "i"
    );
    const m = flat.match(re);
    if (m?.[1]) {
      const v = m[1].replace(/\s+/g, " ").trim();
      if (v.length > 0) return v;
    }
  }
  return null;
}

export function parseMandateSummary(rawText: string | null | undefined): MandateSummary {
  if (!rawText?.trim()) return {};

  const lines = rawText.replace(/\r\n/g, "\n").split("\n");
  const out: MandateSummary = {};

  for (const spec of SECTION_SPECS) {
    let value = extractSection(lines, spec.linePatterns);
    if (!value) {
      value = extractFromBlob(rawText, spec.linePatterns);
    }
    if (value && value.length > 0) {
      out[spec.key] = value;
    }
  }

  return out;
}

export const SUMMARY_DISPLAY_LABELS: Record<keyof MandateSummary, string> = {
  targetSectors: "Target Sectors",
  geography: "Geography",
  investmentStage: "Investment Stage",
  ticketSize: "Ticket Size",
  returnTargets: "Return Targets",
  esgRequirements: "ESG Requirements",
  holdingPeriod: "Holding Period",
};

export const SUMMARY_SECTION_ORDER: (keyof MandateSummary)[] = [
  "targetSectors",
  "geography",
  "investmentStage",
  "ticketSize",
  "returnTargets",
  "esgRequirements",
  "holdingPeriod",
];
