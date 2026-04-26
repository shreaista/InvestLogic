"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ArrowLeft, ScrollText, Upload, Loader2, FileText } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { Fund } from "@/lib/types";
import {
  parseMandateSummary,
  SUMMARY_DISPLAY_LABELS,
  SUMMARY_SECTION_ORDER,
  type MandateSummary,
} from "@/lib/mandateSummary/parseMandateSummary";

interface Mandate {
  mandate_id: string;
  mandate_name: string;
  file_name: string;
  mandate_version: number;
  status: string;
  uploaded_at: string;
  storage_url: string | null;
  extracted_text: string | null;
}

interface FundMandatesPageClientProps {
  fund: Fund;
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

export default function FundMandatesPageClient({ fund }: FundMandatesPageClientProps) {
  const { toast } = useToast();
  const [mandates, setMandates] = useState<Mandate[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [textPreviewMandate, setTextPreviewMandate] = useState<Mandate | null>(null);
  const [summaryMandate, setSummaryMandate] = useState<Mandate | null>(null);
  const [parsedSummary, setParsedSummary] = useState<MandateSummary | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadMandates = useCallback(async () => {
    try {
      const res = await fetch(`/api/mandates?fund_id=${encodeURIComponent(fund.id)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.mandates)) {
        setMandates(data.mandates);
      } else {
        setMandates([]);
      }
    } catch {
      setMandates([]);
    } finally {
      setLoading(false);
    }
  }, [fund.id]);

  useEffect(() => {
    loadMandates();
  }, [loadMandates]);

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".pdf") && file.type !== "application/pdf") {
      toast("Only PDF files are accepted", "error");
      e.target.value = "";
      return;
    }

    setSelectedFileName(file.name);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("fund_id", fund.id);

    try {
      const res = await fetch("/api/mandates", {
        method: "POST",
        credentials: "include",
        body: formData,
      });
      const data = await res.json();

      if (data.ok) {
        setSelectedFileName(null);
        console.log("Upload success");
        await loadMandates();
      } else {
        toast(data.error || "Upload failed", "error");
      }
    } catch {
      toast("Upload failed", "error");
    }

    e.target.value = "";
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Mandates
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {fund.name}
            {fund.code && (
              <span className="font-mono text-slate-600 ml-2">({fund.code})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileChange}
          />
          <Button type="button" onClick={handleUploadClick}>
            <Upload className="h-4 w-4 mr-2" />
            Upload Mandate
          </Button>
          <Link href="/dashboard/funds">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Funds
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : mandates.length === 0 ? (
        <>
          {selectedFileName && (
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3">
              <p className="text-sm text-slate-600">
                <span className="font-medium">Selected file:</span> {selectedFileName}
              </p>
            </div>
          )}
          <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-500 mx-auto mb-4">
              <ScrollText className="h-6 w-6" />
            </div>
            <h2 className="text-lg font-semibold text-slate-900 mb-1">No mandates uploaded yet</h2>
            <p className="text-sm text-slate-500 mb-6 max-w-sm mx-auto">
              Upload mandate documents to define investment criteria for this fund.
            </p>
            <Button type="button" onClick={handleUploadClick}>
              <Upload className="h-4 w-4 mr-2" />
              Upload Mandate
            </Button>
          </div>
        </>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">Uploaded Mandates</h2>
          </div>
          <ul className="divide-y divide-slate-200">
            {mandates.map((m) => {
              const rowClass =
                "flex items-center justify-between gap-4 px-4 py-3 hover:bg-slate-50/50";
              const iconAndDetails = (
                <>
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600">
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-slate-900 truncate">{m.mandate_name}</p>
                    <p className="text-xs text-slate-500">
                      {m.file_name} · v{m.mandate_version} · {formatDate(m.uploaded_at)}
                    </p>
                  </div>
                </>
              );
              return (
                <li key={m.mandate_id}>
                  <div className={rowClass}>
                    {m.storage_url ? (
                      <a
                        href={m.storage_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex min-w-0 flex-1 items-center gap-3 text-inherit no-underline"
                      >
                        {iconAndDetails}
                      </a>
                    ) : (
                      <div className="flex min-w-0 flex-1 items-center gap-3">{iconAndDetails}</div>
                    )}
                    <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
                      <span className="inline-flex items-center rounded-md bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
                        {m.status}
                      </span>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => setTextPreviewMandate(m)}
                      >
                        View Extracted Text
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 text-xs"
                        onClick={() => {
                          setSummaryMandate(m);
                          setParsedSummary(parseMandateSummary(m.extracted_text));
                        }}
                      >
                        Generate Summary
                      </Button>
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      <Dialog
        open={textPreviewMandate !== null}
        onOpenChange={(open) => {
          if (!open) setTextPreviewMandate(null);
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>{textPreviewMandate?.mandate_name ?? "Mandate"}</DialogTitle>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-y-auto text-sm text-slate-700 whitespace-pre-wrap">
            {textPreviewMandate &&
            textPreviewMandate.extracted_text &&
            textPreviewMandate.extracted_text.trim()
              ? textPreviewMandate.extracted_text
              : "No extracted text available"}
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={summaryMandate !== null}
        onOpenChange={(open) => {
          if (!open) {
            setSummaryMandate(null);
            setParsedSummary(null);
          }
        }}
      >
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-hidden sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Parsed Mandate Summary</DialogTitle>
            <p className="text-sm text-muted-foreground font-normal">
              {summaryMandate?.mandate_name ?? ""}
            </p>
          </DialogHeader>
          <div className="max-h-[60vh] space-y-4 overflow-y-auto text-sm">
            {!summaryMandate?.extracted_text?.trim() ? (
              <p className="text-slate-600">No extracted text available to summarize.</p>
            ) : parsedSummary && Object.keys(parsedSummary).length === 0 ? (
              <p className="text-slate-600">
                No matching sections were found. Try clearer headings (e.g. &quot;Geography:&quot;) in the
                document.
              </p>
            ) : (
              SUMMARY_SECTION_ORDER.map((key) => {
                const text = parsedSummary?.[key];
                if (!text?.trim()) return null;
                return (
                  <div key={key}>
                    <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                      {SUMMARY_DISPLAY_LABELS[key]}
                    </p>
                    <p className="mt-1 text-slate-800 whitespace-pre-wrap">{text}</p>
                  </div>
                );
              })
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
