import "server-only";

// RAG-style Relevance Matching for Proposal Evaluation
//
// This module provides:
// - Keyword-based relevance scoring with business term weighting
// - Matching proposal chunks to mandate chunks
// - Budget-aware matched chunk selection
// - Metadata tracking for evaluation reports

import { type DocumentChunk, DEFAULT_TOTAL_BUDGET } from "./chunking";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const TOP_MATCHES_PER_PROPOSAL_CHUNK = 2;
export const DEFAULT_RELEVANCE_METHOD = "keyword-overlap" as const;

// Common stop words to exclude from keyword matching
const STOP_WORDS = new Set([
  "a", "an", "the", "and", "or", "but", "in", "on", "at", "to", "for", "of",
  "with", "by", "from", "as", "is", "was", "are", "were", "been", "be", "have",
  "has", "had", "do", "does", "did", "will", "would", "could", "should", "may",
  "might", "must", "shall", "can", "need", "this", "that", "these", "those",
  "it", "its", "we", "our", "you", "your", "they", "their", "he", "she", "him",
  "her", "i", "my", "me", "not", "no", "so", "if", "then", "than", "when",
  "what", "which", "who", "how", "all", "each", "every", "both", "few", "more",
  "most", "other", "some", "such", "only", "same", "also", "just", "any",
  "about", "into", "through", "during", "before", "after", "above", "below",
  "between", "under", "over", "again", "further", "once", "here", "there",
  "where", "why", "very", "too", "being", "those", "own", "itself", "themselves",
]);

// Business terms that get extra weight in relevance scoring
const BUSINESS_TERMS = new Set([
  // Investment stages
  "seed", "series", "pre-seed", "growth", "expansion", "venture", "angel",
  // Sectors
  "saas", "fintech", "healthtech", "biotech", "cleantech", "edtech", "proptech",
  "cybersecurity", "enterprise", "b2b", "b2c", "marketplace", "platform",
  "software", "hardware", "deeptech", "infrastructure", "consumer", "retail",
  // AI / Tech
  "ai", "ml", "machine", "learning", "artificial", "intelligence", "automation",
  "data", "analytics", "cloud", "blockchain", "crypto", "iot", "robotics",
  // Geography
  "north", "america", "europe", "asia", "pacific", "emea", "latam", "global",
  "usa", "uk", "germany", "france", "canada", "australia", "india", "china",
  "regional", "domestic", "international", "cross-border",
  // Financial metrics
  "irr", "moic", "tvpi", "dpi", "roi", "revenue", "arr", "mrr", "gmv", "ebitda",
  "margin", "valuation", "multiple", "exit", "ipo", "acquisition", "merger",
  // Investment terms
  "ticket", "check", "investment", "fund", "portfolio", "allocation", "mandate",
  "strategy", "thesis", "criteria", "target", "sector", "stage", "geography",
  // ESG
  "esg", "sustainable", "sustainability", "impact", "social", "environmental",
  "governance", "climate", "carbon", "diversity", "inclusion",
  // Risk
  "risk", "diligence", "compliance", "regulatory", "legal", "audit",
]);

// Weight multiplier for business terms
const BUSINESS_TERM_WEIGHT = 2.0;

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface KeywordSet {
  all: Set<string>;
  business: Set<string>;
  regular: Set<string>;
}

export interface ChunkMatch {
  proposalChunk: DocumentChunk;
  mandateChunks: DocumentChunk[];
  relevanceScore: number;
  sharedKeywords: string[];
  sharedBusinessTerms: string[];
}

export interface MatchedPair {
  proposalChunkId: string;
  mandateChunkId: string;
  score: number;
  proposalExcerpt: string;
  mandateExcerpt: string;
}

export interface RelevanceMatchingResult {
  matchedChunks: ChunkMatch[];
  proposalChunksUsed: number;
  mandateChunksUsed: number;
  matchedPairsCount: number;
  relevanceMethod: typeof DEFAULT_RELEVANCE_METHOD;
  totalCharacters: number;
  warnings: string[];
}

