import "server-only";

// Document Extraction Client
//
// Abstraction layer for document text extraction.
// Uses Python extractor service when available (better extraction quality).
// Falls back to Node.js extraction for DOCX only. PDF fallback is disabled
// because pdf-parse can use browser-only APIs (DOMMatrix) in some bundling contexts.

import fs from "fs/promises";
import path from "path";
import { downloadBlob, getDefaultContainer } from "@/lib/storage/azureBlob";
import { extractDocxText } from "@/lib/textExtractor";
import { extractDocumentViaPython } from "./pythonExtractionClient";

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

// File extensions that should use Python extraction first (covers edge cases where MIME type may differ)
const PYTHON_FIRST_EXTENSIONS = [".pdf", ".docx"];

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

async function extractTextFromBuffer(
  buffer: Buffer,
  fileType: string,
  displayName: string,
  extension: string,
  warnings: string[]
): Promise<ExtractionResult> {
  const isDocx =
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx";

  try {
    let text: string;

    if (SUPPORTED_TEXT_TYPES.includes(fileType)) {
      text = buffer.toString("utf-8");
    } else if (isDocx) {
      console.log(`[extractDocumentFromBlob] Buffer extraction for DOCX ${displayName}`);
      try {
        text = await extractDocxText(buffer);
        console.log(`[extractDocumentFromBlob] Buffer extraction succeeded for ${displayName} (${text.length} chars)`);
      } catch (docxError) {
        const docxErrorMessage = docxError instanceof Error ? docxError.message : "Unknown DOCX error";
        console.error(`[extractDocumentFromBlob] Buffer extraction failed for ${displayName}:`, docxError);
        warnings.push(`Extraction failed for ${displayName}: ${docxErrorMessage}`);
        return {
          text: "",
          warnings,
          charactersProcessed: 0,
        };
      }
    } else {
      warnings.push(`No extraction handler for file type ${fileType} (${displayName})`);
      return {
        text: "",
        warnings,
        charactersProcessed: 0,
      };
    }

    return {
      text,
      warnings,
      charactersProcessed: text.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractDocumentFromBlob] Buffer extraction error:", error);
    warnings.push(`Extraction failed for ${displayName}: ${errorMessage}`);
    return {
      text: "",
      warnings,
      charactersProcessed: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Document Extraction
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Determines if a file should use Python extraction first based on extension.
 * This supplements MIME type checking for more robust handling.
 */
function shouldUsePythonExtraction(fileType: string, fileName: string | undefined): boolean {
  // Check MIME type first
  if (SUPPORTED_BINARY_TYPES.includes(fileType)) {
    return true;
  }

  // Also check file extension as fallback (handles cases where MIME type differs)
  if (fileName) {
    const extension = extractExtension(fileName);
    if (PYTHON_FIRST_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts text from a document stored in Azure Blob Storage.
 *
 * Uses Python extractor service when available for better extraction quality.
 * Falls back to Node.js extraction if Python service is unavailable:
 * - PDF: pdf-parse
 * - DOCX: mammoth
 * - TXT/CSV: UTF-8 decode
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
  const extension = extractExtension(displayName);

  // Excel files: store normally but extraction not implemented - do not crash
  const EXCEL_EXTENSIONS = [".xls", ".xlsx"];
  const EXCEL_MIME_TYPES = [
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];
  const isExcel =
    EXCEL_EXTENSIONS.includes(extension) || EXCEL_MIME_TYPES.includes(fileType);
  if (isExcel) {
    return {
      text: "",
      warnings: ["Excel file uploaded successfully, but content extraction is not implemented yet."],
      charactersProcessed: 0,
    };
  }

  // Local uploads stored under public/ (see POST /api/proposals/[id]/documents)
  let preloadedBuffer: Buffer | null = null;
  if (blobPath.startsWith("/uploads/")) {
    const rel = blobPath.replace(/^\//, "");
    const absPath = path.join(process.cwd(), "public", rel);
    try {
      preloadedBuffer = await fs.readFile(absPath);
      console.log(
        `[extractDocumentFromBlob] Loaded local public file ${absPath} (${preloadedBuffer.length} bytes)`
      );
    } catch (err) {
      console.warn(`[extractDocumentFromBlob] Could not read local file ${absPath}:`, err);
    }
  }

  const isPdf = fileType === "application/pdf" || extension === ".pdf";
  if (preloadedBuffer) {
    if (isPdf) {
      console.log(
        `[extractDocumentFromBlob] Local PDF ${displayName}: Python/Azure path required for PDF text (local buffer not sent to extractor)`
      );
      return {
        text: "",
        warnings: [
          "PDF text extraction could not be completed. Use the Python extractor service (pdfplumber) for PDF extraction.",
        ],
        charactersProcessed: 0,
      };
    }
    return extractTextFromBuffer(preloadedBuffer, fileType, displayName, extension, warnings);
  }

  // Validate file type is supported (check both MIME type and extension)
  if (!isFileTypeSupported(fileType) && !PYTHON_FIRST_EXTENSIONS.includes(extension)) {
    return {
      text: "",
      warnings: [`Unsupported file type: ${fileType} for ${displayName}`],
      charactersProcessed: 0,
    };
  }

  const container = getDefaultContainer();
  const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING || "";

  // Try Python extractor first for PDF and DOCX files (check both MIME type and extension)
  const usePythonFirst = shouldUsePythonExtraction(fileType, fileName || displayName);

  if (usePythonFirst) {
    console.log(`[extractDocumentFromBlob] Python extraction attempted for ${displayName}`);
    console.log(`[extractDocumentFromBlob] fileType=${fileType}, extension=${extension}, hasConnectionString=${!!connectionString}`);

    if (!connectionString) {
      const reason = "AZURE_STORAGE_CONNECTION_STRING not set";
      console.log(`[extractDocumentFromBlob] Python extraction skipped for ${displayName}, reason: ${reason}`);
      warnings.push(isPdf ? "PDF extraction requires Python extractor (pdfplumber). Configure AZURE_STORAGE_CONNECTION_STRING and PYTHON_EXTRACTOR_URL." : `Extraction skipped for ${displayName}.`);
    } else if (!process.env.PYTHON_EXTRACTOR_URL) {
      const reason = "PYTHON_EXTRACTOR_URL not configured";
      console.log(`[extractDocumentFromBlob] Python extraction skipped for ${displayName}, reason: ${reason}`);
      warnings.push(isPdf ? "PDF extraction requires Python extractor (pdfplumber). Set PYTHON_EXTRACTOR_URL to your extractor service." : `Extraction skipped for ${displayName}.`);
    } else {
      console.log(`[extractDocumentFromBlob] Calling Python extractor for: ${displayName}`);

      const pythonResult = await extractDocumentViaPython({
        connectionString,
        container,
        blobPath,
        fileType,
      });

      if (pythonResult.success && pythonResult.text && pythonResult.text.length > 0) {
        console.log(
          `[extractDocumentFromBlob] Python extraction succeeded for ${displayName} (${pythonResult.charactersProcessed} chars)`
        );
        return {
          text: pythonResult.text,
          warnings,
          charactersProcessed: pythonResult.charactersProcessed,
        };
      }

      // Python extraction failed or returned empty - log and return clean warning (no Node.js PDF fallback - pdf-parse can use browser APIs)
      const reason = pythonResult.error || "empty/invalid response";
      console.log(`[extractDocumentFromBlob] Python extraction failed for ${displayName}, reason: ${reason}`);
      warnings.push(isPdf ? "PDF text extraction could not be completed. Ensure the Python extractor (pdfplumber) is running and accessible." : `Extraction failed for ${displayName}.`);
    }
  } else {
    console.log(
      `[extractDocumentFromBlob] Skipping Python extractor for non-binary type: ${fileType} (${displayName})`
    );
  }

  // Fallback: Download blob and use Node.js extraction (DOCX only; PDF uses Python only)
  const isDocx =
    fileType === "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    extension === ".docx";

  // PDF: Python extractor is the only supported path. Return clean warning (no pdf-parse - can trigger browser APIs).
  if (isPdf) {
    console.log(`[extractDocumentFromBlob] PDF ${displayName}: extraction requires Python extractor (pdfplumber)`);
    return {
      text: "",
      warnings: ["PDF text extraction could not be completed. Use the Python extractor service (pdfplumber) for PDF extraction."],
      charactersProcessed: 0,
    };
  }

  let buffer: Buffer;
  try {
    const result = await downloadBlob(container, blobPath);
    if (!result) {
      console.log(`[extractDocumentFromBlob] Fallback attempted for ${displayName} - could not download from storage`);
      console.log(`[extractDocumentFromBlob] Fallback failed for ${displayName}: could not download from storage`);
      warnings.push("Text extraction could not be completed for this file.");
      return {
        text: "",
        warnings,
        charactersProcessed: 0,
      };
    }
    buffer = result.buffer;
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractDocumentFromBlob] Download error:", error);
    console.log(`[extractDocumentFromBlob] Fallback failed for ${displayName}: ${errorMessage}`);
    warnings.push("Text extraction could not be completed for this file.");
    return {
      text: "",
      warnings,
      charactersProcessed: 0,
    };
  }

  // DOCX and plain text: use Node.js extraction (server-safe)
  try {
    let text: string;

    if (SUPPORTED_TEXT_TYPES.includes(fileType)) {
      text = buffer.toString("utf-8");
    } else if (isDocx) {
      console.log(`[extractDocumentFromBlob] Fallback attempted for DOCX ${displayName}`);
      try {
        text = await extractDocxText(buffer);
        console.log(`[extractDocumentFromBlob] Fallback extraction succeeded for ${displayName} (${text.length} chars)`);
      } catch (docxError) {
        const docxErrorMessage = docxError instanceof Error ? docxError.message : "Unknown DOCX error";
        console.error(`[extractDocumentFromBlob] Fallback failed for ${displayName}:`, docxError);
        warnings.push(`Fallback extraction failed for ${displayName}: ${docxErrorMessage}`);
        return {
          text: "",
          warnings,
          charactersProcessed: 0,
        };
      }
    } else {
      console.log(`[extractDocumentFromBlob] Fallback failed for ${displayName}: no extraction handler for file type ${fileType}`);
      warnings.push(`Fallback extraction failed for ${displayName}: no extraction handler for file type ${fileType}`);
      return {
        text: "",
        warnings,
        charactersProcessed: 0,
      };
    }

    return {
      text,
      warnings,
      charactersProcessed: text.length,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("[extractDocumentFromBlob] Extraction error:", error);
    console.log(`[extractDocumentFromBlob] Fallback failed for ${displayName}: ${errorMessage}`);
    warnings.push(`Fallback extraction failed for ${displayName}: ${errorMessage}`);
    return {
      text: "",
      warnings,
      charactersProcessed: 0,
    };
  }
}

/**
 * Checks if a file type is supported for extraction.
 * Checks both MIME type and can be supplemented with extension check.
 */
export function isFileTypeSupported(fileType: string, fileName?: string): boolean {
  if (SUPPORTED_TEXT_TYPES.includes(fileType) || SUPPORTED_BINARY_TYPES.includes(fileType)) {
    return true;
  }

  // Also check extension for PDF/DOCX files that may have unexpected MIME types
  if (fileName) {
    const extension = extractExtension(fileName);
    if (PYTHON_FIRST_EXTENSIONS.includes(extension)) {
      return true;
    }
  }

  return false;
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
