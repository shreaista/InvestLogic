import "server-only";

import { PDFDocument, StandardFonts, type PDFFont, rgb } from "pdf-lib";
import {
  buildCategoryBreakdowns,
  recommendationFromFit,
} from "@/lib/proposals/evaluationCategories";
import type { EvaluationReport } from "@/lib/evaluation/types";

const PAGE_W = 612;
const PAGE_H = 792;
const M = 56;
const CONTENT_W = PAGE_W - 2 * M;
const FOOTER_Y = 36;

export interface EvaluationReportPdfBuildArgs {
  proposalName: string;
  fundName: string;
  generatedAtIso: string;
  report: EvaluationReport | null;
  hasEvaluationInputs: boolean;
  extractionPreview: string | null;
}

function fmtDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return iso;
  }
}

function wrapLine(text: string, font: PDFFont, size: number, maxW: number): string[] {
  const t = text.replace(/\s+/g, " ").trim();
  if (!t) return [];
  const words = t.split(/\s+/);
  const lines: string[] = [];
  let cur = "";
  for (const w of words) {
    const test = cur ? `${cur} ${w}` : w;
    if (font.widthOfTextAtSize(test, size) <= maxW) {
      cur = test;
    } else {
      if (cur) lines.push(cur);
      cur = w;
    }
  }
  if (cur) lines.push(cur);
  return lines;
}

class PdfWriter {
  doc: PDFDocument;
  page: ReturnType<PDFDocument["addPage"]>;
  y: number;
  font: PDFFont;
  bold: PDFFont;
  size = 10;
  titleSize = 11;

  constructor(doc: PDFDocument, font: PDFFont, bold: PDFFont) {
    this.doc = doc;
    this.font = font;
    this.bold = bold;
    this.page = doc.addPage([PAGE_W, PAGE_H]);
    this.y = PAGE_H - M;
  }

  ensureSpace(lines: number, lineH: number) {
    const need = lines * lineH + M;
    if (this.y < need) {
      this.page = this.doc.addPage([PAGE_W, PAGE_H]);
      this.y = PAGE_H - M;
    }
  }

  heading(text: string, lineH = 16) {
    this.ensureSpace(2, lineH);
    this.y -= 6;
    this.page.drawText(text, {
      x: M,
      y: this.y,
      size: this.titleSize,
      font: this.bold,
      color: rgb(0.12, 0.16, 0.22),
    });
    this.y -= lineH + 4;
  }

  body(text: string, lineH = 13) {
    const lines = wrapLine(text, this.font, this.size, CONTENT_W);
    this.ensureSpace(lines.length + 1, lineH);
    for (const line of lines) {
      this.page.drawText(line, {
        x: M,
        y: this.y,
        size: this.size,
        font: this.font,
        color: rgb(0.2, 0.22, 0.26),
      });
      this.y -= lineH;
    }
  }

  bullets(items: string[], lineH = 13) {
    for (const raw of items) {
      const t = raw.replace(/\s+/g, " ").trim();
      if (!t) continue;
      const lines = wrapLine(`• ${t}`, this.font, this.size, CONTENT_W - 12);
      this.ensureSpace(lines.length + 1, lineH);
      for (const line of lines) {
        this.page.drawText(line, {
          x: M,
          y: this.y,
          size: this.size,
          font: this.font,
          color: rgb(0.2, 0.22, 0.26),
        });
        this.y -= lineH;
      }
    }
  }

  kv(label: string, value: string, lineH = 14) {
    this.ensureSpace(2, lineH);
    const combined = `${label}: ${value}`;
    const lines = wrapLine(combined, this.font, this.size, CONTENT_W);
    for (const line of lines) {
      this.page.drawText(line, {
        x: M,
        y: this.y,
        size: this.size,
        font: this.font,
        color: rgb(0.2, 0.22, 0.26),
      });
      this.y -= lineH;
    }
  }

  spacer(h = 8) {
    this.y -= h;
  }
}

const CATEGORY_DISPLAY: { id: string; pdfLabel: string }[] = [
  { id: "market", pdfLabel: "Market Opportunity" },
  { id: "product", pdfLabel: "Product Differentiation" },
  { id: "financials", pdfLabel: "Financial Health" },
  { id: "team", pdfLabel: "Team Strength" },
  { id: "risk", pdfLabel: "Risk Factors" },
];

function categoryRows(args: EvaluationReportPdfBuildArgs): { label: string; scoreText: string }[] {
  const r = args.report;
  if (!r || !args.hasEvaluationInputs || !r.structuredScores) {
    return CATEGORY_DISPLAY.map((c) => ({ label: c.pdfLabel, scoreText: "—" }));
  }
  const rows = buildCategoryBreakdowns(
    r.fitScore,
    true,
    r.structuredScores,
    r.strengths ?? [],
    r.risks ?? []
  );
  const byId = new Map(rows.map((x) => [x.id, x]));
  return CATEGORY_DISPLAY.map((c) => {
    const row = byId.get(c.id);
    return {
      label: c.pdfLabel,
      scoreText: row != null ? `${row.score}` : "—",
    };
  });
}

function recommendationText(report: EvaluationReport | null, hasInputs: boolean): string {
  if (!report || !hasInputs || report.fitScore == null) {
    return "Not available — run evaluation with documents and mandate loaded.";
  }
  return recommendationFromFit(report.fitScore, hasInputs);
}

