// API routes for Proposal Document management
// POST - Upload document (tenant_admin, saas_admin, assessor)
// GET - List documents (all roles with proposal access)
//
// URL: POST /api/proposals/:proposalId/documents — folder is [id]; route param is `id` (the proposal UUID).

import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import {
  getAuthzContext,
  requirePermission,
  canAccessProposal,
  jsonError,
  AuthzHttpError,
  UPLOAD_CREATE,
  PROPOSAL_READ,
  type Proposal,
} from "@/lib/authz";
import { requireActiveTenantId } from "@/lib/tenantContext";
import { getProposalForUser } from "@/lib/mock/proposals";
import {
  ALLOWED_CONTENT_TYPES,
  ALLOWED_EXTENSIONS,
  MAX_FILE_SIZE,
  UNSUPPORTED_FILE_ERROR,
} from "@/lib/storage/proposalDocuments";
import { logAudit } from "@/lib/audit";
import { getPostgresPool } from "@/lib/postgres";

const UPLOADED_BY_FALLBACK = "user_admin_001";

interface RouteContext {
  params: Promise<{ id: string }>; // proposal id from URL
}

// Helper to get proposal with tenant/access validation (PostgreSQL proposals or mock store)
async function getProposalWithAccess(
  tenantId: string,
  userId: string,
  role: string,
  proposalId: string
): Promise<Proposal & { name?: string; fund?: string }> {
  const pool = getPostgresPool();
  const client = await pool.connect();
  try {
    const pg = await client.query(
      `SELECT proposal_id, tenant_id, proposal_name
       FROM proposals
       WHERE proposal_id = $1 AND tenant_id = $2
       LIMIT 1`,
      [proposalId, tenantId]
    );
    if (pg.rows.length > 0) {
      const row = pg.rows[0];
      return {
        id: row.proposal_id,
        tenantId: row.tenant_id,
        name: row.proposal_name,
        fund: "",
      } as Proposal & { name?: string; fund?: string };
    }
  } finally {
    client.release();
  }

  const result = getProposalForUser({
    tenantId,
    userId,
    role,
    proposalId,
  });

  if (result.accessDenied) {
    throw new AuthzHttpError(403, "You do not have access to this proposal");
  }

  if (!result.proposal) {
    throw new AuthzHttpError(404, "Proposal not found");
  }

  return result.proposal as Proposal & { name?: string; fund?: string };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST - Upload Document
// ─────────────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Require active tenant context
    const tenantId = await requireActiveTenantId();

    // RBAC: tenant_admin, saas_admin, and assessor can upload documents
    if (ctx.role !== "tenant_admin" && ctx.role !== "saas_admin" && ctx.role !== "assessor") {
      throw new AuthzHttpError(403, "Only administrators and assessors can upload documents");
    }

    // Also require upload:create permission
    requirePermission(ctx, UPLOAD_CREATE);

    const { id: proposalId } = await context.params;

    await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      proposalId
    );

    const formData = await request.formData();
    const file = formData.get("file");

    if (!file || !(file instanceof File)) {
      throw new AuthzHttpError(400, "file is required");
    }

    const extension = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const isValidExtension = ALLOWED_EXTENSIONS.includes(extension);
    const isValidContentType = ALLOWED_CONTENT_TYPES.includes(file.type);

    if (!isValidExtension && !isValidContentType) {
      throw new AuthzHttpError(400, UNSUPPORTED_FILE_ERROR);
    }

    if (file.size > MAX_FILE_SIZE) {
      throw new AuthzHttpError(400, "File size exceeds 25MB limit");
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const fileName = path.basename(file.name?.trim() || "file");
    const proposalDocumentId = randomUUID();
    const savedFileName = `${proposalDocumentId}_${fileName}`;
    const uploadDir = path.join(process.cwd(), "public/uploads/proposals");
    const filePath = path.join(uploadDir, savedFileName);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    fs.writeFileSync(filePath, buffer);

    const storageUrl = `/uploads/proposals/${savedFileName}`;
    const fileType = file.type?.trim() || "application/octet-stream";

    const pool = getPostgresPool();
    const dbClient = await pool.connect();
    try {
      await dbClient.query(
        `INSERT INTO proposal_documents (
          proposal_document_id, tenant_id, proposal_id, file_name, file_type, file_size_bytes,
          storage_url, uploaded_by, uploaded_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          proposalDocumentId,
          tenantId,
          proposalId,
          fileName,
          fileType,
          file.size,
          storageUrl,
          ctx.user.id || UPLOADED_BY_FALLBACK,
        ]
      );
    } finally {
      dbClient.release();
    }

    logAudit({
      action: "proposal_document.upload",
      actorUserId: ctx.user.id || "",
      actorEmail: ctx.user.email,
      tenantId,
      resourceType: "proposal_document",
      resourceId: proposalId,
      details: {
        proposalDocumentId,
        filename: fileName,
        size: file.size,
        contentType: fileType,
        storageUrl,
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    return jsonError(error);
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET - List Documents
// ─────────────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const ctx = await getAuthzContext();

    if (!ctx.user) {
      return NextResponse.json(
        { ok: false, error: "Authentication required" },
        { status: 401 }
      );
    }

    // Require active tenant context
    const tenantId = await requireActiveTenantId();

    // Permission check: proposal:read for listing documents
    requirePermission(ctx, PROPOSAL_READ);

    const { id } = await context.params;

    // Get proposal and validate access
    const proposal = await getProposalWithAccess(
      tenantId,
      ctx.user.id || "",
      ctx.role,
      id
    );

    // If role is assessor, must also pass canAccessProposal
    if (ctx.role === "assessor" && !canAccessProposal(ctx, proposal)) {
      throw new AuthzHttpError(403, "Access denied to this proposal");
    }

    const pool = getPostgresPool();
    const dbClient = await pool.connect();
    let rows: Record<string, unknown>[] = [];
    try {
      const q = await dbClient.query(
        `SELECT
          proposal_document_id,
          proposal_id,
          file_name,
          file_type,
          file_size_bytes,
          storage_url,
          uploaded_at
         FROM proposal_documents
         WHERE proposal_id = $1 AND tenant_id = $2
         ORDER BY uploaded_at DESC`,
        [id, tenantId]
      );
      rows = q.rows;
    } finally {
      dbClient.release();
    }

    const flat = rows.map((row) => {
      const uploadedRaw = row.uploaded_at;
      const uploadedAt =
        uploadedRaw instanceof Date
          ? uploadedRaw.toISOString()
          : typeof uploadedRaw === "string"
            ? uploadedRaw
            : new Date().toISOString();
      const name = String(row.file_name ?? "");
      const storageUrl = String(row.storage_url ?? "");
      const size = Number(row.file_size_bytes ?? 0);
      const contentType = String(row.file_type ?? "application/octet-stream");

      return {
        proposal_document_id: String(row.proposal_document_id ?? ""),
        proposal_id: String(row.proposal_id ?? ""),
        file_name: name,
        file_type: contentType,
        file_size_bytes: size,
        storage_url: storageUrl,
        uploaded_at: uploadedAt,
        blobPath: storageUrl,
        filename: name,
        size,
        contentType,
        uploadedAt,
        timestamp: uploadedAt,
      };
    });

    return NextResponse.json({
      ok: true,
      data: {
        grouped: [],
        flat,
        count: flat.length,
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}