export interface RelevanceMatchedInput {
  proposalText: string;
  mandateText: string;
  proposalChunksUsed: number;
  mandateChunksUsed: number;
  matchedPairsCount: number;
  relevanceMethod: typeof DEFAULT_RELEVANCE_METHOD;
  processedDocumentsCount: number;
  truncatedDocumentsCount: number;
  skippedDocumentsCount: number;
  totalCharacters: number;
  warnings: string[];
  topMatchedPairs: MatchedPair[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Normalization
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Normalize text for keyword extraction.
 * - Convert to lowercase
 * - Remove extra whitespace
 * - Remove special characters except hyphens in compound words
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Extract keywords from text with business term identification.
 * Returns separate sets for all keywords, business terms, and regular terms.
 */
export function extractKeywords(text: string): KeywordSet {
  const normalized = normalizeText(text);
  const tokens = normalized.split(/\s+/).filter((token) => token.length >= 2);

  const all = new Set<string>();
  const business = new Set<string>();
  const regular = new Set<string>();

  for (const token of tokens) {
    // Skip stop words
    if (STOP_WORDS.has(token)) continue;
    // Skip pure numbers
    if (/^\d+$/.test(token)) continue;

    all.add(token);

    if (BUSINESS_TERMS.has(token)) {
      business.add(token);
    } else {
      regular.add(token);
    }
  }

  return { all, business, regular };
}

// ─────────────────────────────────────────────────────────────────────────────
// Relevance Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Calculate weighted relevance score between two keyword sets.
 * Business terms contribute more to the score.
 */
export function calculateRelevanceScore(
  keywords1: KeywordSet,
  keywords2: KeywordSet
): { score: number; sharedKeywords: string[]; sharedBusinessTerms: string[] } {
  if (keywords1.all.size === 0 || keywords2.all.size === 0) {
    return { score: 0, sharedKeywords: [], sharedBusinessTerms: [] };
  }

  const sharedKeywords: string[] = [];
  const sharedBusinessTerms: string[] = [];

  // Find shared business terms
  for (const term of keywords1.business) {
    if (keywords2.business.has(term)) {
      sharedBusinessTerms.push(term);
      sharedKeywords.push(term);
    }
  }

  // Find shared regular keywords
  for (const keyword of keywords1.regular) {
    if (keywords2.regular.has(keyword)) {
      sharedKeywords.push(keyword);
    }
  }

  // Also check for business terms that appear in one as business and other as regular
  for (const term of keywords1.business) {
    if (keywords2.regular.has(term) && !sharedBusinessTerms.includes(term)) {
      sharedBusinessTerms.push(term);
      sharedKeywords.push(term);
    }
  }
  for (const term of keywords2.business) {
    if (keywords1.regular.has(term) && !sharedBusinessTerms.includes(term)) {
      sharedBusinessTerms.push(term);
      if (!sharedKeywords.includes(term)) {
        sharedKeywords.push(term);
      }
    }
  }

  // Calculate weighted score
  const regularOverlap = sharedKeywords.length - sharedBusinessTerms.length;
  const businessOverlap = sharedBusinessTerms.length;

  const weightedOverlap =
    regularOverlap + businessOverlap * BUSINESS_TERM_WEIGHT;

  // Normalize by the smaller keyword set size (with business term weighting)
  const size1 =
    keywords1.regular.size + keywords1.business.size * BUSINESS_TERM_WEIGHT;
  const size2 =
    keywords2.regular.size + keywords2.business.size * BUSINESS_TERM_WEIGHT;
  const minSize = Math.min(size1, size2);

  const score = minSize > 0 ? weightedOverlap / minSize : 0;

  return { score, sharedKeywords, sharedBusinessTerms };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Match each proposal chunk to its top N most relevant mandate chunks.
 */
export function matchProposalToMandateChunks(
  proposalChunks: DocumentChunk[],
  mandateChunks: DocumentChunk[],
  topN: number = TOP_MATCHES_PER_PROPOSAL_CHUNK
): ChunkMatch[] {
  if (proposalChunks.length === 0 || mandateChunks.length === 0) {
    return [];
  }

  console.log(
    `[relevanceMatching] Matching ${proposalChunks.length} proposal chunks to ${mandateChunks.length} mandate chunks`
  );

  // Pre-compute keywords for all mandate chunks
  const mandateKeywordsMap = new Map<string, KeywordSet>();
  for (const chunk of mandateChunks) {
    mandateKeywordsMap.set(chunk.id, extractKeywords(chunk.text));
  }

  const matches: ChunkMatch[] = [];

  for (const proposalChunk of proposalChunks) {
    const proposalKeywords = extractKeywords(proposalChunk.text);

    // Score against all mandate chunks
    const scores: Array<{
      mandateChunk: DocumentChunk;
      score: number;
      sharedKeywords: string[];
      sharedBusinessTerms: string[];
    }> = [];

    for (const mandateChunk of mandateChunks) {
      const mandateKeywords = mandateKeywordsMap.get(mandateChunk.id)!;
      const { score, sharedKeywords, sharedBusinessTerms } =
        calculateRelevanceScore(proposalKeywords, mandateKeywords);

      if (score > 0) {
        scores.push({
          mandateChunk,
          score,
          sharedKeywords,
          sharedBusinessTerms,
        });
      }
    }

    // Sort by score descending and take top N
    scores.sort((a, b) => b.score - a.score);
    const topMatches = scores.slice(0, topN);

    if (topMatches.length > 0) {
      // Aggregate shared keywords from all matches
      const allSharedKeywords = new Set<string>();
      const allSharedBusinessTerms = new Set<string>();
      const totalScore =
        topMatches.reduce((sum, m) => sum + m.score, 0) / topMatches.length;

      for (const match of topMatches) {
        for (const kw of match.sharedKeywords) allSharedKeywords.add(kw);
        for (const bt of match.sharedBusinessTerms)
          allSharedBusinessTerms.add(bt);
      }

      matches.push({
        proposalChunk,
        mandateChunks: topMatches.map((m) => m.mandateChunk),
        relevanceScore: totalScore,
        sharedKeywords: Array.from(allSharedKeywords),
        sharedBusinessTerms: Array.from(allSharedBusinessTerms),
      });
    }
  }

  console.log(
    `[relevanceMatching] Found ${matches.length} matched proposal chunks with relevance > 0`
  );

  return matches;
}

// ─────────────────────────────────────────────────────────────────────────────
// Budget-Aware Selection
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Select matched chunks within a character budget.
 * Prioritizes by relevance score, then by document upload date.
 */
export function selectMatchedChunksWithinBudget(
  matches: ChunkMatch[],
  totalBudget: number = DEFAULT_TOTAL_BUDGET
): {
  selectedProposalChunks: DocumentChunk[];
  selectedMandateChunks: DocumentChunk[];
  usedProposalChars: number;
  usedMandateChars: number;
  matchedPairsCount: number;
  topMatchedPairs: MatchedPair[];
  warnings: string[];
} {
  // Split budget: 60% proposal, 40% mandate
  const proposalBudget = Math.floor(totalBudget * 0.6);
  const mandateBudget = totalBudget - proposalBudget;

  // Sort matches by relevance score (highest first)
  const sortedMatches = [...matches].sort(
    (a, b) => b.relevanceScore - a.relevanceScore
  );

  const selectedProposalChunks: DocumentChunk[] = [];
  const selectedMandateChunksMap = new Map<string, DocumentChunk>();
  const topMatchedPairs: MatchedPair[] = [];
  const warnings: string[] = [];

  let usedProposalChars = 0;
  let usedMandateChars = 0;
  let matchedPairsCount = 0;

  for (const match of sortedMatches) {
    const proposalChunk = match.proposalChunk;

    // Check if we can add this proposal chunk
    if (usedProposalChars + proposalChunk.text.length > proposalBudget) {
      continue;
    }

    // Check which mandate chunks we can add
    const mandateChunksToAdd: DocumentChunk[] = [];
    let additionalMandateChars = 0;

    for (const mandateChunk of match.mandateChunks) {
      // Skip if already selected
      if (selectedMandateChunksMap.has(mandateChunk.id)) {
        mandateChunksToAdd.push(mandateChunk);
        continue;
      }

      // Check budget
      if (
        usedMandateChars + additionalMandateChars + mandateChunk.text.length <=
        mandateBudget
      ) {
        mandateChunksToAdd.push(mandateChunk);
        additionalMandateChars += mandateChunk.text.length;
      }
    }

    // Only add if we have at least one mandate chunk match
    if (mandateChunksToAdd.length > 0) {
      selectedProposalChunks.push(proposalChunk);
      usedProposalChars += proposalChunk.text.length;

      for (const mandateChunk of mandateChunksToAdd) {
        if (!selectedMandateChunksMap.has(mandateChunk.id)) {
          selectedMandateChunksMap.set(mandateChunk.id, mandateChunk);
          usedMandateChars += mandateChunk.text.length;
        }

        matchedPairsCount++;

        // Track top matched pairs for metadata (limit to 10)
        if (topMatchedPairs.length < 10) {
          topMatchedPairs.push({
            proposalChunkId: proposalChunk.id,
            mandateChunkId: mandateChunk.id,
            score: Math.round(match.relevanceScore * 100) / 100,
            proposalExcerpt: proposalChunk.text.substring(0, 150),
            mandateExcerpt: mandateChunk.text.substring(0, 150),
          });
        }
      }
    }
  }

  const selectedMandateChunks = Array.from(selectedMandateChunksMap.values());

  // Add warning if we couldn't include all matches
  const skippedMatches = sortedMatches.length - selectedProposalChunks.length;
  if (skippedMatches > 0) {
    warnings.push(
      `Budget limit reached, skipped ${skippedMatches} lower-relevance proposal chunks`
    );
  }

  console.log(
    `[relevanceMatching] Selected ${selectedProposalChunks.length} proposal chunks (${usedProposalChars} chars), ${selectedMandateChunks.length} mandate chunks (${usedMandateChars} chars), ${matchedPairsCount} matched pairs`
  );

  return {
    selectedProposalChunks,
    selectedMandateChunks,
    usedProposalChars,
    usedMandateChars,
    matchedPairsCount,
    topMatchedPairs,
    warnings,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Combined Input Preparation with Relevance Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Prepare evaluation input using relevance matching.
 * Matches proposal chunks to mandate chunks and selects the most relevant content.
 */
export function prepareRelevanceMatchedInput(
  proposalChunks: DocumentChunk[],
  mandateChunks: DocumentChunk[],
  totalBudget: number = DEFAULT_TOTAL_BUDGET,
  stats?: {
    processedDocumentsCount: number;
    truncatedDocumentsCount: number;
    skippedDocumentsCount: number;
  }
): RelevanceMatchedInput {
  console.log(
    `[relevanceMatching] Starting relevance-based input preparation: ${proposalChunks.length} proposal chunks, ${mandateChunks.length} mandate chunks, budget=${totalBudget}`
  );

  // Match proposal chunks to mandate chunks
  const matches = matchProposalToMandateChunks(proposalChunks, mandateChunks);

  // Select chunks within budget
  const selection = selectMatchedChunksWithinBudget(matches, totalBudget);

  // Build combined text from selected chunks
  const proposalText = buildTextFromChunks(selection.selectedProposalChunks);
  const mandateText = buildTextFromChunks(selection.selectedMandateChunks);

  const totalChars =
    selection.usedProposalChars + selection.usedMandateChars;

  console.log(
    `[relevanceMatching] Input preparation complete: ${selection.selectedProposalChunks.length} proposal chunks, ${selection.selectedMandateChunks.length} mandate chunks, ${selection.matchedPairsCount} matched pairs, ${totalChars} total chars`
  );

  return {
    proposalText,
    mandateText,
    proposalChunksUsed: selection.selectedProposalChunks.length,
    mandateChunksUsed: selection.selectedMandateChunks.length,
    matchedPairsCount: selection.matchedPairsCount,
    relevanceMethod: DEFAULT_RELEVANCE_METHOD,
    processedDocumentsCount: stats?.processedDocumentsCount ?? 0,
    truncatedDocumentsCount: stats?.truncatedDocumentsCount ?? 0,
    skippedDocumentsCount: stats?.skippedDocumentsCount ?? 0,
    totalCharacters: totalChars,
    warnings: selection.warnings,
    topMatchedPairs: selection.topMatchedPairs,
  };
}

/**
 * Build combined text from chunks, grouped by document.
 */
function buildTextFromChunks(chunks: DocumentChunk[]): string {
  if (chunks.length === 0) {
    return "";
  }

  // Group chunks by document
  const docGroups = new Map<string, DocumentChunk[]>();
  for (const chunk of chunks) {
    const existing = docGroups.get(chunk.documentFilename);
    if (existing) {
      existing.push(chunk);
    } else {
      docGroups.set(chunk.documentFilename, [chunk]);
    }
  }

  // Sort chunks within each document by index
  for (const docChunks of docGroups.values()) {
    docChunks.sort((a, b) => a.chunkIndex - b.chunkIndex);
  }

  // Build text with document separators
  const parts: string[] = [];
  for (const [filename, docChunks] of docGroups) {
    const docText = docChunks.map((c) => c.text).join("\n\n");
    parts.push(`--- ${filename} ---\n${docText}`);
  }

  return parts.join("\n\n");
}

// ─────────────────────────────────────────────────────────────────────────────
// Safe Fallback Wrapper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Safe wrapper for relevance-matched input preparation.
 * Falls back to simple chunk concatenation if matching fails.
 */
export function prepareRelevanceMatchedInputSafe(
  proposalChunks: DocumentChunk[],
  mandateChunks: DocumentChunk[],
  totalBudget: number = DEFAULT_TOTAL_BUDGET,
  stats?: {
    processedDocumentsCount: number;
    truncatedDocumentsCount: number;
    skippedDocumentsCount: number;
  }
): RelevanceMatchedInput {
  try {
    return prepareRelevanceMatchedInput(
      proposalChunks,
      mandateChunks,
      totalBudget,
      stats
    );
  } catch (error) {
    console.error(
      "[relevanceMatching] Relevance matching failed, using fallback:",
      error
    );

    // Fallback: simple concatenation without matching
    const proposalBudget = Math.floor(totalBudget * 0.6);
    const mandateBudget = totalBudget - proposalBudget;

    let proposalText = "";
    let proposalCharsUsed = 0;
    for (const chunk of proposalChunks) {
      if (proposalCharsUsed + chunk.text.length <= proposalBudget) {
        proposalText += (proposalText ? "\n\n" : "") + chunk.text;
        proposalCharsUsed += chunk.text.length;
      }
    }

    let mandateText = "";
    let mandateCharsUsed = 0;
    for (const chunk of mandateChunks) {
      if (mandateCharsUsed + chunk.text.length <= mandateBudget) {
        mandateText += (mandateText ? "\n\n" : "") + chunk.text;
        mandateCharsUsed += chunk.text.length;
      }
    }

    return {
      proposalText,
      mandateText,
      proposalChunksUsed: proposalChunks.length,
      mandateChunksUsed: mandateChunks.length,
      matchedPairsCount: 0,
      relevanceMethod: DEFAULT_RELEVANCE_METHOD,
      processedDocumentsCount: stats?.processedDocumentsCount ?? 0,
      truncatedDocumentsCount: stats?.truncatedDocumentsCount ?? 0,
      skippedDocumentsCount: stats?.skippedDocumentsCount ?? 0,
      totalCharacters: proposalCharsUsed + mandateCharsUsed,
      warnings: [
        `Relevance matching failed, used fallback: ${error instanceof Error ? error.message : "Unknown error"}`,
      ],
      topMatchedPairs: [],
    };
  }
}
