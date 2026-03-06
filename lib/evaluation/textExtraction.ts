import "server-only";

// Text Extraction Helper for Proposal Evaluation
//
// This module coordinates document extraction for evaluation.
// Uses the documentExtractionClient abstraction for actual extraction.
// Uses inputPreparation for smart prioritization and truncation.

import { MAX_TOTAL_CHARS } from "./types";
import {
  extractDocumentsFromBlobs,
  type BatchExtractionInput,
} from "@/lib/extraction/documentExtractionClient";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface DocumentTextResult {
  filename: string;
  blobPath: string;
  text: string;
  uploadedAt: string;
  isPlaceholder: boolean;
  warning?: string;
}

export interface DocumentProcessingStats {
  processedDocumentsCount: number;
  truncatedDocumentsCount: number;
  skippedDocumentsCount: number;
}

export interface ExtractedContent {
  mandateText: string;
  proposalText: string;
  totalCharacters: number;
  extractionWarnings: string[];
  documentStats: DocumentProcessingStats;
}

// ─────────────────────────────────────────────────────────────────────────────
// Text Extraction (using documentExtractionClient)
// ─────────────────────────────────────────────────────────────────────────────

// Convert BlobInfo to BatchExtractionInput
function toBatchInput(blob: BlobInfo): BatchExtractionInput {
  return {
    fileName: blob.filename,
    blobPath: blob.blobPath,
    contentType: blob.contentType,
    uploadedAt: blob.uploadedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Extraction Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface BlobInfo {
  blobPath: string;
  contentType: string;
  filename: string;
  uploadedAt: string;
}

// Extract text from all blobs using the extraction client
// Truncation is handled by inputPreparation
export async function extractTextFromBlobs(
  blobs: BlobInfo[]
): Promise<{ results: DocumentTextResult[]; warnings: string[] }> {
  const inputs = blobs.map(toBatchInput);
  const batchResults = await extractDocumentsFromBlobs(inputs);

  const results: DocumentTextResult[] = batchResults.map((r) => ({
    filename: r.fileName,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warnings.length > 0 ? r.warnings.join("; ") : undefined,
  }));

  const warnings = batchResults.flatMap((r) => r.warnings);

  return { results, warnings };
}

// Extract content from mandate templates and proposal documents
// Uses documentExtractionClient for extraction
// Uses inputPreparation for smart prioritization and truncation
export async function extractContentForEvaluation(
  mandateBlobs: BlobInfo[],
  proposalBlobs: BlobInfo[]
): Promise<ExtractedContent> {
  // Import inputPreparation dynamically to avoid circular deps
  const { prepareEvaluationInputs } = await import("./inputPreparation");

  // Extract raw text from all blobs using extraction client
  const mandateExtraction = await extractTextFromBlobs(mandateBlobs);
  const proposalExtraction = await extractTextFromBlobs(proposalBlobs);

  // Convert DocumentTextResult to DocumentInput format for inputPreparation
  const mandateDocs = mandateExtraction.results.map((r) => ({
    filename: r.filename,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warning,
  }));

  const proposalDocs = proposalExtraction.results.map((r) => ({
    filename: r.filename,
    blobPath: r.blobPath,
    text: r.text,
    uploadedAt: r.uploadedAt,
    isPlaceholder: r.isPlaceholder,
    warning: r.warning,
  }));

  // Use inputPreparation for smart prioritization and truncation
  const prepared = prepareEvaluationInputs(mandateDocs, proposalDocs, MAX_TOTAL_CHARS);

  return {
    mandateText: prepared.mandateInput.combinedText,
    proposalText: prepared.proposalInput.combinedText,
    totalCharacters:
      prepared.mandateInput.combinedText.length +
      prepared.proposalInput.combinedText.length,
    extractionWarnings: prepared.allWarnings,
    documentStats: prepared.totalStats,
  };
}
