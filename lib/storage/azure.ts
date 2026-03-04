import "server-only";

import {
  BlobServiceClient,
  ContainerClient,
} from "@azure/storage-blob";

/**
 * Azure Blob Storage Helper for Fund Mandate Templates
 *
 * Blobs are NOT public - access is controlled via the application.
 *
 * Path structure:
 *   tenants/<tenantId>/fund-mandates/<mandateKey>/<YYYYMMDD-HHMMSS>/<filename>
 *
 * Environment variables:
 *   AZURE_STORAGE_CONNECTION_STRING - Connection string for Azure Storage
 *   AZURE_STORAGE_CONTAINER - Container name (e.g., "ipa-private")
 */

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface UploadFundMandateParams {
  tenantId: string;
  mandateKey: string;
  filename: string;
  contentType: string;
  buffer: Buffer;
}

export interface UploadFundMandateResult {
  blobName: string;
  size: number;
  uploadedAt: string;
}

export interface FundMandateBlob {
  name: string;
  mandateKey: string;
  uploadedAt: string;
  blobName: string;
  size: number;
  contentType: string;
}

export interface ListFundMandatesParams {
  tenantId: string;
  mandateKey?: string;
}

export interface DownloadResult {
  buffer: Buffer;
  contentType: string;
  filename: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Fallback (when Azure not configured)
// ─────────────────────────────────────────────────────────────────────────────

interface InMemoryBlob {
  buffer: Buffer;
  contentType: string;
  uploadedAt: string;
  size: number;
}

const inMemoryStore = new Map<string, InMemoryBlob>();

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

function isAzureConfigured(): boolean {
  return !!(
    process.env.AZURE_STORAGE_CONNECTION_STRING &&
    process.env.AZURE_STORAGE_CONTAINER
  );
}

function getContainerName(): string {
  return process.env.AZURE_STORAGE_CONTAINER || "ipa-private";
}

// ─────────────────────────────────────────────────────────────────────────────
// Container Client
// ─────────────────────────────────────────────────────────────────────────────

let containerClientInstance: ContainerClient | null = null;

export function getContainerClient(): ContainerClient | null {
  if (!isAzureConfigured()) {
    return null;
  }

  if (containerClientInstance) {
    return containerClientInstance;
  }

  try {
    const connectionString = process.env.AZURE_STORAGE_CONNECTION_STRING!;
    const containerName = getContainerName();
    const blobServiceClient =
      BlobServiceClient.fromConnectionString(connectionString);
    containerClientInstance = blobServiceClient.getContainerClient(containerName);
    return containerClientInstance;
  } catch (error) {
    console.error("[azure] Failed to create container client:", error);
    return null;
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Timestamp Utilities
// ─────────────────────────────────────────────────────────────────────────────

function generateTimestamp(): string {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, "0");
  const day = String(now.getUTCDate()).padStart(2, "0");
  const hours = String(now.getUTCHours()).padStart(2, "0");
  const minutes = String(now.getUTCMinutes()).padStart(2, "0");
  const seconds = String(now.getUTCSeconds()).padStart(2, "0");
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function parseTimestampFromPath(blobName: string): Date | null {
  const match = blobName.match(/(\d{8}-\d{6})/);
  if (!match) return null;

  const ts = match[1];
  const year = parseInt(ts.substring(0, 4));
  const month = parseInt(ts.substring(4, 6)) - 1;
  const day = parseInt(ts.substring(6, 8));
  const hours = parseInt(ts.substring(9, 11));
  const minutes = parseInt(ts.substring(11, 13));
  const seconds = parseInt(ts.substring(13, 15));

  return new Date(Date.UTC(year, month, day, hours, minutes, seconds));
}

function sanitizeFilename(filename: string): string {
  return filename.replace(/[^a-zA-Z0-9._-]/g, "_");
}

// ─────────────────────────────────────────────────────────────────────────────
// Path Building
// ─────────────────────────────────────────────────────────────────────────────

function buildBlobPath(
  tenantId: string,
  mandateKey: string,
  filename: string
): string {
  const timestamp = generateTimestamp();
  const sanitized = sanitizeFilename(filename);
  return `tenants/${tenantId}/fund-mandates/${mandateKey}/${timestamp}/${sanitized}`;
}

function getPrefix(tenantId: string, mandateKey?: string): string {
  if (mandateKey) {
    return `tenants/${tenantId}/fund-mandates/${mandateKey}/`;
  }
  return `tenants/${tenantId}/fund-mandates/`;
}

function extractMandateKeyFromPath(blobName: string): string {
  const parts = blobName.split("/");
  if (parts.length >= 4) {
    return parts[3];
  }
  return "";
}

function extractFilenameFromPath(blobName: string): string {
  const parts = blobName.split("/");
  return parts[parts.length - 1] || blobName;
}

// ─────────────────────────────────────────────────────────────────────────────
// Upload Fund Mandate
// ─────────────────────────────────────────────────────────────────────────────

export async function uploadFundMandate(
  params: UploadFundMandateParams
): Promise<UploadFundMandateResult> {
  const { tenantId, mandateKey, filename, contentType, buffer } = params;
  const blobName = buildBlobPath(tenantId, mandateKey, filename);
  const uploadedAt = new Date().toISOString();

  const containerClient = getContainerClient();

  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.upload(buffer, buffer.length, {
        blobHTTPHeaders: { blobContentType: contentType },
      });

      return {
        blobName,
        size: buffer.length,
        uploadedAt,
      };
    } catch (error) {
      console.error("[azure] Upload failed, falling back to in-memory:", error);
    }
  }

  inMemoryStore.set(blobName, {
    buffer,
    contentType,
    uploadedAt,
    size: buffer.length,
  });

  return {
    blobName,
    size: buffer.length,
    uploadedAt,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// List Fund Mandates
// ─────────────────────────────────────────────────────────────────────────────

export async function listFundMandates(
  params: ListFundMandatesParams
): Promise<FundMandateBlob[]> {
  const { tenantId, mandateKey } = params;
  const prefix = getPrefix(tenantId, mandateKey);

  const containerClient = getContainerClient();
  const blobs: FundMandateBlob[] = [];

  if (containerClient) {
    try {
      for await (const blob of containerClient.listBlobsFlat({ prefix })) {
        const ts = parseTimestampFromPath(blob.name);

        blobs.push({
          name: extractFilenameFromPath(blob.name),
          mandateKey: extractMandateKeyFromPath(blob.name),
          uploadedAt: ts?.toISOString() || blob.properties.lastModified?.toISOString() || "",
          blobName: blob.name,
          size: blob.properties.contentLength || 0,
          contentType: blob.properties.contentType || "application/octet-stream",
        });
      }

      return sortBlobsNewestFirst(blobs);
    } catch (error) {
      console.error("[azure] List failed, falling back to in-memory:", error);
    }
  }

  for (const [blobName, data] of inMemoryStore.entries()) {
    if (blobName.startsWith(prefix)) {
      blobs.push({
        name: extractFilenameFromPath(blobName),
        mandateKey: extractMandateKeyFromPath(blobName),
        uploadedAt: data.uploadedAt,
        blobName,
        size: data.size,
        contentType: data.contentType,
      });
    }
  }

  return sortBlobsNewestFirst(blobs);
}

function sortBlobsNewestFirst(blobs: FundMandateBlob[]): FundMandateBlob[] {
  return blobs.sort((a, b) => {
    const dateA = new Date(a.uploadedAt).getTime();
    const dateB = new Date(b.uploadedAt).getTime();
    return dateB - dateA;
  });
}

// ─────────────────────────────────────────────────────────────────────────────
// Download Fund Mandate
// ─────────────────────────────────────────────────────────────────────────────

export async function getFundMandateDownload(params: {
  tenantId: string;
  blobName: string;
}): Promise<DownloadResult | null> {
  const { tenantId, blobName } = params;

  if (!blobName.startsWith(`tenants/${tenantId}/fund-mandates/`)) {
    return null;
  }

  const containerClient = getContainerClient();

  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      const response = await blockBlobClient.download(0);

      const chunks: Buffer[] = [];
      if (response.readableStreamBody) {
        for await (const chunk of response.readableStreamBody) {
          chunks.push(Buffer.from(chunk));
        }
      }

      return {
        buffer: Buffer.concat(chunks),
        contentType: response.contentType || "application/octet-stream",
        filename: extractFilenameFromPath(blobName),
      };
    } catch (error) {
      console.error("[azure] Download failed, falling back to in-memory:", error);
    }
  }

  const data = inMemoryStore.get(blobName);
  if (!data) {
    return null;
  }

  return {
    buffer: data.buffer,
    contentType: data.contentType,
    filename: extractFilenameFromPath(blobName),
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Delete Fund Mandate
// ─────────────────────────────────────────────────────────────────────────────

export async function deleteFundMandate(params: {
  tenantId: string;
  blobName: string;
}): Promise<boolean> {
  const { tenantId, blobName } = params;

  if (!blobName.startsWith(`tenants/${tenantId}/fund-mandates/`)) {
    return false;
  }

  const containerClient = getContainerClient();

  if (containerClient) {
    try {
      const blockBlobClient = containerClient.getBlockBlobClient(blobName);
      await blockBlobClient.delete();
      return true;
    } catch (error) {
      console.error("[azure] Delete failed, falling back to in-memory:", error);
    }
  }

  return inMemoryStore.delete(blobName);
}
