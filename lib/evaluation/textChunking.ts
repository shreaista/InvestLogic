import "server-only";

// RAG-style Text Chunking and Relevance Matching
//
// This module provides:
// - Text chunking with paragraph boundary preservation
// - Keyword-based relevance scoring (no embeddings)
// - Matching proposal chunks to mandate chunks

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────

export const DEFAULT_CHUNK_SIZE = 1000;
export const TOP_MATCHES_PER_CHUNK = 3;

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
]);

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TextChunk {
  id: string;
  text: string;
  source: "proposal" | "mandate";
  index: number;
  charStart: number;
  charEnd: number;
}

export interface ChunkMatch {
  proposalChunk: TextChunk;
  mandateChunk: TextChunk;
  score: number;
  sharedKeywords: string[];
}

export interface MatchedPair {
  proposalChunkId: string;
  mandateChunkId: string;
  score: number;
  proposalExcerpt: string;
  mandateExcerpt: string;
}

export interface RAGEvaluationInput {
  proposalSummary: string;
  topMandateSections: string[];
  matchedPairs: MatchedPair[];
  matchedSectionsCount: number;
  topMandateSectionsPreview: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Chunking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Split text into chunks of approximately maxChars characters.
 * Attempts to preserve paragraph boundaries when possible.
 */
export function splitIntoChunks(
  text: string,
  source: "proposal" | "mandate",
  maxChars: number = DEFAULT_CHUNK_SIZE
): TextChunk[] {
  if (!text || text.trim().length === 0) {
    return [];
  }

  const chunks: TextChunk[] = [];
  const paragraphs = text.split(/\n\n+/);
  
  let currentChunk = "";
  let currentStart = 0;
  let charOffset = 0;
  let chunkIndex = 0;

  for (let i = 0; i < paragraphs.length; i++) {
    const paragraph = paragraphs[i].trim();
    
    if (!paragraph) {
      charOffset += 2; // Account for \n\n
      continue;
    }

    // If adding this paragraph would exceed maxChars
    if (currentChunk.length + paragraph.length + 2 > maxChars) {
      // Save current chunk if it has content
      if (currentChunk.trim().length > 0) {
        chunks.push({
          id: `${source}-${chunkIndex}`,
          text: currentChunk.trim(),
          source,
          index: chunkIndex,
          charStart: currentStart,
          charEnd: charOffset,
        });
        chunkIndex++;
      }

      // If single paragraph exceeds maxChars, split it by sentences
      if (paragraph.length > maxChars) {
        const subChunks = splitLongParagraph(paragraph, source, maxChars, chunkIndex, charOffset);
        chunks.push(...subChunks);
        chunkIndex += subChunks.length;
        charOffset += paragraph.length + 2;
        currentChunk = "";
        currentStart = charOffset;
      } else {
        currentChunk = paragraph;
        currentStart = charOffset;
        charOffset += paragraph.length + 2;
      }
    } else {
      // Add paragraph to current chunk
      if (currentChunk.length > 0) {
        currentChunk += "\n\n" + paragraph;
      } else {
        currentChunk = paragraph;
        currentStart = charOffset;
      }
      charOffset += paragraph.length + 2;
    }
  }

  // Don't forget the last chunk
  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: currentChunk.trim(),
      source,
      index: chunkIndex,
      charStart: currentStart,
      charEnd: charOffset,
    });
  }

  return chunks;
}

/**
 * Split a long paragraph that exceeds maxChars by sentence boundaries.
 */
