import "server-only";

// Document Extraction Client
//
// Abstraction layer for document text extraction.
// Currently uses local Node.js extraction helpers.
// Structured to support future Python service integration.

import { downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import { extractDocxText, extractPdfText } from "@/lib/textExtractor";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface ExtractionInputMetadata {
  fileName: string;
  blobPath: string;
  extension: string;
  sizeBytes: number;
  contentType: string;
  uploadedAt: string;
}

export interface ExtractionResult {
  text: string;
  warnings: string[];
  charactersProcessed: number;
}

export interface ExtractDocumentOptions {
  blobPath: string;
  fileType: string;
  fileName?: string;
}

// Supported file types for extraction
const SUPPORTED_TEXT_TYPES = ["text/plain", "text/csv"];
const SUPPORTED_BINARY_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

// ─────────────────────────────────────────────────────────────────────────────
// Extraction Input Metadata Helper
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Builds extraction input metadata from blob information.
 * This metadata can be used for logging, tracking, or passing to extraction services.
 */
export function buildExtractionInputMetadata(params: {
  fileName: string;
  blobPath: string;
  contentType: string;
  sizeBytes: number;
  uploadedAt: string;
}): ExtractionInputMetadata {
  const extension = extractExtension(params.fileName);
  
  return {
    fileName: params.fileName,
    blobPath: params.blobPath,
    extension,
    sizeBytes: params.sizeBytes,
    contentType: params.contentType,
    uploadedAt: params.uploadedAt,
  };
}

function extractExtension(fileName: string): string {
  if (!fileName) return "";
  const lastDot = fileName.lastIndexOf(".");
  if (lastDot === -1) return "";
  return fileName.substring(lastDot).toLowerCase();
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Extracts text from a document stored in Azure Blob Storage.
 * 
 * Currently uses local Node.js extraction:
 * - PDF: pdf-parse
 * - DOCX: mammoth
 * - TXT/CSV: UTF-8 decode
 * 
 * This function is structured to support future Python service integration:
 * - The interface remains stable
 * - Implementation can be swapped to call a Python extraction service
 * 
 * @param options - Extraction options including blobPath and fileType
 * @returns ExtractionResult with text, warnings, and character count
 */
export async function extractDocumentFromBlob(
  options: ExtractDocumentOptions
): Promise<ExtractionResult> {
  const { blobPath, fileType, fileName } = options;
  const displayName = fileName || blobPath.split("/").pop() || blobPath;
  const warnings: string[] = [];

  // Validate file type is supported
  if (!isFileTypeSupported(fileType)) {
    return {
      text: "",
      warnings: [`Unsupported file type: ${fileType} for ${displayName}`],
      charactersProcessed: 0,
    };
  }

  // Download blob from storage
  const container = getDefaultContainer();
  let buffer: Buffer;

  try {
    const result = await downloadBlob(container, blobPath);
    if (!result) {
      return {
        text: "",
        warnings: [`Failed to download ${displayName} from storage`],
        charactersProcessed: 0,
      };
    }
    buffer = result.buffer;
  } catch (error) {
    console.error("[extractDocumentFromBlob] Download error:", error);
    return {
      text: "",
      warnings: [`Error downloading ${displayName}: ${error instanceof Error ? error.message : "Unknown error"}`],
      charactersProcessed: 0,
    };
  }

  // Extract text based on file type
  try {
    let text: string;

    if (SUPPORTED_TEXT_TYPES.includes(fileType)) {
      // Plain text files
      text = buffer.toString("utf-8");
    } else if (fileType === "application/pdf") {
      // PDF extraction
      text = await extractPdfText(buffer);
    } else if (fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
      // DOCX extraction
      text = await extractDocxText(buffer);
    } else {
      return {
        text: "",
        warnings: [`No extraction handler for file type: ${fileType}`],
        charactersProcessed: 0,
      };
    }

    return {
      text,
      warnings,
      charactersProcessed: text.length,
    };
  } catch (error) {
    console.error("[extractDocumentFromBlob] Extraction error:", error);
    return {
      text: "",
      warnings: [`Error extracting text from ${displayName}: ${error instanceof Error ? error.message : "Unknown error"}`],
      charactersProcessed: 0,
    };
  }
}

/**
 * Checks if a file type is supported for extraction.
 */
export function isFileTypeSupported(fileType: string): boolean {
  return SUPPORTED_TEXT_TYPES.includes(fileType) || SUPPORTED_BINARY_TYPES.includes(fileType);
}

/**
 * Gets the list of supported file types for extraction.
 */
export function getSupportedFileTypes(): string[] {
  return [...SUPPORTED_TEXT_TYPES, ...SUPPORTED_BINARY_TYPES];
}

// ─────────────────────────────────────────────────────────────────────────────
// Batch Extraction
// ─────────────────────────────────────────────────────────────────────────────

export interface BatchExtractionInput {
  fileName: string;
  blobPath: string;
  contentType: string;
  uploadedAt: string;
}

export interface BatchExtractionResult {
  fileName: string;
  blobPath: string;
  text: string;
  uploadedAt: string;
  warnings: string[];
  charactersProcessed: number;
  isPlaceholder: boolean;
}

/**
 * Extracts text from multiple documents.
 * Preserves metadata for each document for use in input preparation.
 */
export async function extractDocumentsFromBlobs(
  inputs: BatchExtractionInput[]
): Promise<BatchExtractionResult[]> {
  const results: BatchExtractionResult[] = [];

  for (const input of inputs) {
    const extractionResult = await extractDocumentFromBlob({
      blobPath: input.blobPath,
      fileType: input.contentType,
      fileName: input.fileName,
    });

    const isPlaceholder = extractionResult.text.length === 0 && extractionResult.warnings.length > 0;

    results.push({
      fileName: input.fileName,
      blobPath: input.blobPath,
      text: extractionResult.text,
      uploadedAt: input.uploadedAt,
      warnings: extractionResult.warnings,
      charactersProcessed: extractionResult.charactersProcessed,
      isPlaceholder,
    });
  }

  return results;
}