function riskLevelLabel(report: EvaluationReport | null, hasInputs: boolean): string {
  if (!report || !hasInputs || report.fitScore == null) return "—";
  if (report.fitScore < 45) return "High";
  if (report.fitScore < 72) return "Medium";
  return "Low";
}

function keyInsights(report: EvaluationReport | null): string[] {
  if (!report) return [];
  const s = (report.strengths ?? []).filter((x) => x.trim() && x !== "—");
  const k = (report.risks ?? []).filter((x) => x.trim() && x !== "—");
  const out: string[] = [];
  for (const x of s) {
    if (out.length >= 5) break;
    out.push(x);
  }
  for (const x of k) {
    if (out.length >= 5) break;
    out.push(x);
  }
  return out.slice(0, 5);
}

function aiRecommendationLines(report: EvaluationReport | null): string[] {
  if (!report) return ["Not available."];
  const rec = (report.recommendations ?? []).filter((x) => x.trim() && x !== "—");
  if (rec.length > 0) return rec.slice(0, 3);
  const sum = report.proposalSummary?.replace(/\s+/g, " ").trim();
  if (sum && sum !== "—") {
    const one = sum.length > 320 ? `${sum.slice(0, 317)}…` : sum;
    return [one];
  }
  return ["Not available."];
}

export async function generateEvaluationReportPdf(args: EvaluationReportPdfBuildArgs): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);
  const w = new PdfWriter(doc, font, bold);

  const report = args.report;
  const hasIn = args.hasEvaluationInputs;
  const scoreText =
    report?.fitScore != null && hasIn ? `${report.fitScore}` : "—";
  const recLabel = recommendationText(report, hasIn);
  const conf =
    report?.confidence != null ? report.confidence.charAt(0).toUpperCase() + report.confidence.slice(1) : "—";
  const execPara =
    report?.proposalSummary?.trim() && report.proposalSummary !== "—"
      ? report.proposalSummary.replace(/\s+/g, " ").trim()
      : "No executive summary available. Run an evaluation after documents and mandate are loaded.";

  // ── Cover
  w.y = PAGE_H - M - 40;
  w.page.drawText(args.proposalName || "Proposal", {
    x: M,
    y: w.y,
    size: 22,
    font: bold,
    color: rgb(0.08, 0.1, 0.14),
  });
  w.y -= 36;
  w.page.drawText(args.fundName?.trim() ? `Fund: ${args.fundName}` : "Fund: —", {
    x: M,
    y: w.y,
    size: 12,
    font,
    color: rgb(0.25, 0.28, 0.32),
  });
  w.y -= 22;
  w.page.drawText(`Date: ${fmtDate(args.generatedAtIso)}`, {
    x: M,
    y: w.y,
    size: 11,
    font,
    color: rgb(0.35, 0.38, 0.42),
  });
  w.y -= 48;
    w.page.drawText("Prepared by InvestLogic", {
    x: M,
    y: w.y,
    size: 10,
    font,
    color: rgb(0.45, 0.48, 0.52),
  });
  // ── Executive summary (new page)
  w.page = doc.addPage([PAGE_W, PAGE_H]);
  w.y = PAGE_H - M;
  w.heading("Executive Summary");
  w.kv("Investment Score (0–100)", scoreText === "—" ? "—" : `${scoreText}/100`);
  w.spacer(4);
  w.kv("Recommendation", recLabel);
  w.spacer(4);
  w.kv("Confidence", conf);
  w.spacer(4);
  w.kv("Risk level", riskLevelLabel(report, hasIn));
  w.spacer(8);
  w.body(execPara);

  // ── Key insights
  w.heading("Key Insights");
  const insights = keyInsights(report);
  if (insights.length === 0) {
    w.body("No insights available yet.");
  } else {
    w.bullets(insights);
  }

  // ── Detailed scoring
  w.heading("Detailed Scoring");
  const cats = categoryRows(args);
  for (const row of cats) {
    w.kv(row.label, row.scoreText === "—" ? "—" : `${row.scoreText}/100`);
    w.spacer(2);
  }

  // ── Risks & gaps
  w.heading("Risks & Gaps");
  const risks = (report?.risks ?? []).filter((x) => x.trim() && x !== "—");
  if (risks.length === 0) {
    w.body("No risk items recorded. Run evaluation or review extracted documents.");
  } else {
    w.bullets(risks.slice(0, 12));
  }

  // ── AI recommendation
  w.heading("AI Recommendation");
  for (const line of aiRecommendationLines(report)) {
    w.body(line);
    w.spacer(4);
  }

  // ── Appendix
  w.heading("Appendix: Extracted Data Highlights");
  const app = args.extractionPreview?.replace(/\s+/g, " ").trim();
  if (!app) {
    w.body("No extraction preview on file.");
  } else {
    const clipped = app.length > 4500 ? `${app.slice(0, 4497)}…` : app;
    w.body(clipped);
  }

  const pages = doc.getPages();
  const total = pages.length;
  for (let i = 0; i < total; i++) {
    const p = pages[i];
    p.drawText("InvestLogic · Confidential", {
      x: M,
      y: FOOTER_Y,
      size: 8,
      font,
      color: rgb(0.55, 0.55, 0.58),
    });
    p.drawText(`Page ${i + 1} of ${total}`, {
      x: PAGE_W - M - 72,
      y: FOOTER_Y,
      size: 8,
      font,
      color: rgb(0.55, 0.55, 0.58),
    });
  }

  return doc.save();
}