function splitLongParagraph(
  paragraph: string,
  source: "proposal" | "mandate",
  maxChars: number,
  startIndex: number,
  charOffset: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  // Split by sentence-ending punctuation followed by space
  const sentences = paragraph.split(/(?<=[.!?])\s+/);
  
  let currentChunk = "";
  let currentStart = charOffset;
  let sentenceOffset = 0;
  let chunkIndex = startIndex;

  for (const sentence of sentences) {
    if (currentChunk.length + sentence.length + 1 > maxChars) {
      if (currentChunk.trim().length > 0) {
        chunks.push({
          id: `${source}-${chunkIndex}`,
          text: currentChunk.trim(),
          source,
          index: chunkIndex,
          charStart: currentStart,
          charEnd: charOffset + sentenceOffset,
        });
        chunkIndex++;
      }
      
      // If single sentence exceeds maxChars, force-split it
      if (sentence.length > maxChars) {
        const forceSplit = forceSplitText(sentence, source, maxChars, chunkIndex, charOffset + sentenceOffset);
        chunks.push(...forceSplit);
        chunkIndex += forceSplit.length;
        sentenceOffset += sentence.length + 1;
        currentChunk = "";
        currentStart = charOffset + sentenceOffset;
      } else {
        currentChunk = sentence;
        currentStart = charOffset + sentenceOffset;
        sentenceOffset += sentence.length + 1;
      }
    } else {
      currentChunk += (currentChunk ? " " : "") + sentence;
      sentenceOffset += sentence.length + 1;
    }
  }

  if (currentChunk.trim().length > 0) {
    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: currentChunk.trim(),
      source,
      index: chunkIndex,
      charStart: currentStart,
      charEnd: charOffset + sentenceOffset,
    });
  }

  return chunks;
}

/**
 * Force-split text at exactly maxChars boundaries (last resort).
 */
function forceSplitText(
  text: string,
  source: "proposal" | "mandate",
  maxChars: number,
  startIndex: number,
  charOffset: number
): TextChunk[] {
  const chunks: TextChunk[] = [];
  let chunkIndex = startIndex;
  
  for (let i = 0; i < text.length; i += maxChars) {
    const chunkText = text.slice(i, i + maxChars);
    chunks.push({
      id: `${source}-${chunkIndex}`,
      text: chunkText,
      source,
      index: chunkIndex,
      charStart: charOffset + i,
      charEnd: charOffset + i + chunkText.length,
    });
    chunkIndex++;
  }
  
  return chunks;
}

// ─────────────────────────────────────────────────────────────────────────────
// Keyword Extraction and Relevance Scoring
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extract meaningful keywords from text.
 * Returns normalized, lowercase keywords without stop words.
 */
export function extractKeywords(text: string): Set<string> {
  // Tokenize: split on whitespace and punctuation, keep alphanumeric
  const tokens = text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3) // Minimum 3 chars
    .filter((token) => !STOP_WORDS.has(token))
    .filter((token) => !/^\d+$/.test(token)); // Exclude pure numbers

  return new Set(tokens);
}

/**
 * Calculate normalized relevance score between two text chunks.
 * Uses Jaccard-like similarity based on keyword overlap.
 * Returns score between 0 and 1.
 */
export function calculateRelevanceScore(
  keywords1: Set<string>,
  keywords2: Set<string>
): { score: number; sharedKeywords: string[] } {
  if (keywords1.size === 0 || keywords2.size === 0) {
    return { score: 0, sharedKeywords: [] };
  }

  const shared: string[] = [];
  for (const keyword of keywords1) {
    if (keywords2.has(keyword)) {
      shared.push(keyword);
    }
  }

  // Normalized score: intersection / min(size1, size2)
  // This gives higher scores when smaller chunk is well-matched
  const minSize = Math.min(keywords1.size, keywords2.size);
  const score = shared.length / minSize;

  return { score, sharedKeywords: shared };
}

// ─────────────────────────────────────────────────────────────────────────────
// Chunk Matching
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Find top N most relevant mandate chunks for each proposal chunk.
 */
export function matchChunks(
  proposalChunks: TextChunk[],
  mandateChunks: TextChunk[],
  topN: number = TOP_MATCHES_PER_CHUNK
): ChunkMatch[] {
  if (proposalChunks.length === 0 || mandateChunks.length === 0) {
    return [];
  }

  // Pre-compute keywords for all mandate chunks
  const mandateKeywordsMap = new Map<string, Set<string>>();
  for (const chunk of mandateChunks) {
    mandateKeywordsMap.set(chunk.id, extractKeywords(chunk.text));
  }

  const allMatches: ChunkMatch[] = [];

  for (const proposalChunk of proposalChunks) {
    const proposalKeywords = extractKeywords(proposalChunk.text);
    
    // Score against all mandate chunks
    const scores: Array<{ mandateChunk: TextChunk; score: number; sharedKeywords: string[] }> = [];
    
    for (const mandateChunk of mandateChunks) {
      const mandateKeywords = mandateKeywordsMap.get(mandateChunk.id)!;
      const { score, sharedKeywords } = calculateRelevanceScore(proposalKeywords, mandateKeywords);
      
      if (score > 0) {
        scores.push({ mandateChunk, score, sharedKeywords });
      }
    }

    // Sort by score descending and take top N
    scores.sort((a, b) => b.score - a.score);
    const topMatches = scores.slice(0, topN);

    for (const match of topMatches) {
      allMatches.push({
        proposalChunk,
        mandateChunk: match.mandateChunk,
        score: match.score,
        sharedKeywords: match.sharedKeywords,
      });
    }
  }

  return allMatches;
}

