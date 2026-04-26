import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "crypto";
import fs from "fs";
import path from "path";
import { getPostgresPool } from "@/lib/postgres";
import { requireSession, requireUserRole, jsonError } from "@/lib/authz";

const FALLBACK_TENANT_ID = "tenant_ipa_001";

/**
 * GET /api/mandates?fund_id=xxx
 * List mandates for a fund.
 */
export async function GET(request: NextRequest) {
  try {
    const user = await requireSession();
    const fundId = request.nextUrl.searchParams.get("fund_id");
    if (!fundId) {
      return NextResponse.json(
        { ok: false, error: "fund_id is required" },
        { status: 400 }
      );
    }

    // Match session tenant resolution (cookie or JWT payload) — not cookie-only ipa_tenant,
    // so list stays aligned with the fund the Mandates page loaded.
    const tenantId = user.tenantId ?? FALLBACK_TENANT_ID;

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      const fundCheck = await client.query(
        `SELECT 1 FROM funds WHERE fund_id = $1 AND tenant_id = $2 LIMIT 1`,
        [fundId, tenantId]
      );
      if (fundCheck.rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Fund not found" }, { status: 404 });
      }

      const result = await client.query(
        `SELECT mandate_id, mandate_name, file_name, mandate_version, status, uploaded_at, storage_url, extracted_text
         FROM fund_mandates 
         WHERE fund_id = $1 AND tenant_id = $2
         ORDER BY uploaded_at DESC`,
        [fundId, tenantId]
      );

      const mandates = result.rows.map((row) => ({
        mandate_id: row.mandate_id,
        mandate_name: row.mandate_name,
        file_name: row.file_name,
        mandate_version: row.mandate_version,
        status: row.status,
        uploaded_at: row.uploaded_at,
        storage_url: row.storage_url,
        extracted_text: row.extracted_text,
      }));

      return NextResponse.json({ ok: true, mandates });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error("[Mandates API] GET Error:", error);
    return jsonError(error);
  }
}

/**
 * POST /api/mandates
 * Upload mandate metadata (file not stored yet, metadata only).
 * FormData: fund_id, file (PDF)
 */
export async function POST(request: NextRequest) {
  try {
    const user = await requireSession();
    requireUserRole(user, ["tenant_admin", "saas_admin", "fund_manager"]);
    const formData = await request.formData();
    const fundId = formData.get("fund_id");
    const file = formData.get("file");

    if (!fundId || typeof fundId !== "string") {
      return NextResponse.json(
        { ok: false, error: "fund_id is required" },
        { status: 400 }
      );
    }

    if (!file || !(file instanceof File)) {
      return NextResponse.json(
        { ok: false, error: "file is required" },
        { status: 400 }
      );
    }

    console.log("mandate upload started");
    console.log("file name", file.name);
    console.log("file size", file.size);

    const fileName = file.name?.trim() || "document.pdf";
    const isPdf =
      file.type === "application/pdf" ||
      fileName.toLowerCase().endsWith(".pdf");
    if (!isPdf) {
      return NextResponse.json(
        { ok: false, error: "Only PDF files are accepted" },
        { status: 400 }
      );
    }

    const mandateId = randomUUID();
    const tenantId = FALLBACK_TENANT_ID;
    const mandateName = fileName.replace(/\.pdf$/i, "") || fileName;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    console.log("buffer length", buffer.length);

    console.log("upload started");
    const uploadDir = path.join(process.cwd(), "public/uploads/mandates");
    console.log("uploadDir", uploadDir);
    const savedFileName = `${mandateId}_${file.name}`;
    console.log("savedFileName", savedFileName);
    const filePath = path.join(uploadDir, savedFileName);
    console.log("filePath", filePath);
    try {
      if (!fs.existsSync(uploadDir)) {
        fs.mkdirSync(uploadDir, { recursive: true });
      }
      console.log("before fs.writeFileSync");
      fs.writeFileSync(filePath, buffer);
      console.log("after fs.writeFileSync");
    } catch (err) {
      console.error("file save error", err);
      throw err;
    }
    const storageUrl = `/uploads/mandates/${savedFileName}`;

    let extractedText: string | null = null;
    try {
      const pdf2jsonMod = await import("pdf2json");
      const PDFParser = pdf2jsonMod.default ?? pdf2jsonMod;
      const combined = await new Promise<string>((resolve, reject) => {
        const pdfParser = new PDFParser(null, true);
        pdfParser.on("pdfParser_dataError", (errData) => {
          const err =
            errData &&
            typeof errData === "object" &&
            "parserError" in errData &&
            (errData as { parserError?: Error }).parserError
              ? (errData as { parserError: Error }).parserError
              : new Error(String(errData));
          reject(err);
        });
        pdfParser.on("pdfParser_dataReady", (pdfData) => {
          let text = pdfParser.getRawTextContent() ?? "";
          if (!text.trim() && pdfData?.Pages?.length) {
            const parts: string[] = [];
            for (const page of pdfData.Pages) {
              for (const t of page.Texts ?? []) {
                for (const run of t.R ?? []) {
                  if (run.T) {
                    try {
                      parts.push(decodeURIComponent(run.T));
                    } catch {
                      parts.push(run.T);
                    }
                  }
                }
              }
            }
            text = parts.join(" ");
          }
          resolve(text);
        });
        pdfParser.parseBuffer(buffer);
      });
      const trimmed = combined.trim();
      extractedText = trimmed === "" ? null : trimmed;
      console.log("extracted text length", extractedText?.length ?? 0);
      console.log("first 200 chars of extracted text", (extractedText ?? "").slice(0, 200));
    } catch (err) {
      console.error("extraction error", err);
    }

    const pool = getPostgresPool();
    const client = await pool.connect();
    try {
      const fundCheck = await client.query(
        `SELECT 1 FROM funds WHERE fund_id = $1 AND tenant_id = $2 LIMIT 1`,
        [fundId, tenantId]
      );
      if (fundCheck.rows.length === 0) {
        return NextResponse.json({ ok: false, error: "Fund not found" }, { status: 404 });
      }

      await client.query(
        `INSERT INTO fund_mandates (
          mandate_id, tenant_id, fund_id, mandate_name, mandate_version,
          status, file_name, file_type, extracted_text, storage_url, uploaded_at, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, 1, 'active', $5, 'pdf', $6, $7, NOW(), NOW(), NOW())`,
        [mandateId, tenantId, fundId, mandateName, fileName, extractedText, storageUrl]
      );
    } finally {
      client.release();
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[Mandates API] POST Error:", error);
    return jsonError(error);
  }
}