/**
 * Get unique mandate chunks from matches, sorted by total relevance.
 */
export function getTopMandateChunks(
  matches: ChunkMatch[],
  maxChunks: number = 10
): TextChunk[] {
  // Aggregate scores for each mandate chunk
  const chunkScores = new Map<string, { chunk: TextChunk; totalScore: number }>();
  
  for (const match of matches) {
    const existing = chunkScores.get(match.mandateChunk.id);
    if (existing) {
      existing.totalScore += match.score;
    } else {
      chunkScores.set(match.mandateChunk.id, {
        chunk: match.mandateChunk,
        totalScore: match.score,
      });
    }
  }

  // Sort by total score and return top chunks
  return Array.from(chunkScores.values())
    .sort((a, b) => b.totalScore - a.totalScore)
    .slice(0, maxChunks)
    .map((entry) => entry.chunk);
}

// ─────────────────────────────────────────────────────────────────────────────
// RAG Evaluation Input Builder
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Build the RAG evaluation input payload from proposal and mandate text.
 * Returns matched chunks instead of full raw text.
 */
export function buildRAGEvaluationInput(
  proposalText: string,
  mandateText: string,
  maxChunkSize: number = DEFAULT_CHUNK_SIZE
): RAGEvaluationInput {
  // Split texts into chunks
  const proposalChunks = splitIntoChunks(proposalText, "proposal", maxChunkSize);
  const mandateChunks = splitIntoChunks(mandateText, "mandate", maxChunkSize);

  // Handle case where mandate text is empty
  if (mandateChunks.length === 0) {
    return {
      proposalSummary: proposalText.substring(0, 2000),
      topMandateSections: [],
      matchedPairs: [],
      matchedSectionsCount: 0,
      topMandateSectionsPreview: "No mandate template content available.",
    };
  }

  // Match proposal chunks to mandate chunks
  const matches = matchChunks(proposalChunks, mandateChunks);
  
  // Get unique top mandate sections
  const topMandateChunks = getTopMandateChunks(matches, 5);

  // Build matched pairs for detailed context
  const matchedPairs: MatchedPair[] = matches
    .sort((a, b) => b.score - a.score)
    .slice(0, 15) // Top 15 matches
    .map((match) => ({
      proposalChunkId: match.proposalChunk.id,
      mandateChunkId: match.mandateChunk.id,
      score: Math.round(match.score * 100) / 100,
      proposalExcerpt: match.proposalChunk.text.substring(0, 200),
      mandateExcerpt: match.mandateChunk.text.substring(0, 200),
    }));

  // Build proposal summary from all chunks (truncated)
  const proposalSummary = proposalChunks
    .map((c) => c.text)
    .join("\n\n")
    .substring(0, 3000);

  // Build top mandate sections preview
  const topMandateSections = topMandateChunks.map((c) => c.text);
  const topMandateSectionsPreview = topMandateSections
    .map((text, i) => `[Section ${i + 1}]\n${text}`)
    .join("\n\n")
    .substring(0, 500) + (topMandateSections.join("").length > 500 ? "..." : "");

  return {
    proposalSummary,
    topMandateSections,
    matchedPairs,
    matchedSectionsCount: topMandateChunks.length,
    topMandateSectionsPreview,
  };
}

/**
 * Format RAG input for LLM prompt.
 * Returns formatted mandate text using only relevant sections.
 */
export function formatRAGMandateText(ragInput: RAGEvaluationInput): string {
  if (ragInput.topMandateSections.length === 0) {
    return "No mandate template content available.";
  }

  const sections = ragInput.topMandateSections
    .map((section, i) => `[Relevant Mandate Section ${i + 1}]\n${section}`)
    .join("\n\n---\n\n");

  return `The following mandate sections were identified as most relevant to the proposal:\n\n${sections}`;
}
