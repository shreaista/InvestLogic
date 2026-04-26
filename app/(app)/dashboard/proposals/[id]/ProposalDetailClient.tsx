"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { StatusBadge, DataCard, EmptyState } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  ArrowLeft,
  AlertCircle,
  FileText,
  User,
  Users,
  DollarSign,
  Calendar,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  UserPlus,
  LucideIcon,
  Upload,
  Download,
  Trash2,
  Loader2,
  RefreshCw,
  Globe,
  Target,
  Briefcase,
  FileStack,
  Hash,
  Play,
  TrendingUp,
  AlertTriangle,
  Lightbulb,
  Award,
  History,
  ShieldCheck,
  Info,
  Eye,
  FileOutput,
  GitCompare,
  HelpCircle,
  Pencil,
  Save,
  ChevronDown,
  ChevronUp,
  Sparkles,
  Check,
  MessageSquare,
} from "lucide-react";
import type { ProposalDetailRow } from "@/lib/proposals/proposalDetail";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useToast } from "@/components/ui/toast";
import { ProposalEvaluationEnterprise, ProposalInvestmentDecisionPanel } from "@/components/proposals";

// Investment Report (from tenant generate-report API)
interface InvestmentReport {
  reportId: string;
  proposalId: string;
  title: string;
  generatedAt: string;
  score: number | null;
  confidence: "low" | "medium" | "high";
  summary: string;
  investmentThesis: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  validationSummary: string;
  fitSummary: string;
  decision: "Review" | "Invest" | "Pass";
  warnings?: string[];
}

/** Set on extraction failure; UI shows structured copy plus formats helper. */
const EXTRACTION_FAILED_USER_MESSAGE =
  "Extraction failed. Unable to process the document.\nPlease try again or upload a different file.";
const EXTRACTION_SUPPORTED_FORMATS_HELPER =
  "Supported formats: PDF, Word, Excel (max 25MB)";

// Types for fund selection
interface FundOption {
  id: string;
  name: string;
  code?: string;
  status: string;
}

interface FundMandateInfo {
  id: string;
  name: string;
  strategy: string;
  geography: string;
  minTicket: number;
  maxTicket: number;
  status: string;
}

// NEW: Types for fund mandate
interface MandateTemplateFile {
  name: string;
  blobPath: string;
  uploadedAt: string;
  size: number;
}

interface MandateData {
  mandateId: string;
  mandateName: string;
  strategy: string;
  geography: string;
  ticketRange: string;
  version: number;
  status: string;
  notes?: string;
  templateFiles: MandateTemplateFile[];
}

// Types for structured scoring
interface StructuredScores {
  sectorFit: number; // 0 to 25
  geographyFit: number; // 0 to 20
  stageFit: number; // 0 to 15
  ticketSizeFit: number; // 0 to 15
  riskAdjustment: number; // -20 to 0
}

// Types for evaluation
interface EvaluationReport {
  evaluationId: string;
  evaluatedAt: string;
  evaluatedByEmail: string;
  fitScore: number | null;
  mandateSummary: string;
  proposalSummary: string;
  strengths: string[];
  risks: string[];
  recommendations: string[];
  confidence: "low" | "medium" | "high";
  model: string;
  inputs: {
    proposalDocuments: number;
    mandateTemplates: number;
    totalCharactersProcessed?: number;
    extractionWarnings?: string[];
    processedDocumentsCount?: number;
    truncatedDocumentsCount?: number;
    skippedDocumentsCount?: number;
  };
  engineType: "stub" | "llm" | "azure-openai";
  // Structured scoring (optional for backward compatibility)
  structuredScores?: StructuredScores;
  scoringMethod?: "structured" | "fallback";
  // Proposal Validation (runs before fund evaluation)
  validationSummary?: {
    validationScore: number;
    confidence?: "low" | "medium" | "high";
    summary?: string;
    step?: string;
    checks?: Record<string, { status: "found" | "partial" | "missing"; detail: string }>;
    findings?: string[];
    heuristic?: {
      signals: {
        hasRevenue: boolean;
        hasForecast: boolean;
        hasForecast12m: boolean;
        hasForecast24m: boolean;
        hasForecast48m: boolean;
        stage: "pre-revenue" | "revenue" | "growth" | "unknown";
        hasIP: boolean;
        hasCompetitors: boolean;
      };
      heuristicScoreAfterPenalties: number;
      penalties: string[];
    };
    llm?: {
      stage: "pre-revenue" | "revenue" | "growth" | "unknown";
      businessModelClarity: "clear" | "partial" | "unclear" | "unknown";
      competitorPresence: "identified" | "mentioned" | "none" | "unknown";
    };
    warnings?: string[];
  };
}

interface EvaluationMetadata {
  blobPath: string;
  evaluationId: string;
  evaluatedAt: string;
  fitScore: number | null;
  confidence?: "low" | "medium" | "high";
  model?: string;
  engineType?: "stub" | "llm" | "azure-openai";
  inputs?: {
    proposalDocuments: number;
    mandateTemplates: number;
  };
}

interface MemoMetadata {
  blobPath: string;
  memoId: string;
  generatedAt: string;
  fileName: string;
  format: "pdf" | "text";
  versionNumber?: number;
  isLatest?: boolean;
}

interface SimilarDeal {
  proposalId: string;
  fitScore: number | null;
  similarityScore: number;
  summary: string;
}

// NEW: Types for proposal documents
interface ProposalDocumentBlob {
  blobPath: string;
  filename: string;
  size: number;
  contentType: string;
  uploadedAt: string;
  timestamp: string;
}

// NEW: Format file size helper
function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

// NEW: Format date helper
function formatDate(dateString: string): string {
  if (!dateString) return "-";
  return new Date(dateString).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

// NEW: Get file type display name
function getFileTypeDisplay(contentType: string): string {
  if (contentType.includes("pdf")) return "PDF";
  if (contentType.includes("word") || contentType.includes("document")) return "DOC";
  if (contentType.includes("excel") || contentType.includes("spreadsheet")) return "XLS";
  if (contentType.includes("powerpoint") || contentType.includes("presentation")) return "PPT";
  if (contentType.includes("image")) return "IMG";
  if (contentType.includes("text/plain")) return "TXT";
  if (contentType.includes("csv")) return "CSV";
  return "FILE";
}

function statusKey(status: string): string {
  return status.toLowerCase().trim().replace(/\s+/g, "_");
}

function formatStatusLabel(status: string): string {
  const k = statusKey(status);
  const pretty = k.replace(/_/g, " ");
  return pretty.replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusVariant(
  status: string
): "muted" | "info" | "warning" | "success" | "error" {
  const k = statusKey(status);
  if (k === "new") return "muted";
  if (k === "assigned") return "info";
  if (k === "in_review") return "warning";
  if (k === "approved") return "success";
  if (k === "declined") return "error";
  if (k === "deferred") return "muted";
  if (k === "validated") return "info";
  return "muted";
}

function getStatusIcon(status: string): LucideIcon {
  const k = statusKey(status);
  if (k === "new") return FileText;
  if (k === "assigned") return UserPlus;
  if (k === "in_review") return Clock;
  if (k === "validated") return ShieldCheck;
  if (k === "approved") return CheckCircle;
  if (k === "declined") return XCircle;
  if (k === "deferred") return Clock;
  return FileText;
}

function getPriorityVariant(priority: string): "muted" | "info" | "warning" | "success" | "error" {
  const k = priority.toLowerCase();
  if (k === "high") return "error";
  if (k === "medium") return "warning";
  return "muted";
}

function formatPriorityLabel(priority: string): string {
  return priority.charAt(0).toUpperCase() + priority.slice(1).toLowerCase();
}

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(amount);
}

function MemoSection({
  title,
  icon: Icon,
  content,
  explainKey,
  explainContent,
  expanded,
  onToggle,
}: {
  title: string;
  icon: LucideIcon;
  content: React.ReactNode;
  explainKey: string;
  explainContent: string;
  expanded: Record<string, boolean>;
  onToggle: (key: string) => void;
}) {
  const isExpanded = expanded[explainKey];
  return (
    <section>
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          <h3 className="text-lg font-semibold">{title}</h3>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="text-muted-foreground hover:text-foreground h-8 gap-1"
          onClick={() => onToggle(explainKey)}
        >
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
          Explain this
        </Button>
      </div>
      <div className="mt-3 pl-10 text-sm leading-relaxed">
        {typeof content === "string" ? <p className="text-foreground">{content}</p> : content}
      </div>
      {isExpanded && (
        <div className="mt-3 pl-10 rounded-lg border bg-muted/30 px-4 py-3 text-sm text-muted-foreground">
          {explainContent}
        </div>
      )}
    </section>
  );
}

interface ProposalCommentRow {
  comment_id: string;
  proposal_id: string;
  tenant_id: string;
  user_id: string;
  comment_text: string;
  comment_type: string;
  created_at: string;
  user_name: string | null;
}

interface CurrentAssignment {
  assignedToUserId: string | null;
  assignedToName: string | null;
  assignedQueueId: string | null;
  assignedQueueName: string | null;
}

interface Assessor {
  id: string;
  name: string;
  email: string;
}

interface Queue {
  id: string;
  name: string;
  description?: string;
}

interface ProposalDetailClientProps {
  proposal: ProposalDetailRow | null;
  canAssign: boolean;
  canManageDocuments?: boolean;
  isReadOnly?: boolean;
  currentAssignment?: CurrentAssignment;
  error?: string;
}

/** Validation score display: green 70+, yellow 40–69, red 0–39 */
function validationScoreBandClass(score: number): string {
  if (score >= 70) return "text-emerald-600";
  if (score >= 40) return "text-amber-600";
  return "text-red-600";
}

export default function ProposalDetailClient({ proposal, canAssign, canManageDocuments = false, isReadOnly = false, currentAssignment, error }: ProposalDetailClientProps) {
  const router = useRouter();
  const { toast } = useToast();
  /** Optimistic display until `router.refresh()` returns updated `proposal.status` from DB */
  const [proposalStatusOverride, setProposalStatusOverride] = useState<string | null>(null);

  useEffect(() => {
    setProposalStatusOverride(null);
  }, [proposal?.proposal_id, proposal?.status]);

  // Document management state
  const [documents, setDocuments] = useState<ProposalDocumentBlob[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [message, setMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const proposalDocDragDepth = useRef(0);
  const [proposalDocDropHighlight, setProposalDocDropHighlight] = useState(false);

  // Assignment state
  const [assessors, setAssessors] = useState<Assessor[]>([]);
  const [queues, setQueues] = useState<Queue[]>([]);
  const [selectedAssessor, setSelectedAssessor] = useState<string>("");
  const [selectedQueue, setSelectedQueue] = useState<string>("");
  const [assignmentMode, setAssignmentMode] = useState<"user" | "queue">("user");
  const [assigning, setAssigning] = useState(false);
  const [assignment, setAssignment] = useState<CurrentAssignment | undefined>(currentAssignment);

  const [comments, setComments] = useState<ProposalCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [commentType, setCommentType] = useState<"note" | "question" | "risk" | "decision">("note");
  const [postingComment, setPostingComment] = useState(false);

  const loadComments = useCallback(async () => {
    if (!proposal?.proposal_id) return;
    setCommentsLoading(true);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(proposal.proposal_id)}/comments`, {
        credentials: "include",
      });
      const data = (await res.json()) as { ok?: boolean; data?: { comments?: ProposalCommentRow[] } };
      if (res.ok && data.ok && data.data?.comments) {
        setComments(data.data.comments);
      } else {
        setComments([]);
      }
    } catch {
      setComments([]);
    } finally {
      setCommentsLoading(false);
    }
  }, [proposal?.proposal_id]);

  useEffect(() => {
    void loadComments();
  }, [loadComments]);

  const handlePostComment = async () => {
    if (!proposal?.proposal_id || isReadOnly) return;
    const text = commentText.trim();
    if (!text) return;
    setPostingComment(true);
    try {
      const res = await fetch(`/api/proposals/${encodeURIComponent(proposal.proposal_id)}/comments`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ comment_text: text, comment_type: commentType }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setCommentText("");
        await loadComments();
        setMessage({ text: "Comment posted", type: "success" });
      } else {
        setMessage({ text: data.error ?? "Failed to post comment", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error posting comment", type: "error" });
    } finally {
      setPostingComment(false);
    }
  };

  // Load assessors and queues for assignment
  useEffect(() => {
    if (canAssign && proposal) {
      Promise.all([
        fetch("/api/tenant/assessors").then((r) => r.json()),
        fetch("/api/tenant/queues").then((r) => r.json()),
      ]).then(([assessorRes, queueRes]) => {
        if (assessorRes.ok) setAssessors(assessorRes.data.assessors || []);
        if (queueRes.ok) setQueues(queueRes.data.queues || []);
      });
    }
  }, [canAssign, proposal]);

  // Handle assignment
  const handleAssign = async () => {
    if (!proposal) return;
    setAssigning(true);

    try {
      const body: { assignedUserId?: string; queueId?: string } = {};
      if (assignmentMode === "user" && selectedAssessor) {
        body.assignedUserId = selectedAssessor;
      } else if (assignmentMode === "queue" && selectedQueue) {
        body.queueId = selectedQueue;
      } else {
        toast("Please select an assessor or queue", "error");
        setAssigning(false);
        return;
      }

      const res = await fetch(`/api/tenant/proposals/${proposal.proposal_id}/assign`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();

      if (data.ok) {
        const assignee = assessors.find((a) => a.id === data.data.assignedToUserId);
        const queue = queues.find((q) => q.id === data.data.assignedQueueId);
        setAssignment({
          assignedToUserId: data.data.assignedToUserId,
          assignedToName: assignee?.name || null,
          assignedQueueId: data.data.assignedQueueId,
          assignedQueueName: queue?.name || null,
        });
        toast("Assignment updated successfully", "success");
        setSelectedAssessor("");
        setSelectedQueue("");
      } else {
        toast(data.error || "Assignment failed", "error");
      }
    } catch {
      toast("Network error during assignment", "error");
    }

    setAssigning(false);
  };

  // Fund selection state
  const [funds, setFunds] = useState<FundOption[]>([]);
  const [selectedFundId, setSelectedFundId] = useState<string>("");
  const [fundMandates, setFundMandates] = useState<FundMandateInfo[]>([]);
  const [loadingFunds, setLoadingFunds] = useState(false);
  const [loadingFundMandates, setLoadingFundMandates] = useState(false);

  // Load funds on mount and pre-select if proposal has a linked fund
  useEffect(() => {
    const loadFunds = async () => {
      setLoadingFunds(true);
      try {
        const res = await fetch("/api/tenant/funds");
        const data = await res.json();
        if (data.ok) {
          const fundList = data.data.funds || [];
          setFunds(fundList);
          // Pre-select fund from proposal.fund_id when present
          if (proposal?.fund_id && fundList.length > 0) {
            const match = fundList.find((f: FundOption) => f.id === proposal.fund_id);
            if (match) {
              setSelectedFundId(match.id);
            }
          }
        }
      } catch {
        console.error("Failed to load funds");
      }
      setLoadingFunds(false);
    };
    loadFunds();
  }, [proposal?.proposal_id, proposal?.fund_id]);

  // Load fund mandates when fund is selected
  useEffect(() => {
    if (!selectedFundId) {
      return;
    }

    const loadFundMandates = async () => {
      setLoadingFundMandates(true);
      try {
        const res = await fetch(`/api/tenant/funds/${selectedFundId}/mandates`);
        const data = await res.json();
        if (data.ok) {
          setFundMandates(data.data.linkedMandates || []);
        } else {
          setFundMandates([]);
        }
      } catch {
        console.error("Failed to load fund mandates");
        setFundMandates([]);
      }
      setLoadingFundMandates(false);
    };
    loadFundMandates();
  }, [selectedFundId]);

  // NEW: Mandate state
  const [mandate, setMandate] = useState<MandateData | null>(null);
  const [mandateLoading, setMandateLoading] = useState(false);
  const [mandateError, setMandateError] = useState<string | null>(null);

  // NEW: Load mandate data
  const loadMandate = useCallback(async (proposalId: string) => {
    setMandateLoading(true);
    setMandateError(null);
    try {
      const res = await fetch(`/api/proposals/${proposalId}/mandate`);
      const data = await res.json();
      if (data.ok && data.data.mandate) {
        setMandate(data.data.mandate);
      } else if (data.data?.message) {
        setMandateError(data.data.message);
      }
    } catch {
      setMandateError("Failed to load mandate information");
    }
    setMandateLoading(false);
  }, []);

  // NEW: Load mandate on mount
  useEffect(() => {
    const id = proposal?.proposal_id;
    if (id) {
      queueMicrotask(() => { loadMandate(id); });
    }
  }, [proposal?.proposal_id, loadMandate]);

  // NEW: Handle mandate template file download
  const handleMandateFileDownload = (blobName: string) => {
    window.open(
      `/api/tenant/fund-mandates/download?blobName=${encodeURIComponent(blobName)}`,
      "_blank"
    );
  };

  // NEW: Evaluation state
  const [evaluations, setEvaluations] = useState<EvaluationMetadata[]>([]);
  const [latestEvaluation, setLatestEvaluation] = useState<EvaluationReport | null>(null);
  const [displayedEvaluation, setDisplayedEvaluation] = useState<EvaluationReport | null>(null);
  const [viewingHistorical, setViewingHistorical] = useState(false);
  const [evaluationsLoading, setEvaluationsLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [evaluationMessage, setEvaluationMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Proposal validation (simple validate endpoint)
  const [validationResult, setValidationResult] = useState<{
    ok?: boolean;
    data?: {
      score: number;
      findings: string[];
      checks?: Array<{
        id: string;
        label: string;
        passed: boolean;
        detail?: string;
        issue?: string;
      }>;
      overallLabel?: string;
    };
  } | null>(null);
  const [validating, setValidating] = useState(false);

  // Extracted content preview
  const [extractedContent, setExtractedContent] = useState<{ documents: { filename: string; text: string; isPlaceholder?: boolean; warning?: string }[]; combinedText: string } | null>(null);
  /** True only while user clicked "Run Extraction" (not background sync). */
  const [extractLoading, setExtractLoading] = useState(false);
  const [refreshExtractLoading, setRefreshExtractLoading] = useState(false);
  const [extractError, setExtractError] = useState<string | null>(null);
  /** Drives Validate CTA: completed = extract API succeeded (text optional). */
  const [extractionStatus, setExtractionStatus] = useState<
    "idle" | "processing" | "completed" | "failed"
  >("idle");

  const validateDisabled = validating || extractionStatus !== "completed";

  const [workspaceTab, setWorkspaceTab] = useState("overview");

  // Analyst inline editing
  const [analystSummary, setAnalystSummary] = useState("");
  const [analystNotes, setAnalystNotes] = useState("");
  const [editingSummary, setEditingSummary] = useState(false);

  // Explain AI dialog
  const [explainAiOpen, setExplainAiOpen] = useState(false);

  // Expandable "Explain this" sections in AI Memo
  const [memoExpanded, setMemoExpanded] = useState<Record<string, boolean>>({});

  // Helper to sort evaluations by evaluatedAt DESC (newest first)
  const sortEvaluationsDesc = (evals: EvaluationMetadata[]): EvaluationMetadata[] => {
    return [...evals].sort((a, b) => {
      const dateA = new Date(a.evaluatedAt).getTime();
      const dateB = new Date(b.evaluatedAt).getTime();
      return dateB - dateA;
    });
  };

  // NEW: Load evaluations - always resets to show latest evaluation
  const loadEvaluations = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.proposal_id;
    if (!id) return;
    setEvaluationsLoading(true);
    
    // Clear stale state before fetching
    setViewingHistorical(false);
    
    try {
      const res = await fetch(`/api/proposals/${id}/evaluations?includeLatest=true`);
      const data = await res.json();
      if (data.ok) {
        // Sort evaluations client-side as defensive measure
        const sortedEvaluations = sortEvaluationsDesc(data.data.evaluations || []);
        setEvaluations(sortedEvaluations);
        
        // Always set latest evaluation from server response
        const latestReport = data.data.latestReport || null;
        setLatestEvaluation(latestReport);
        
        // Always display the latest evaluation (no stale state)
        setDisplayedEvaluation(latestReport);
        setViewingHistorical(false);
      }
    } catch {
      console.error("Failed to load evaluations");
    }
    setEvaluationsLoading(false);
  }, [proposal?.proposal_id]);

  // NEW: Load evaluations on mount
  useEffect(() => {
    const id = proposal?.proposal_id;
    if (id) {
      queueMicrotask(() => { loadEvaluations(id); });
    }
  }, [proposal?.proposal_id, loadEvaluations]);

  // Run proposal validation (simple keyword check)
  const handleValidateProposal = async () => {
    const id = proposal?.proposal_id;
    if (!id) return;
    setValidating(true);
    try {
      const res = await fetch(`/api/proposals/${id}/validate`, {
        method: "POST",
      });
      const data = await res.json();
      setValidationResult(data);
      if (data?.ok && data?.data) {
        setProposalStatusOverride("validated");
        toast("Validation complete. Continue with mandate evaluation.", "success");
        router.refresh();
      }
    } catch {
      setEvaluationMessage({ text: "Network error during validation", type: "error" });
    }
    setValidating(false);
  };

  // Load extracted content for preview
  const loadExtractedContent = useCallback(
    async (opts?: { silent?: boolean; forRefresh?: boolean }) => {
      const silent = opts?.silent ?? false;
      const forRefresh = opts?.forRefresh ?? false;
      const id = proposal?.proposal_id;
      if (!id) return;
      if (forRefresh) setRefreshExtractLoading(true);
      else if (!silent) {
        setExtractLoading(true);
        setExtractError(null);
      }
      try {
        // Avoid flipping step 1 → 0 during silent refetch (e.g. after validate + router.refresh).
        if (!silent) {
          setExtractionStatus("processing");
        } else {
          setExtractionStatus((prev) => (prev === "completed" ? "completed" : "processing"));
        }
        // User-run extraction: temporary mock API, then placeholder text + jump to validation
        if (!silent) {
          const postRes = await fetch("/api/extract", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ proposalId: id }),
          });
          let postData: { ok?: boolean } = {};
          try {
            postData = await postRes.json();
          } catch {
            setExtractError(EXTRACTION_FAILED_USER_MESSAGE);
            setExtractionStatus("failed");
            return;
          }
          if (!postRes.ok || postData.ok !== true) {
            setExtractError(EXTRACTION_FAILED_USER_MESSAGE);
            setExtractionStatus("failed");
            return;
          }
          const mockDocs = documents.map((d) => ({
            filename: d.filename,
            text: "Mock extracted text. Connect the extraction service for full document parsing.",
            isPlaceholder: true as const,
          }));
          const combinedText = mockDocs.map((d) => d.text).join("\n\n");
          setExtractedContent({ documents: mockDocs, combinedText });
          setExtractError(null);
          setExtractionStatus("completed");
          toast("Extraction complete", "success");
          setWorkspaceTab("overview");
          window.setTimeout(() => {
            document.getElementById("proposal-validation-section")?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          }, 100);
          return;
        }

        const res = await fetch(`/api/proposals/${id}/extract`);
        let data: { ok?: boolean; data?: { documents: { text?: string; isPlaceholder?: boolean }[]; combinedText: string } } = {};
        try {
          data = await res.json();
        } catch {
          if (!silent) setExtractError(EXTRACTION_FAILED_USER_MESSAGE);
          setExtractionStatus("failed");
          return;
        }
        const payload = data?.data;
        const httpOk = res.ok;
        const apiOk = data?.ok === true && payload != null;
        if (httpOk && apiOk && payload != null) {
          const docs = (payload.documents ?? []).map(
            (d: {
              filename?: string;
              text?: string;
              isPlaceholder?: boolean;
              warning?: string;
            }) => ({
              filename: String(d.filename ?? "document"),
              text: String(d.text ?? ""),
              isPlaceholder: d.isPlaceholder,
              warning: d.warning,
            })
          );
          setExtractedContent({
            documents: docs,
            combinedText:
              typeof payload.combinedText === "string" ? payload.combinedText : "",
          });
          setExtractError(null);
          setExtractionStatus("completed");
        } else {
          if (!silent) setExtractError(EXTRACTION_FAILED_USER_MESSAGE);
          setExtractionStatus("failed");
        }
      } catch {
        if (!silent) setExtractError(EXTRACTION_FAILED_USER_MESSAGE);
        setExtractionStatus("failed");
      } finally {
        if (forRefresh) setRefreshExtractLoading(false);
        else if (!silent) setExtractLoading(false);
      }
    },
    [proposal?.proposal_id, documents, setWorkspaceTab, toast]
  );

  // Load extracted content when proposal/documents change; silent = no blocking UI on initial sync
  useEffect(() => {
    const shouldLoad = Boolean(proposal?.proposal_id && documents.length > 0);
    queueMicrotask(() => {
      if (shouldLoad) {
        void loadExtractedContent({ silent: true });
      } else {
        setExtractedContent(null);
        setExtractError(null);
        setExtractionStatus("idle");
      }
    });
  }, [proposal?.proposal_id, documents.length, loadExtractedContent]);

  // Derived analyst summary: when not editing, show evaluation summary; when editing, show local draft
  const displayedSummary =
    editingSummary ? analystSummary : (displayedEvaluation?.proposalSummary ?? "");

  // NEW: Run evaluation
  const handleRunEvaluation = async () => {
    if (!proposal) return;
    const validatedForEval =
      Boolean(validationResult?.ok && validationResult.data) ||
      statusKey(proposalStatusOverride ?? proposal.status) === "validated";
    if (!validatedForEval) {
      setEvaluationMessage({
        text: "Complete proposal validation before running evaluation.",
        type: "error",
      });
      return;
    }
    setEvaluating(true);
    setEvaluationMessage(null);
    
    // Clear stale evaluation state before running new evaluation
    setViewingHistorical(false);

    try {
      const res = await fetch(`/api/proposals/${proposal.proposal_id}/evaluate`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        const newReport = data.data.report;
        setEvaluationMessage({
          text: `Evaluation completed. Fit Score: ${newReport.fitScore}`,
          type: "success",
        });
        
        // Immediately set the new evaluation as displayed (clear old state)
        setLatestEvaluation(newReport);
        setDisplayedEvaluation(newReport);
        setViewingHistorical(false);
        
        // Then reload the full list from server to sync evaluation history
        await loadEvaluations();
      } else {
        setEvaluationMessage({ text: data.error || "Evaluation failed", type: "error" });
      }
    } catch {
      setEvaluationMessage({ text: "Network error during evaluation", type: "error" });
    }

    setEvaluating(false);
  };

  // Download evaluation JSON
  const handleDownloadEvaluation = (blobPath: string) => {
    if (!proposal) return;
    window.open(
      `/api/proposals/${proposal.proposal_id}/evaluations/download?blobPath=${encodeURIComponent(blobPath)}`,
      "_blank"
    );
  };

  // Memo generation state
  const [generatingMemo, setGeneratingMemo] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [displayedReport] = useState<EvaluationReport | null>(null);
  const [investmentReport, setInvestmentReport] = useState<InvestmentReport | null>(null);
  const [reportLoading, setReportLoading] = useState(false);
  const [memos, setMemos] = useState<MemoMetadata[]>([]);
  const [latestMemoBlobPath, setLatestMemoBlobPath] = useState<string | null>(null);
  const [latestMemoFileName, setLatestMemoFileName] = useState<string | null>(null);
  const [latestMemoGeneratedAt, setLatestMemoGeneratedAt] = useState<string | null>(null);
  const [memoCount, setMemoCount] = useState(0);
  const [memoMessage, setMemoMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  // Load memos on mount and when proposal changes
  const loadMemos = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.proposal_id;
    if (!id) return;
    try {
      const res = await fetch(`/api/proposals/${id}/memo`);
      const data = await res.json();
      if (data.ok) {
        const memoList = data.data.memos || [];
        setMemos(memoList);
        setMemoCount(data.data.memoCount ?? memoList.length);
        setLatestMemoBlobPath(data.data.latestMemoBlobPath ?? memoList[0]?.blobPath ?? null);
        setLatestMemoFileName(data.data.latestMemoFileName ?? memoList[0]?.fileName ?? null);
        setLatestMemoGeneratedAt(data.data.latestMemoGeneratedAt ?? memoList[0]?.generatedAt ?? null);
      }
    } catch {
      console.error("Failed to load memos");
    }
  }, [proposal?.proposal_id]);

  useEffect(() => {
    const id = proposal?.proposal_id;
    if (id) {
      queueMicrotask(() => { loadMemos(id); });
    }
  }, [proposal?.proposal_id, loadMemos]);

  // Load generated report from tenant API (for AI Memo tab)
  const loadReport = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.proposal_id;
    if (!id) return;
    setReportLoading(true);
    try {
      const res = await fetch(`/api/tenant/proposals/${id}/report`);
      const data = await res.json();
      if (data.ok && data.data.report) {
        setInvestmentReport(data.data.report);
      } else {
        setInvestmentReport(null);
      }
    } catch {
      setInvestmentReport(null);
    }
    setReportLoading(false);
  }, [proposal?.proposal_id]);

  useEffect(() => {
    const id = proposal?.proposal_id;
    if (!id) return;
    queueMicrotask(() => { loadReport(id); });
  }, [proposal?.proposal_id, loadReport]);

  // Memo content: prefer investment report, fallback to evaluation, then old displayed report
  const memoContent = displayedEvaluation ?? displayedReport;

  // Generate report via tenant API (full Report Engine)
  const handleGenerateReport = async () => {
    if (!proposal) return;
    if (!evaluations.length && latestEvaluation == null) {
      setMemoMessage({
        text: "Run mandate evaluation before generating the report.",
        type: "error",
      });
      return;
    }
    setGeneratingReport(true);
    setMemoMessage(null);

    try {
      const res = await fetch(`/api/tenant/proposals/${proposal.proposal_id}/generate-report`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        setMemoMessage({
          text: "Report generated successfully",
          type: "success",
        });
        setInvestmentReport(data.data);
        setWorkspaceTab("evaluation");
      } else {
        setMemoMessage({
          text: data.error || "Failed to generate report",
          type: "error",
        });
      }
    } catch {
      setMemoMessage({ text: "Network error during report generation", type: "error" });
    }

    setGeneratingReport(false);
  };

  // Download report PDF (tenant API)
  const handleDownloadReportPDF = () => {
    if (!proposal) return;
    window.open(
      `/api/tenant/proposals/${proposal.proposal_id}/report/download`,
      "_blank"
    );
  };

  // Generate investment memo (from evaluation - requires evaluation to exist)
  const handleGenerateMemo = async () => {
    if (!proposal) return;
    setGeneratingMemo(true);
    setMemoMessage(null);

    try {
      const res = await fetch(`/api/proposals/${proposal.proposal_id}/memo`, {
        method: "POST",
      });

      const data = await res.json();

      if (data.ok) {
        setMemoMessage({
          text: "Report generated successfully",
          type: "success",
        });
        await loadMemos();
      } else {
        setMemoMessage({ text: data.error || "Failed to generate report", type: "error" });
      }
    } catch {
      setMemoMessage({ text: "Network error during report generation", type: "error" });
    }

    setGeneratingMemo(false);
  };

  // Download memo (latest by default, or specific blobPath for history)
  const handleDownloadMemo = (blobPath?: string) => {
    if (!proposal) return;
    const path = blobPath ?? latestMemoBlobPath;
    if (!path) return;
    window.open(
      `/api/proposals/${proposal.proposal_id}/memo?blobPath=${encodeURIComponent(path)}`,
      "_blank"
    );
  };

  // Similar Deals state
  const [similarDeals, setSimilarDeals] = useState<SimilarDeal[]>([]);
  const [similarDealsLoading, setSimilarDealsLoading] = useState(false);

  const loadSimilarDeals = useCallback(async (proposalId?: string) => {
    const id = proposalId || proposal?.proposal_id;
    if (!id || !displayedEvaluation) return;
    setSimilarDealsLoading(true);
    try {
      const res = await fetch(`/api/proposals/${id}/similar`);
      const data = await res.json();
      if (data.ok && data.data.similar) {
        setSimilarDeals(data.data.similar);
      } else {
        setSimilarDeals([]);
      }
    } catch {
      setSimilarDeals([]);
    }
    setSimilarDealsLoading(false);
  }, [proposal?.proposal_id, displayedEvaluation]);

  useEffect(() => {
    if (displayedEvaluation && proposal?.proposal_id) {
      queueMicrotask(() => { loadSimilarDeals(proposal.proposal_id); });
    } else {
      queueMicrotask(() => { setSimilarDeals([]); });
    }
  }, [displayedEvaluation, proposal?.proposal_id, loadSimilarDeals]);

  // View a specific evaluation (load it into the main panel)
  const handleViewEvaluation = async (blobPath: string, isLatest: boolean = false) => {
    if (!proposal) return;
    setEvaluationsLoading(true);
    try {
      const res = await fetch(
        `/api/proposals/${proposal.proposal_id}/evaluations/download?blobPath=${encodeURIComponent(blobPath)}`
      );
      if (res.ok) {
        const report = await res.json();
        setDisplayedEvaluation(report);
        setViewingHistorical(!isLatest);
      }
    } catch {
      console.error("Failed to load evaluation");
    }
    setEvaluationsLoading(false);
  };

  // Reset to show the latest evaluation
  const handleShowLatest = () => {
    if (latestEvaluation) {
      setDisplayedEvaluation(latestEvaluation);
      setViewingHistorical(false);
    }
  };

  // NEW: Get score color
  const getScoreColor = (score: number): string => {
    if (score >= 85) return "text-emerald-600";
    if (score >= 70) return "text-amber-600";
    return "text-red-600";
  };

  // NEW: Load documents
  const loadDocuments = useCallback(async (proposalId?: string, opts?: { preserveMessage?: boolean }) => {
    const id = proposalId || proposal?.proposal_id;
    if (!id) return;
    setLoading(true);
    if (!opts?.preserveMessage) {
      setMessage(null);
    }
    try {
      const res = await fetch(`/api/proposals/${id}/documents`);
      const data = await res.json();
      if (data.ok) {
        setDocuments(data.data.flat || []);
      } else {
        setMessage({ text: data.error || "Failed to load documents", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error loading documents", type: "error" });
    }
    setLoading(false);
  }, [proposal?.proposal_id]);

  // NEW: Load documents on mount
  useEffect(() => {
    const id = proposal?.proposal_id;
    if (id) {
      queueMicrotask(() => { loadDocuments(id); });
    }
  }, [proposal?.proposal_id, loadDocuments]);

  // NEW: Handle file upload
  const handleUpload = async (file: File) => {
    if (!proposal) return;
    setUploading(true);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch(`/api/proposals/${proposal.proposal_id}/documents`, {
        method: "POST",
        body: formData,
      });

      let data: { ok?: boolean; error?: string; data?: { filename?: string } } = {};
      try {
        data = await res.json();
      } catch {
        // Non-JSON body (e.g. HTML error page) — do not treat as success
      }
      console.log("upload response", data);

      const httpOk = res.ok || res.status === 200;
      const bodyOk = data.ok === true;

      if (httpOk && bodyOk) {
        await loadDocuments(undefined, { preserveMessage: true });
        const displayName = data.data?.filename ?? file.name;
        setMessage({ text: `Uploaded: ${displayName}`, type: "success" });
        queueMicrotask(() => {
          void loadExtractedContent({ silent: true });
        });
      } else {
        const errMsg =
          (typeof data.error === "string" && data.error.trim()) ||
          (!httpOk ? `Upload failed (HTTP ${res.status})` : "Upload failed");
        setMessage({ text: errMsg, type: "error" });
      }
    } catch (e) {
      console.error("upload fetch failed", e);
      setMessage({ text: "Network error during upload", type: "error" });
    } finally {
      setUploading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    }
  };

  const tryAcceptProposalFile = (file: File | undefined) => {
    if (!file) return;
    const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
    const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
    if (!allowedExtensions.includes(ext)) {
      setMessage({ text: "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.", type: "error" });
      return;
    }
    handleUpload(file);
  };

  // Handle file download (local public files use storage_url; legacy Azure paths use API)
  const handleDownload = (blobPath: string) => {
    if (!proposal) return;
    if (blobPath.startsWith("/uploads/")) {
      window.open(blobPath, "_blank");
      return;
    }
    window.open(
      `/api/proposals/${proposal.proposal_id}/documents/download?key=${encodeURIComponent(blobPath)}`,
      "_blank"
    );
  };

  // Handle file delete
  const handleDelete = async (blobPath: string, filename: string) => {
    if (!proposal) return;
    if (!confirm(`Are you sure you want to delete "${filename}"?`)) return;

    setDeleting(blobPath);
    setMessage(null);

    try {
      const res = await fetch(
        `/api/proposals/${proposal.proposal_id}/documents/delete?key=${encodeURIComponent(blobPath)}`,
        { method: "DELETE" }
      );

      const data = await res.json();

      if (data.ok) {
        setMessage({ text: "Document deleted", type: "success" });
        await loadDocuments();
      } else {
        setMessage({ text: data.error || "Delete failed", type: "error" });
      }
    } catch {
      setMessage({ text: "Network error during delete", type: "error" });
    }

    setDeleting(null);
  };

  const pipelineWorkflow = useMemo(() => {
    const hasProposalDocuments = documents.length > 0;
    const uploadExtractDone = extractionStatus === "completed";
    const normalizedWorkflowStatus = statusKey(
      proposalStatusOverride ?? proposal?.status ?? ""
    );
    const statusIndicatesValidated = normalizedWorkflowStatus === "validated";
    const hasValidatedFromResult = Boolean(validationResult?.ok && validationResult?.data);
    const hasValidated = hasValidatedFromResult || statusIndicatesValidated;
    const hasEvaluation = evaluations.length > 0 || latestEvaluation != null;
    const hasGeneratedReport =
      investmentReport != null || memoCount > 0 || Boolean(latestMemoBlobPath);

    const validateDone =
      hasValidated && (uploadExtractDone || statusIndicatesValidated);
    const evaluateDone = hasEvaluation && validateDone;
    const reportDone = hasGeneratedReport && evaluateDone;

    const workflowSteps = [
      {
        key: "upload_extract" as const,
        label: "Upload & Extract",
        done: uploadExtractDone,
      },
      { key: "validate" as const, label: "Validate", done: validateDone },
      { key: "evaluate" as const, label: "Evaluate", done: evaluateDone },
      { key: "report" as const, label: "Generate Report", done: reportDone },
    ] as const;

    const workflowActiveIndex = workflowSteps.findIndex((s) => !s.done);
    const workflowCurrentStep = workflowActiveIndex === -1 ? workflowSteps.length : workflowActiveIndex;

    return {
      workflowSteps,
      workflowActiveIndex,
      workflowCurrentStep,
      hasProposalDocuments,
      hasValidated,
      hasEvaluation,
      hasGeneratedReport,
    };
  }, [
    documents,
    extractionStatus,
    validationResult,
    evaluations,
    latestEvaluation,
    investmentReport,
    memoCount,
    latestMemoBlobPath,
    proposal?.status,
    proposalStatusOverride,
  ]);

  useEffect(() => {
    const idx = pipelineWorkflow.workflowActiveIndex;
    const tabForStep =
      idx < 0 ? "evaluation" : idx === 0 ? "documents" : idx === 1 ? "overview" : "evaluation";
    setWorkspaceTab(tabForStep);
  }, [pipelineWorkflow.workflowActiveIndex]);

  if (error) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  if (!proposal) {
    return (
      <div className="space-y-8">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/proposals">
            <Button variant="ghost" size="sm">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Proposals
            </Button>
          </Link>
        </div>
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>Proposal not found</AlertDescription>
        </Alert>
      </div>
    );
  }

  const effectiveProposalStatus = proposalStatusOverride ?? proposal.status;
  const StatusIcon = getStatusIcon(effectiveProposalStatus);

  const {
    workflowSteps,
    workflowActiveIndex,
    workflowCurrentStep,
    hasProposalDocuments,
    hasValidated,
    hasEvaluation,
    hasGeneratedReport,
  } = pipelineWorkflow;

  const reportToolbarPrimary = workflowActiveIndex === 3;

  const evaluateDisabled = evaluating || isReadOnly || !hasValidated;
  const reportDisabled =
    generatingReport ||
    isReadOnly ||
    documents.length === 0 ||
    !proposal.fund_id ||
    !hasEvaluation;

  const workflowHighlightIndex = workflowActiveIndex < 0 ? -1 : workflowActiveIndex;

  /** Evaluation tab shows mandate fit / memo only after validation (step 3+). */
  const evaluationWorkspaceEnabled = workflowActiveIndex < 0 || workflowActiveIndex >= 2;

  const evaluationSectionHeading =
    workflowActiveIndex < 0
      ? "Evaluation & reporting"
      : workflowActiveIndex >= 3
        ? "Next step: Generate report"
        : "Next step: Evaluate proposal";

  const evaluationSectionSub =
    workflowActiveIndex < 0
      ? "Review mandate fit, validation context, and AI memo."
      : workflowActiveIndex >= 3
        ? "Create the committee-ready memo from the report engine."
        : "Analyze investment potential and risks based on extracted data.";

  const handleWorkspaceTabChange = useCallback(
    (next: string) => {
      if (next === "evaluation" && workflowActiveIndex >= 0 && workflowActiveIndex < 2) {
        toast(
          "Complete validation on the Overview tab before opening Evaluation.",
          "info"
        );
        return;
      }
      setWorkspaceTab(next);
    },
    [workflowActiveIndex, toast]
  );

  const combinedForPreview =
    extractedContent?.combinedText?.replace(/\s+/g, " ").trim() ||
    (extractedContent?.documents?.length
      ? extractedContent.documents
          .map((d) => d.text || "")
          .join("\n")
          .replace(/\s+/g, " ")
          .trim()
      : "");
  const aiExtractionSnippet =
    combinedForPreview.length > 0
      ? combinedForPreview.slice(0, 900) + (combinedForPreview.length > 900 ? "…" : "")
      : "";

  const validationResultsDisplay = useMemo(() => {
    const data = validationResult?.data;
    if (!validationResult?.ok || !data) return null;
    const checks = data.checks?.length
      ? data.checks
      : [
          {
            id: "completeness",
            label: "Document completeness",
            passed: data.score >= 70,
            detail: `${data.score}%`,
          },
          ...(data.findings || []).map((f, i) => ({
            id: `legacy-${i}`,
            label: f,
            passed: false,
            issue: f,
          })),
        ];
    const overallLabel =
      data.overallLabel ??
      (data.score >= 70 ? "Ready for evaluation" : data.score >= 45 ? "Needs attention" : "Critical gaps");
    return { checks, overallLabel, score: data.score };
  }, [validationResult]);

  const workspaceTabForStepIndex = (stepIndex: number) => {
    if (stepIndex < 0 || stepIndex >= workflowSteps.length) return "overview" as const;
    if (stepIndex === 0) return "documents" as const;
    if (stepIndex === 1) return "overview" as const;
    return "evaluation" as const;
  };

  const workflowGuidance = (() => {
    if (workflowActiveIndex === -1) {
      return {
        title: "Pipeline complete",
        helperLine: "Review validation, mandate fit, and reports in the Evaluation tab.",
        primary: null as {
          label: string;
          onClick: () => void;
          disabled?: boolean;
          loading?: boolean;
        } | null,
      };
    }
    const key = workflowSteps[workflowActiveIndex].key;
    if (key === "upload_extract") {
      return {
        title: "Next step: Upload documents",
        helperLine:
          "Add files on the Documents & Extraction tab—text is extracted automatically so you can validate next.",
        primary: canManageDocuments
          ? {
              label: "Go to documents",
              onClick: () => {
                setWorkspaceTab("documents");
                queueMicrotask(() =>
                  document
                    .getElementById("proposal-documents-section")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                );
              },
            }
          : null,
      };
    }
    if (key === "validate") {
      return {
        title: "Next step: Validate proposal",
        helperLine: "Run AI checks on the extracted narrative before mandate evaluation.",
        primary: {
          label: validating ? "Validating…" : "Validate Proposal",
          onClick: () => void handleValidateProposal(),
          disabled: validateDisabled,
          loading: validating,
        },
      };
    }
    if (key === "evaluate") {
      return {
        title: "Validation complete",
        helperLine: "Next step: Evaluate proposal",
        primary: {
          label: evaluating ? "Running…" : "Run AI Evaluation",
          onClick: () => void handleRunEvaluation(),
          disabled: evaluateDisabled,
          loading: evaluating,
        },
      };
    }
    return {
      title: "Next step: Generate report",
      helperLine: "Create the committee-ready memo from the report engine.",
      primary: {
        label: generatingReport ? "Generating…" : "Generate Report",
        onClick: () => void handleGenerateReport(),
        disabled: reportDisabled,
        loading: generatingReport,
      },
    };
  })();

  const systemWorkflowStatus = (() => {
    if (validating) {
      return {
        label: "Validating",
        detail: "Running AI checks on extracted proposal text.",
      };
    }
    if (!hasProposalDocuments) {
      return {
        label: "Awaiting upload",
        detail: "Upload documents to start extraction and downstream review.",
      };
    }
    if (extractLoading || extractionStatus === "processing") {
      return {
        label: "Extracting",
        detail: "Converting files into searchable text for validation and scoring.",
      };
    }
    if (extractionStatus === "failed") {
      return {
        label: "Extraction issue",
        detail: "Fix extraction errors on the Documents tab before validating.",
      };
    }
    if (extractionStatus !== "completed") {
      return {
        label: "Uploaded",
        detail: "Documents on file. Extraction should finish shortly—refresh if the preview stays empty.",
      };
    }
    if (!hasValidated) {
      return {
        label: "Ready to validate",
        detail: "Extraction finished. Run validation before mandate evaluation.",
      };
    }
    if (!hasEvaluation) {
      return {
        label: "Validation complete",
        detail: "Next step: Evaluate proposal — open the Evaluation tab to run AI evaluation.",
      };
    }
    if (!hasGeneratedReport) {
      return {
        label: "Ready for report",
        detail: "Evaluation on file. Generate the investment report when ready.",
      };
    }
    return {
      label: "Pipeline complete",
      detail: "Validation, evaluation, and report steps are done. Review results in the Evaluation tab.",
    };
  })();

  const pipelineStepHints: Record<(typeof workflowSteps)[number]["key"], string> = {
    upload_extract: "Upload documents; text is extracted automatically for validation and scoring.",
    validate: "Structured checks on narrative, financial cues, and risk signals.",
    evaluate: "Scores fit against the selected fund mandate with rationale.",
    report: "Generate the investment memo or committee-ready report.",
  };

  return (
    <div className="min-h-screen scroll-smooth bg-slate-50/80">
      <div className="mx-auto max-w-6xl space-y-7 px-4 py-7 sm:px-6 lg:px-8 animate-in fade-in duration-700 ease-out">
      {canManageDocuments && (
        <input
          type="file"
          accept=".pdf,.doc,.docx,.xls,.xlsx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
          className="hidden"
          ref={fileInputRef}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) {
              const ext = file.name.toLowerCase().slice(file.name.lastIndexOf("."));
              const allowedExtensions = [".pdf", ".doc", ".docx", ".xls", ".xlsx"];
              if (!allowedExtensions.includes(ext)) {
                setMessage({ text: "Only PDF, DOC, DOCX, XLS, and XLSX files are supported.", type: "error" });
                if (fileInputRef.current) fileInputRef.current.value = "";
                return;
              }
              handleUpload(file);
            }
          }}
        />
      )}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <Link href="/dashboard/proposals">
          <Button variant="ghost" size="sm" className="text-slate-600 transition-colors duration-200 hover:text-slate-900 -ml-2">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
        <div className="flex flex-wrap items-center gap-2">
            {workflowActiveIndex === 3 && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleGenerateReport}
              disabled={reportDisabled}
              className={cn(
                "shadow-sm transition-all duration-200 ease-out active:scale-[0.98]",
                reportToolbarPrimary
                  ? "border-blue-950 bg-blue-950 text-white hover:bg-blue-900 hover:text-white hover:-translate-y-0.5 hover:shadow-md"
                  : "border-slate-100 bg-white text-slate-500 hover:bg-slate-50/90 hover:text-slate-700 hover:-translate-y-px"
              )}
            >
              {generatingReport ? <Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> : <FileOutput className={cn("h-4 w-4 mr-1.5", reportToolbarPrimary ? "text-white" : "text-slate-500")} />}
              Generate Report
            </Button>
            )}
            {statusKey(effectiveProposalStatus) === "new" && (
              <Button variant="secondary" size="sm" className="bg-slate-100 text-slate-800 transition-all duration-200 hover:-translate-y-px">
                <UserPlus className="h-4 w-4 mr-1.5" />
                Assign Assessor
              </Button>
            )}
            {statusKey(effectiveProposalStatus) === "in_review" && (
              <>
                <Button variant="outline" size="sm" className="border-slate-100 text-slate-700 transition-all duration-200 hover:bg-slate-50 hover:-translate-y-px">
                  <XCircle className="h-4 w-4 mr-1.5" />
                  Decline
                </Button>
                <Button size="sm" className="bg-blue-950 text-white transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]">
                  <CheckCircle className="h-4 w-4 mr-1.5" />
                  Approve
                </Button>
              </>
            )}
          </div>
      </div>

      {/* Enterprise summary header */}
      <div className="overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.06)] transition-shadow duration-300 hover:shadow-[0_4px_16px_rgba(15,23,42,0.07)]">
        <div className="border-b border-white/10 bg-blue-950 px-6 py-5 text-white">
          <div className="flex flex-col gap-1 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-400">Proposal</p>
              <h1 className="mt-1.5 text-xl font-semibold tracking-tight sm:text-2xl">{proposal.proposal_name}</h1>
              <p className="mt-1 font-mono text-xs text-slate-400/90">{proposal.proposal_id}</p>
            </div>
            <div className="mt-3 flex flex-wrap items-center gap-2 lg:mt-0">
              <Link href={`/dashboard/proposals/${proposal.proposal_id}/evaluation`}>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  className="border-white/20 bg-white/10 text-white hover:bg-white/20"
                >
                  Evaluation workspace
                </Button>
              </Link>
              <StatusBadge variant={getStatusVariant(effectiveProposalStatus)} icon={StatusIcon}>
                {formatStatusLabel(effectiveProposalStatus)}
              </StatusBadge>
            </div>
          </div>
        </div>
        <div className="grid gap-4 px-6 py-5 sm:grid-cols-2 lg:grid-cols-5">
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Applicant</p>
            <p className="text-sm font-medium text-slate-900">{proposal.applicant_name}</p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Fund</p>
            <p className="text-sm font-medium text-slate-900">
              {proposal.fund_id ? (proposal.fund_name ?? proposal.fund_id) : "—"}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Requested amount</p>
            <p className="text-sm font-medium tabular-nums text-slate-900">
              {proposal.requested_amount != null ? formatAmount(proposal.requested_amount) : "—"}
            </p>
          </div>
          <div className="space-y-1.5">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Submitted</p>
            <p className="text-sm font-medium text-slate-900">{formatDate(proposal.created_at)}</p>
          </div>
          <div className="space-y-1.5 sm:col-span-2 lg:col-span-1">
            <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Workflow</p>
            <p className="text-sm text-slate-600">
              Step {Math.min(workflowCurrentStep + 1, 4)} of 4
              {workflowActiveIndex === -1 ? " · Complete" : ""}
            </p>
          </div>
        </div>
      </div>

      {/* Global workflow progress (visible on all tabs) */}
      <div
        className="rounded-[12px] border border-slate-100 bg-white px-3 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-5 sm:py-3.5"
        role="navigation"
        aria-label="Proposal workflow progress"
      >
        <div className="grid grid-cols-4 gap-1 sm:gap-2">
          {workflowSteps.map((step, i) => {
            const isComplete = step.done;
            const isCurrent =
              workflowHighlightIndex !== -1 && i === workflowHighlightIndex && !isComplete;
            const tab = workspaceTabForStepIndex(i);
            const shortLabels = ["Upload & Extract", "Validate", "Evaluate", "Report"] as const;
            return (
              <button
                key={step.key}
                type="button"
                onClick={() => handleWorkspaceTabChange(tab)}
                className={cn(
                  "group flex min-w-0 flex-col items-center rounded-lg px-0.5 py-1 text-center transition-colors outline-none focus-visible:ring-2 focus-visible:ring-blue-950/30 focus-visible:ring-offset-2",
                  "hover:bg-slate-50/90"
                )}
                title={`${pipelineStepHints[step.key]} · Opens ${tab === "documents" ? "Documents & Extraction" : tab === "evaluation" ? "Evaluation" : "Overview"}`}
                aria-current={isCurrent ? "step" : undefined}
              >
                <span
                  className={cn(
                    "flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold transition-colors sm:h-9 sm:w-9 sm:text-xs",
                    isComplete &&
                      "border-emerald-600 bg-emerald-600 text-white shadow-sm [&_svg]:stroke-[3]",
                    !isComplete &&
                      isCurrent &&
                      "border-blue-950 bg-blue-50 text-blue-950 shadow-sm ring-2 ring-blue-950/20",
                    !isComplete && !isCurrent && "border-slate-200 bg-slate-50/80 text-slate-400"
                  )}
                >
                  {isComplete ? (
                    <Check className="h-3.5 w-3.5 sm:h-4 sm:w-4" aria-hidden />
                  ) : (
                    <span aria-hidden>{i + 1}</span>
                  )}
                </span>
                <span
                  className={cn(
                    "mt-1.5 line-clamp-2 w-full text-[10px] font-medium leading-tight sm:text-[11px]",
                    isComplete && "text-slate-800",
                    isCurrent && "font-semibold text-blue-950",
                    !isComplete && !isCurrent && "text-slate-400"
                  )}
                >
                  {shortLabels[i]}
                </span>
              </button>
            );
          })}
        </div>
        <div className="mt-3 flex h-1.5 gap-1 sm:gap-1.5" aria-hidden>
          {workflowSteps.map((step, i) => {
            const isComplete = step.done;
            const isCurrent =
              workflowHighlightIndex !== -1 && i === workflowHighlightIndex && !isComplete;
            return (
              <div
                key={`bar-${step.key}`}
                className={cn(
                  "h-full min-w-0 flex-1 rounded-full transition-colors duration-300",
                  isComplete && "bg-emerald-500",
                  !isComplete && isCurrent && "bg-blue-600",
                  !isComplete && !isCurrent && "bg-slate-200"
                )}
              />
            );
          })}
        </div>
      </div>

      {/* Primary workflow CTA — one action for current step; visible on every tab */}
      <Card
        id="proposal-validation-section"
        className="scroll-mt-24 overflow-hidden rounded-[14px] border border-slate-100 bg-slate-50/50 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 ease-out hover:shadow-[0_6px_20px_rgba(15,23,42,0.07)] border-l-[3px] border-l-blue-950"
      >
        <CardHeader className="border-b border-slate-100 bg-white/90 py-4">
          <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">
            {workflowGuidance.title}
          </CardTitle>
          <p className="mt-1.5 text-sm text-slate-500">{workflowGuidance.helperLine}</p>
        </CardHeader>
        <CardContent className="py-4">
          {(extractLoading || extractionStatus === "processing") &&
            hasProposalDocuments &&
            extractionStatus !== "completed" && (
            <div className="mb-4 h-1 w-full max-w-md overflow-hidden rounded-full bg-slate-100" aria-hidden>
              <div className="h-full w-full origin-left animate-pulse bg-slate-500/70" />
            </div>
          )}
          {workflowGuidance.primary ? (
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
              <Button
                size="lg"
                onClick={workflowGuidance.primary.onClick}
                disabled={workflowGuidance.primary.disabled}
                className="w-full shrink-0 bg-blue-950 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60 sm:w-auto"
              >
                {workflowGuidance.primary.loading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : workflowActiveIndex === 0 ? (
                  <Upload className="h-4 w-4 mr-2" />
                ) : workflowActiveIndex === 1 ? (
                  <ShieldCheck className="h-4 w-4 mr-2" />
                ) : workflowActiveIndex === 2 ? (
                  <Play className="h-4 w-4 mr-2" />
                ) : (
                  <FileOutput className="h-4 w-4 mr-2" />
                )}
                {workflowGuidance.primary.label}
              </Button>
            </div>
          ) : workflowActiveIndex === -1 ? (
            <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
              <CheckCircle className="h-5 w-5 shrink-0 text-slate-700" />
              <span>Pipeline complete. Review validation on Overview, then mandate fit and AI memo on Evaluation.</span>
            </div>
          ) : (extractLoading || extractionStatus === "processing") &&
            hasProposalDocuments &&
            extractionStatus !== "completed" ? (
            <p className="text-sm text-slate-500">
              Extracting document text—watch the preview on the Documents &amp; Extraction tab.
            </p>
          ) : (
            <p className="text-sm text-slate-500">
              {workflowActiveIndex === 0 && !canManageDocuments
                ? "You do not have permission to upload documents for this proposal."
                : "Continue in the tab shown above when you are ready."}
            </p>
          )}
        </CardContent>
      </Card>

      <Tabs value={workspaceTab} onValueChange={handleWorkspaceTabChange} className="w-full">
        <TabsList className="grid h-auto w-full grid-cols-3 gap-1 rounded-[12px] border border-slate-100 bg-slate-50/90 p-1.5 shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
          <TabsTrigger value="overview" className="text-sm py-2.5 transition-all duration-200">
            Overview
          </TabsTrigger>
          <TabsTrigger value="documents" className="text-sm py-2.5 transition-all duration-200">
            Documents &amp; Extraction
          </TabsTrigger>
          <TabsTrigger
            value="evaluation"
            disabled={workflowActiveIndex >= 0 && workflowActiveIndex < 2}
            className="text-sm py-2.5 transition-all duration-200 data-[disabled]:pointer-events-none data-[disabled]:opacity-45"
          >
            Evaluation
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6 space-y-8 outline-none animate-in fade-in duration-300">
      {/* System workflow status */}
      <div
        className="flex flex-col gap-1 rounded-[14px] border border-slate-100 bg-white px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-all duration-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)] sm:flex-row sm:items-center sm:justify-between sm:gap-4"
        role="status"
        aria-live="polite"
      >
        <div className="flex min-w-0 items-center gap-2.5">
          <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Status</span>
          <span className="text-sm font-semibold text-slate-900">{systemWorkflowStatus.label}</span>
          {extractLoading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" aria-hidden />
          )}
          {validating && !extractLoading && (
            <Loader2 className="h-4 w-4 shrink-0 animate-spin text-slate-500" aria-hidden />
          )}
        </div>
        <p className="text-[13px] leading-snug text-slate-500 sm:max-w-xl sm:text-right">{systemWorkflowStatus.detail}</p>
      </div>

        {hasValidated ? (
        <div className="scroll-mt-24">
          <DataCard
            title="AI validation summary"
            description="Checks extracted text for completeness so you see gaps before mandate fit—not a substitute for IC judgment."
            accent="blue"
            titleBadges={
              <>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-100">
                  AI insight
                </span>
                <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-100">
                  <Sparkles className="h-3 w-3" />
                  Powered by AI
                </span>
              </>
            }
          >
            {validationResultsDisplay ? (
              <div className="space-y-5 animate-in fade-in duration-300">
                <div>
                  <h4 className="text-base font-semibold tracking-tight text-slate-900">Validation Results</h4>
                  <div className="mt-4 space-y-2">
                    <p className="text-sm font-medium text-slate-700">
                      Validation Score:{" "}
                      <span
                        className={cn(
                          "text-4xl font-bold tabular-nums tracking-tight",
                          validationScoreBandClass(validationResultsDisplay.score)
                        )}
                      >
                        {validationResultsDisplay.score}
                      </span>
                      <span
                        className={cn(
                          "text-2xl font-bold tabular-nums",
                          validationScoreBandClass(validationResultsDisplay.score)
                        )}
                      >
                        {" "}
                        / 100
                      </span>
                    </p>
                    <p className="text-sm text-slate-700">
                      Status:{" "}
                      <span
                        className={cn(
                          "text-base font-semibold",
                          validationResultsDisplay.overallLabel === "Ready for evaluation" && "text-emerald-700",
                          validationResultsDisplay.overallLabel === "Needs attention" && "text-amber-800",
                          validationResultsDisplay.overallLabel === "Critical gaps" && "text-red-800"
                        )}
                      >
                        {validationResultsDisplay.overallLabel}
                      </span>
                    </p>
                    <p className="text-xs text-slate-500">
                      Narrative keyword scan—not a substitute for IC judgment.
                    </p>
                  </div>
                  <ul className="mt-5 space-y-3" aria-label="Validation checklist">
                    {validationResultsDisplay.checks.map((c) => {
                      const detail = "detail" in c ? c.detail : undefined;
                      return (
                        <li key={c.id} className="flex items-start gap-3">
                          {c.passed ? (
                            <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                          ) : (
                            <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-amber-600" aria-hidden />
                          )}
                          <span className="text-sm leading-snug text-slate-800">
                            {c.passed ? (
                              <>
                                <span className="font-medium">{c.label}</span>
                                {detail != null && detail !== "" && (
                                  <span className="text-slate-600">: {detail}</span>
                                )}
                                {c.id !== "completeness" && !detail && (
                                  <span className="text-slate-600"> present</span>
                                )}
                              </>
                            ) : c.id === "completeness" ? (
                              <>
                                <span className="font-medium">{c.label}</span>
                                {detail != null && <span className="text-slate-600">: {detail}</span>}
                              </>
                            ) : (
                              <span className="font-medium text-slate-900">{"issue" in c ? c.issue : c.label}</span>
                            )}
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </div>
            ) : null}
          </DataCard>
        </div>
        ) : null}

        <Card className="overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
          <CardHeader className="border-b border-slate-100 pb-4">
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-slate-600" />
              <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">Proposal details</CardTitle>
            </div>
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">Core proposal metadata and identifiers</p>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Proposal ID</p>
                <p className="text-sm text-slate-700 font-mono">{proposal.proposal_id}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Building className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Applicant</p>
                <p className="text-sm text-slate-700">{proposal.applicant_name}</p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <DollarSign className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Requested Amount</p>
                <p className="text-sm text-slate-700">
                  {proposal.requested_amount != null
                    ? formatAmount(proposal.requested_amount)
                    : "—"}
                </p>
              </div>
            </div>
            <div className="flex items-start gap-3">
              <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Submitted</p>
                <p className="text-sm text-slate-700">{formatDate(proposal.created_at)}</p>
              </div>
            </div>
            {proposal.sector && (
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Sector</p>
                  <p className="text-sm text-slate-700">{proposal.sector}</p>
                </div>
              </div>
            )}
            {proposal.stage && (
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Stage</p>
                  <p className="text-sm text-slate-700">{proposal.stage}</p>
                </div>
              </div>
            )}
            {proposal.geography && (
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Geography</p>
                  <p className="text-sm text-slate-700">{proposal.geography}</p>
                </div>
              </div>
            )}
            {proposal.business_model && (
              <div className="flex items-start gap-3">
                <Briefcase className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Business model</p>
                  <p className="text-sm text-slate-700">{proposal.business_model}</p>
                </div>
              </div>
            )}
            {proposal.description && (
              <div className="flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground mt-0.5" />
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500">Description</p>
                  <p className="text-sm text-slate-700 whitespace-pre-wrap">{proposal.description}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <DataCard
          title="Comments"
          description="Internal collaboration — notes, questions, risks, and decisions for this proposal."
          className="border-border bg-card shadow-soft transition-all duration-300 hover:shadow-card"
          titleBadges={
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-0.5 text-[11px] font-medium text-slate-600">
              <MessageSquare className="h-3 w-3" aria-hidden />
              Team
            </span>
          }
        >
          <div className="space-y-6">
            {commentsLoading ? (
              <div className="flex items-center gap-2 text-sm text-slate-500">
                <Loader2 className="h-4 w-4 animate-spin text-slate-400" aria-hidden />
                Loading comments…
              </div>
            ) : comments.length === 0 ? (
              <p className="text-sm text-slate-500">No comments yet. Be the first to add context for reviewers.</p>
            ) : (
              <ul className="space-y-3">
                {comments.map((c) => (
                  <li
                    key={c.comment_id}
                    className="rounded-[12px] border border-slate-100 bg-slate-50/50 px-4 py-3 shadow-[0_1px_2px_rgba(15,23,42,0.04)]"
                  >
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      <Badge
                        variant="outline"
                        className="border-slate-200/90 bg-white text-[11px] font-semibold capitalize text-slate-800"
                      >
                        {c.comment_type}
                      </Badge>
                      <span className="text-xs font-medium text-slate-700">
                        {c.user_name?.trim() ? c.user_name : c.user_id}
                      </span>
                      <span className="text-xs tabular-nums text-slate-400">{formatDate(c.created_at)}</span>
                    </div>
                    <p className="mt-2.5 text-sm leading-relaxed text-slate-800 whitespace-pre-wrap">{c.comment_text}</p>
                  </li>
                ))}
              </ul>
            )}

            <div className="border-t border-slate-100 pt-6">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Add a comment</p>
              <div className="mt-3 flex flex-col gap-4 sm:flex-row sm:items-start">
                <div className="min-w-0 flex-1 space-y-2">
                  <Textarea
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Write a comment…"
                    rows={4}
                    disabled={isReadOnly || postingComment}
                    className="min-h-[100px] resize-y border-slate-200 bg-white text-sm"
                  />
                </div>
                <div className="flex w-full flex-col gap-3 sm:w-44 sm:shrink-0">
                  <div className="space-y-1.5">
                    <span className="text-xs font-medium text-slate-600">Type</span>
                    <Select
                      value={commentType}
                      onValueChange={(v) => setCommentType(v as typeof commentType)}
                      disabled={isReadOnly || postingComment}
                    >
                      <SelectTrigger className="h-10 border-slate-200 bg-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="note">Note</SelectItem>
                        <SelectItem value="question">Question</SelectItem>
                        <SelectItem value="risk">Risk</SelectItem>
                        <SelectItem value="decision">Decision</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button
                    type="button"
                    className="h-10 w-full bg-blue-950 text-white shadow-sm transition-all duration-200 hover:bg-blue-900 disabled:opacity-50"
                    onClick={() => void handlePostComment()}
                    disabled={isReadOnly || postingComment || !commentText.trim()}
                  >
                    {postingComment ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Posting…
                      </>
                    ) : (
                      "Post Comment"
                    )}
                  </Button>
                </div>
              </div>
              {isReadOnly && (
                <p className="mt-3 text-xs text-slate-500">You have read-only access and cannot post comments.</p>
              )}
            </div>
          </div>
        </DataCard>

        <div className="grid gap-5 md:grid-cols-2">
          <Card className="overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Building className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">Fund & mandate</CardTitle>
              </div>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Fund selection drives mandate templates used in evaluation</p>
            </CardHeader>
            <CardContent className="space-y-4 overflow-visible pt-4">
              <div className="space-y-2">
                <p className="text-sm font-medium text-slate-900">Selected fund</p>
                {proposal.fund_id ? (
                  <p className="text-sm text-slate-600">
                    {proposal.fund_name ?? proposal.fund_id}
                  </p>
                ) : (
                  <p className="text-sm text-slate-700">Select a fund before evaluation.</p>
                )}
                <p className="text-xs text-slate-500">This is the fund against which the proposal will be evaluated.</p>
              </div>
              <div className="space-y-2 overflow-visible pt-1">
                <p className="text-sm font-medium text-slate-900">Select fund to view mandates</p>
                <Select
                  value={selectedFundId}
                  onValueChange={setSelectedFundId}
                  disabled={loadingFunds}
                >
                  <SelectTrigger className="w-full min-h-10 border-slate-100">
                    <SelectValue placeholder={loadingFunds ? "Loading funds..." : "Select a fund"} />
                  </SelectTrigger>
                  <SelectContent className="z-[100]" position="popper" sideOffset={4} collisionPadding={8}>
                    {funds.map((fund) => (
                      <SelectItem key={fund.id} value={fund.id}>
                        {fund.name} {fund.code ? `(${fund.code})` : ""}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          <Card className="overflow-hidden rounded-[14px] border border-slate-100 bg-white shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
            <CardHeader className="border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-slate-600" />
                <CardTitle className="text-xl font-semibold tracking-tight text-slate-900">Review queue & assignment</CardTitle>
              </div>
              <p className="text-sm text-slate-500 mt-1 leading-relaxed">Reviewer routing and priority for this proposal</p>
            </CardHeader>
            <CardContent className="space-y-4 pt-4">
              <div>
                <p className="text-sm font-medium mb-2 text-slate-900">Review priority</p>
                <StatusBadge variant={getPriorityVariant(proposal.review_priority)}>
                  {formatPriorityLabel(proposal.review_priority)}
                </StatusBadge>
              </div>
              <div className="flex items-start gap-3">
                <User className="h-5 w-5 text-slate-500 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-slate-900">Reviewer</p>
                  <p className="text-sm text-slate-600">
                    {assignment?.assignedToName || "Not assigned"}
                  </p>
                  <p className="text-xs text-slate-500">Optional. Assign a reviewer if needed.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

      {/* Mandate Files Panel - shows when a fund is selected */}
      {selectedFundId && (
        <DataCard
          title={`Mandate Files for This Fund: ${funds.find(f => f.id === selectedFundId)?.name || "Selected Fund"}`}
          description="These files define the investment criteria used during evaluation."
        >
          {loadingFundMandates ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              <span className="ml-2 text-muted-foreground">Loading mandates...</span>
            </div>
          ) : fundMandates.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="font-medium">No mandate files found for this fund.</p>
              <p className="text-sm mt-2">Upload one in Funds &gt; Mandates.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Mandate</TableHead>
                  <TableHead>Strategy</TableHead>
                  <TableHead>Geography</TableHead>
                  <TableHead>Ticket Range</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fundMandates.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <div>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground font-mono">{m.id}</p>
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{m.strategy}</TableCell>
                    <TableCell className="text-muted-foreground">{m.geography}</TableCell>
                    <TableCell className="text-muted-foreground tabular-nums">
                      {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(m.minTicket)} - {new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 0 }).format(m.maxTicket)}
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={m.status === "active" ? "success" : m.status === "draft" ? "warning" : "muted"}
                      >
                        {m.status.charAt(0).toUpperCase() + m.status.slice(1)}
                      </StatusBadge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </DataCard>
      )}

      {/* Mandate Used for Evaluation Card */}
      <DataCard
        title="Mandate Used for Evaluation"
        description={mandate ? `Mandate template for ${proposal.fund_name ?? proposal.fund_id}` : undefined}
        className="border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]"
        noPadding={!mandateLoading && !mandateError && !!mandate}
      >
        {mandateLoading ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-6 w-6 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading mandate information...</p>
          </div>
        ) : mandateError ? (
          <div className="p-6 text-center text-muted-foreground">
            <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">{mandateError}</p>
          </div>
        ) : mandate ? (
          <div>
            <div className="border-b border-slate-100 bg-white px-5 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Active mandate</p>
              <p className="text-base font-semibold text-slate-900">{mandate.mandateName}</p>
            </div>
            {/* Key criteria used for evaluation */}
            <div className="grid gap-3.5 p-5 border-b md:grid-cols-2 lg:grid-cols-4">
              <div className="flex items-start gap-3">
                <Target className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Sector & strategy</p>
                  <p className="text-sm font-medium text-slate-900">
                    {mandate.strategy?.trim() ? mandate.strategy : "No constraints defined"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Geography</p>
                  <p className="text-sm font-medium text-slate-900">
                    {mandate.geography?.trim() ? mandate.geography : "No constraints defined"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <TrendingUp className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Stage (proposal)</p>
                  <p className="text-sm font-medium text-slate-900">
                    {proposal.stage?.trim() ? proposal.stage : "Not specified on proposal"}
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <DollarSign className="h-5 w-5 text-slate-600 mt-0.5 shrink-0" />
                <div>
                  <p className="text-xs font-medium text-slate-600">Ticket size</p>
                  <p className="text-sm font-medium text-slate-900">
                    {mandate.ticketRange?.trim() ? mandate.ticketRange : "No constraints defined"}
                  </p>
                </div>
              </div>
            </div>

            {/* Version Info */}
            <div className="flex items-center justify-between px-5 py-3 border-b bg-muted/20">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Hash className="h-4 w-4" />
                <span>Version {mandate.version}</span>
                <StatusBadge
                  variant={mandate.status === "active" ? "success" : mandate.status === "draft" ? "warning" : "muted"}
                >
                  {mandate.status}
                </StatusBadge>
              </div>
            </div>

            {/* Template Files */}
            {mandate.templateFiles.length > 0 ? (
              <div>
                <div className="px-5 py-3 border-b bg-muted/10">
                  <p className="text-sm font-medium">Template Files</p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>File Name</TableHead>
                      <TableHead className="text-right">Size</TableHead>
                      <TableHead>Uploaded</TableHead>
                      <TableHead className="w-24"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mandate.templateFiles.map((file) => (
                      <TableRow key={file.blobPath} className="group">
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <FileText className="h-4 w-4 text-muted-foreground" />
                            <span className="font-medium">{file.name}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums">
                          {formatFileSize(file.size)}
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(file.uploadedAt)}
                        </TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleMandateFileDownload(file.blobPath)}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Download className="h-4 w-4 mr-1" />
                            Download
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="border-t px-5 py-3 text-sm text-slate-600">
                No mandate template files on file. Mandate criteria above still applies; add templates under Funds → Mandates if needed.
              </div>
            )}
          </div>
        ) : (
          <div className="p-6 text-center text-muted-foreground">
            <FileStack className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">No mandate information available</p>
          </div>
        )}
      </DataCard>

        </TabsContent>

        <TabsContent value="documents" className="mt-6 space-y-8 outline-none animate-in fade-in duration-300">
      {/* Proposal documents & extracted preview — single upload entry point */}
      <div id="proposal-documents-section" className="scroll-mt-24">
      <DataCard
        title="Proposal documents"
        description="Secure upload for diligence. Formats: PDF, Word (.doc/.docx), Excel (.xls/.xlsx). Maximum 25MB per file."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => loadDocuments()}
              disabled={loading}
              className="text-slate-600 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-900"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            {canManageDocuments && documents.length > 0 && (
              <div className="flex flex-col items-end gap-1">
                <Button
                  size="lg"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="h-11 min-w-[140px] bg-blue-950 px-6 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-1.5" />
                  )}
                  Upload another document
                </Button>
                <p className="text-right text-[11px] leading-tight text-muted-foreground/85">
                  Optional: upload if needed
                </p>
              </div>
            )}
          </div>
        }
        noPadding
      >
        {/* NEW: Status message */}
        {message && (
          <div className={`px-6 py-3 text-sm border-b ${
            message.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {message.text}
          </div>
        )}

        {/* NEW: Documents list */}
        {loading && documents.length === 0 ? (
          <div className="flex min-h-[200px] flex-col items-center justify-center gap-3 px-6 py-12 text-center">
            <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
            <p className="text-sm font-medium text-slate-700">Loading documents…</p>
            <p className="max-w-sm text-xs text-slate-500">Preparing your file list</p>
          </div>
        ) : documents.length === 0 ? (
          <div
            className={cn(
              "mx-6 my-5 flex min-h-[232px] flex-col items-center justify-center rounded-[13px] border-2 border-dashed border-slate-200/90 bg-slate-50/50 px-6 py-8 text-center transition-all duration-200 ease-out",
              canManageDocuments && "hover:border-slate-300/90 hover:bg-slate-50/80",
              proposalDocDropHighlight &&
                canManageDocuments &&
                "border-blue-950/35 bg-blue-50/65 shadow-[0_0_0_3px_rgba(30,58,138,0.08)]"
            )}
            onDragEnter={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canManageDocuments) return;
              proposalDocDragDepth.current += 1;
              setProposalDocDropHighlight(true);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              if (!canManageDocuments) return;
              proposalDocDragDepth.current -= 1;
              if (proposalDocDragDepth.current <= 0) {
                proposalDocDragDepth.current = 0;
                setProposalDocDropHighlight(false);
              }
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              proposalDocDragDepth.current = 0;
              setProposalDocDropHighlight(false);
              if (!canManageDocuments) return;
              tryAcceptProposalFile(e.dataTransfer.files?.[0]);
            }}
          >
            <div className="rounded-full border border-slate-100 bg-white p-3.5 shadow-[0_1px_2px_rgba(15,23,42,0.06)]">
              <Upload className="h-7 w-7 text-slate-700" />
            </div>
            <p className="mt-4 text-lg font-semibold tracking-tight text-slate-900">Drop files here or upload</p>
            <p className="mt-2 max-w-lg text-sm leading-relaxed text-slate-500">
              PDF, Microsoft Word, or Excel · up to 25MB each. Files are scanned for text extraction, validation, and
              mandate evaluation.
            </p>
            {canManageDocuments ? (
              <Button
                size="lg"
                className="mt-6 h-11 min-w-[200px] bg-blue-950 px-8 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading}
              >
                {uploading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Upload className="h-4 w-4 mr-2" />
                )}
                Upload proposal files
              </Button>
            ) : (
              <p className="mt-4 text-sm text-slate-600">You do not have permission to upload for this proposal.</p>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow className="bg-slate-50/80 hover:bg-slate-50/80">
                <TableHead className="font-semibold text-slate-700">File Name</TableHead>
                <TableHead className="font-semibold text-slate-700">Type</TableHead>
                <TableHead className="text-right font-semibold text-slate-700">Size</TableHead>
                <TableHead className="font-semibold text-slate-700">Uploaded</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.map((doc) => (
                <TableRow key={doc.blobPath} className="group hover:bg-slate-50/80 transition-colors">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-muted-foreground" />
                      <span className="font-medium truncate max-w-[200px]" title={doc.filename}>
                        {doc.filename}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {getFileTypeDisplay(doc.contentType)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {formatFileSize(doc.size)}
                  </TableCell>
                  <TableCell className="text-muted-foreground">
                    {formatDate(doc.uploadedAt)}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDownload(doc.blobPath)}
                        title="Download"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {canManageDocuments && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleDelete(doc.blobPath, doc.filename)}
                          disabled={deleting === doc.blobPath}
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          title="Delete"
                        >
                          {deleting === doc.blobPath ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </DataCard>
      </div>

      {/* AI extraction preview */}
      <DataCard
        title="AI extraction preview"
        description="Structured signals pulled from documents to power validation, scoring, and reporting"
        className="border-border bg-card shadow-soft transition-all duration-300 hover:shadow-card"
        actions={
          documents.length > 0 && extractionStatus === "completed" ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => void loadExtractedContent({ silent: true, forRefresh: true })}
              disabled={refreshExtractLoading || extractLoading || documents.length === 0}
              className="text-slate-600 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-900 disabled:opacity-50"
            >
              {refreshExtractLoading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh preview
            </Button>
          ) : null
        }
      >
        {documents.length > 0 && extractionStatus !== "completed" && (
          <div className="min-h-[148px] border-b border-slate-100 bg-slate-50/50 px-5 py-5 transition-opacity duration-200 sm:px-6">
            {(extractLoading || extractionStatus === "processing") ? (
              <div className="space-y-4" aria-busy="true" aria-live="polite">
                <div className="flex items-start gap-3">
                  <Loader2 className="h-7 w-7 shrink-0 animate-spin text-blue-950" aria-hidden />
                  <div>
                    <p className="text-base font-semibold text-slate-900">Extracting document...</p>
                    <p className="mt-1 text-sm text-slate-600">This usually takes 10–30 seconds</p>
                  </div>
                </div>
                <div className="h-1.5 w-full max-w-lg overflow-hidden rounded-full bg-slate-200" aria-hidden>
                  <div className="h-full w-full animate-pulse bg-slate-500/70" />
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">Next step</p>
                  <h3 className="mt-1.5 text-lg font-semibold tracking-tight text-slate-900">
                    Next step: Extract document text
                  </h3>
                  <p className="mt-1.5 text-sm font-medium text-slate-800">Extraction not started yet</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">
                    Start extraction to analyze the uploaded document
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-slate-500">
                    Click &quot;Run Extraction&quot; to process the uploaded document
                  </p>
                </div>
                {extractError && (
                  <Alert variant="destructive" className="border-red-200 bg-red-50/90">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription className="space-y-2">
                      <p className="font-medium leading-snug text-red-950 dark:text-red-50">
                        Extraction failed. Unable to process the document.
                      </p>
                      <p className="text-sm leading-relaxed text-red-900 dark:text-red-100">
                        Please try again or upload a different file.
                      </p>
                      <p className="text-xs leading-relaxed text-red-800/85 dark:text-red-200/90">
                        {EXTRACTION_SUPPORTED_FORMATS_HELPER}
                      </p>
                    </AlertDescription>
                  </Alert>
                )}
                <Button
                  size="lg"
                  type="button"
                  onClick={() => void loadExtractedContent({ silent: false })}
                  disabled={extractLoading || documents.length === 0}
                  className="h-11 min-w-[220px] bg-blue-950 px-8 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-50"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  {extractError ? "Run Extraction Again" : "Run Extraction"}
                </Button>
              </div>
            )}
          </div>
        )}

        {documents.length > 0 && extractionStatus === "completed" && (
          <div className="min-h-[148px] border-b border-slate-100 bg-slate-50/50 px-5 py-5 transition-opacity duration-200 sm:px-6">
            <div className="space-y-2">
              <div className="flex items-start gap-2">
                <CheckCircle className="mt-0.5 h-5 w-5 shrink-0 text-emerald-600" aria-hidden />
                <div>
                  <h3 className="text-lg font-semibold tracking-tight text-slate-900">Extraction complete</h3>
                  {hasValidated ? (
                    <>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">Validation complete</p>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">Next step: Evaluate proposal</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        Use the workflow banner at the top to run AI evaluation. Open the Evaluation tab when you want to review mandate fit.
                      </p>
                    </>
                  ) : (
                    <>
                      <p className="mt-1.5 text-sm font-semibold text-slate-900">Next step: Validate proposal</p>
                      <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                        Review extracted data and check for completeness before evaluation.
                      </p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-500">
                        Run validation from the workflow banner above—one primary action keeps the pipeline clear.
                      </p>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {documents.length === 0 ? (
          <div className="mx-auto max-w-2xl rounded-[13px] border border-slate-100 bg-white p-6 text-center shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
            <div className="flex flex-col items-center gap-2">
              <Sparkles className="h-4 w-4 shrink-0 text-slate-600" />
              <span className="text-base font-semibold tracking-tight text-slate-900">Ready when you upload</span>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-500">
              The extraction engine will identify and surface text relevant to investment review, including:
            </p>
            <ul className="mt-4 grid gap-2 text-left text-sm text-slate-700 sm:grid-cols-2">
              {[
                "Business model and narrative",
                "Financials, revenue, and forecasts",
                "Team, traction, and milestones",
                "Market, competition, and risks",
                "Funding ask and use of proceeds",
                "Legal / IP cues where stated",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2">
                  <span className="mt-1.5 h-1 w-1 shrink-0 rounded-full bg-slate-400" aria-hidden />
                  {item}
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs font-medium text-slate-500">
              Upload at least one document in the section above to run extraction automatically.
            </p>
          </div>
        ) : extractedContent ? (
          <div className="space-y-5">
            {aiExtractionSnippet ? (
              <div className="rounded-[13px] border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
                <div className="mb-2 flex flex-wrap items-center gap-2">
                  <Sparkles className="h-4 w-4 text-slate-800" />
                  <span className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-600">AI text summary</span>
                  <span className="rounded-full border border-slate-100 bg-slate-50 px-2 py-0.5 text-[10px] font-medium text-slate-800">
                    Preview
                  </span>
                </div>
                <p className="text-sm leading-relaxed text-slate-900">{aiExtractionSnippet}</p>
              </div>
            ) : null}
            <div className="space-y-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-slate-500">By file</p>
              {extractedContent.documents.map((doc, i) => (
                <div key={i} className="rounded-[13px] border border-slate-100 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition-shadow duration-200 hover:shadow-[0_4px_12px_rgba(15,23,42,0.05)]">
                  <p className="text-sm font-medium text-slate-900">{doc.filename}</p>
                  {doc.warning && (
                    <p className="text-xs text-amber-700 mb-2 mt-1">Note: {doc.warning}</p>
                  )}
                  <pre className="mt-2 text-xs text-slate-600 whitespace-pre-wrap max-h-52 overflow-y-auto font-sans leading-relaxed transition-colors duration-200">
                    {(doc.text || "(No text extracted)").slice(0, 2400)}
                    {doc.text && doc.text.length > 2400 ? "…" : ""}
                  </pre>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </DataCard>

        </TabsContent>

        <TabsContent value="evaluation" className="mt-6 space-y-10 outline-none animate-in fade-in duration-300">
        <div className="space-y-10">
        {!evaluationWorkspaceEnabled ? (
          <DataCard
            title="Evaluation not available yet"
            description="Complete AI validation on the Overview tab first. Mandate evaluation and reporting unlock after validation."
          >
            <Button
              type="button"
              className="bg-blue-950 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98]"
              onClick={() => {
                setWorkspaceTab("overview");
                queueMicrotask(() =>
                  document.getElementById("proposal-validation-section")?.scrollIntoView({
                    behavior: "smooth",
                    block: "start",
                  })
                );
              }}
            >
              Go to Overview for validation
            </Button>
          </DataCard>
        ) : (
          <>
            {displayedEvaluation?.validationSummary && (
              <div className="space-y-8">
                <DataCard title="Validation from Evaluation" description="From latest fund evaluation">
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">Score:</span>
                      <span className={displayedEvaluation.validationSummary.validationScore >= 70 ? "text-emerald-600" : "text-amber-600"}>
                        {displayedEvaluation.validationSummary.validationScore}
                      </span>
                    </div>
                    {displayedEvaluation.validationSummary.findings && displayedEvaluation.validationSummary.findings.length > 0 && (
                      <ul className="list-disc pl-5 text-sm text-muted-foreground">
                        {displayedEvaluation.validationSummary.findings.map((f, i) => (
                          <li key={i}>{f}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </DataCard>
              </div>
            )}

        {/* Mandate fit & evaluation */}
        <div className="space-y-8 border-t border-slate-100 pt-8">
      {/* Proposal evaluation */}
      <div id="proposal-evaluation-section" className="scroll-mt-24">
      <div className="mb-6 max-w-2xl">
        <h2 className="text-lg font-semibold tracking-tight text-slate-900">{evaluationSectionHeading}</h2>
        <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{evaluationSectionSub}</p>
      </div>
      <DataCard
        title="Proposal evaluation"
        description="AI-powered analysis of proposal against fund mandate"
        accent="blue"
        titleClassName="text-slate-900"
        titleBadges={
          <>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-100">
              AI scored
            </span>
            <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-800 border border-slate-100">
              <Sparkles className="h-3 w-3" />
              Powered by AI
            </span>
          </>
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={async () => {
                await Promise.all([
                  loadEvaluations(),
                  loadDocuments(),
                  loadMemos(),
                  displayedEvaluation ? loadSimilarDeals() : Promise.resolve(),
                ]);
              }}
              disabled={evaluationsLoading || loading}
              className="text-slate-600 transition-colors duration-200 hover:bg-slate-100/80 hover:text-slate-900"
            >
              {evaluationsLoading || loading ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4 mr-1" />
              )}
              Refresh
            </Button>
            {workflowActiveIndex !== 2 && (
            <Button
              size="sm"
              onClick={handleRunEvaluation}
              disabled={evaluateDisabled}
              className="bg-blue-950 text-white shadow-sm transition-all duration-200 ease-out hover:bg-blue-900 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.98] disabled:pointer-events-none disabled:opacity-60"
            >
              {evaluating ? (
                <Loader2 className="h-4 w-4 mr-1 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-1" />
              )}
              {evaluating ? "Running…" : "Run AI Evaluation"}
            </Button>
            )}
            {/* Report Generation Buttons - visible after at least one evaluation exists */}
            {evaluations.length > 0 && (
              <>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleGenerateMemo}
                  disabled={generatingMemo || isReadOnly}
                  className="border-amber-300 text-amber-700 hover:bg-amber-50"
                >
                  {generatingMemo ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileOutput className="h-4 w-4 mr-1" />
                  )}
                  Generate Evaluation Report
                </Button>
                {latestMemoBlobPath && (
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleDownloadMemo()}
                    className="border-emerald-300 text-emerald-700 hover:bg-emerald-50"
                  >
                    <Download className="h-4 w-4 mr-1" />
                    Download Report
                  </Button>
                )}
              </>
            )}
          </div>
        }
        noPadding
      >
        {evaluating && (
          <div
            className="border-b border-slate-100 bg-gradient-to-b from-slate-50/95 to-white px-6 py-8 sm:px-8"
            aria-busy="true"
            aria-live="polite"
          >
            <div className="flex max-w-xl items-start gap-4">
              <Loader2 className="h-8 w-8 shrink-0 animate-spin text-blue-950" aria-hidden />
              <div>
                <p className="text-base font-semibold tracking-tight text-slate-900">Running AI evaluation...</p>
                <p className="mt-1.5 text-sm leading-relaxed text-slate-600">
                  Analyzing proposal, risks, and financial signals
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Memo status message */}
        {memoMessage && (
          <div className={`px-6 py-3 text-sm border-b ${
            memoMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {memoMessage.text}
          </div>
        )}

        {/* Status message */}
        {evaluationMessage && (
          <div className={`px-6 py-3 text-sm border-b ${
            evaluationMessage.type === "success"
              ? "bg-emerald-50 text-emerald-700 border-emerald-100"
              : "bg-red-50 text-red-700 border-red-100"
          }`}>
            {evaluationMessage.text}
          </div>
        )}

        {evaluationsLoading && !displayedEvaluation ? (
          <div className="p-6 text-center text-muted-foreground">
            <Loader2 className="h-8 w-8 mx-auto mb-2 animate-spin opacity-50" />
            <p className="text-sm">Loading evaluations...</p>
          </div>
        ) : displayedEvaluation ? (
          <div className="animate-in fade-in duration-300">
            {/* Historical evaluation warning banner */}
            {viewingHistorical && (
              <div className="px-5 py-3 bg-slate-50 border-b border-slate-100">
                <div className="flex items-center justify-between">
                  <div className="flex items-start gap-2">
                    <History className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-slate-900">Viewing Historical Evaluation</p>
                      <p className="text-sm text-slate-600">This is not the most recent evaluation. Click &quot;Show Latest&quot; to view the newest one.</p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleShowLatest}
                    className="border-slate-100 text-slate-800 transition-all duration-200 hover:bg-slate-50/90 hover:-translate-y-px active:scale-[0.98]"
                  >
                    Show Latest
                  </Button>
                </div>
              </div>
            )}

            {/* Warning Banner: No documents/templates */}
            {displayedEvaluation.inputs.proposalDocuments === 0 && displayedEvaluation.inputs.mandateTemplates === 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No documents or templates available</p>
                    <p className="text-sm text-amber-700">Score is not meaningful yet. Upload proposal documents and configure mandate templates.</p>
                  </div>
                </div>
              </div>
            )}

            {/* Extraction Warnings Banner */}
            {displayedEvaluation.inputs.extractionWarnings && displayedEvaluation.inputs.extractionWarnings.length > 0 && (
              <div className="px-5 py-3 bg-amber-50 border-b border-amber-200">
                <div className="flex items-start gap-2">
                  <Info className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div className="flex-1">
                    <p className="text-sm font-medium text-amber-800">Text Extraction Warnings</p>
                    <ul className="mt-1 text-sm text-amber-700">
                      {displayedEvaluation.inputs.extractionWarnings.slice(0, 3).map((warning, i) => (
                        <li key={i}>• {warning}</li>
                      ))}
                      {displayedEvaluation.inputs.extractionWarnings.length > 3 && (
                        <li className="text-amber-600">
                          ... and {displayedEvaluation.inputs.extractionWarnings.length - 3} more
                        </li>
                      )}
                    </ul>
                    {/* Document Processing Stats */}
                    {(displayedEvaluation.inputs.processedDocumentsCount !== undefined ||
                      displayedEvaluation.inputs.truncatedDocumentsCount !== undefined ||
                      displayedEvaluation.inputs.skippedDocumentsCount !== undefined) && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs">
                        {displayedEvaluation.inputs.processedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.processedDocumentsCount > 0 && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs bg-emerald-100 text-emerald-700">
                              {displayedEvaluation.inputs.processedDocumentsCount} processed
                            </span>
                          )}
                        {displayedEvaluation.inputs.truncatedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.truncatedDocumentsCount > 0 && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs bg-amber-100 text-amber-700">
                              {displayedEvaluation.inputs.truncatedDocumentsCount} truncated
                            </span>
                          )}
                        {displayedEvaluation.inputs.skippedDocumentsCount !== undefined &&
                          displayedEvaluation.inputs.skippedDocumentsCount > 0 && (
                            <span className="inline-flex items-center rounded-full px-3 py-1 text-xs bg-red-100 text-red-700">
                              {displayedEvaluation.inputs.skippedDocumentsCount} skipped
                            </span>
                          )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Showing latest evaluation indicator */}
            {!viewingHistorical && (
              <div className="px-5 py-2 bg-emerald-50 border-t border-slate-100 border-b border-emerald-100 flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-emerald-600" />
                <span className="text-sm text-emerald-700">Showing latest evaluation</span>
              </div>
            )}

            <ProposalInvestmentDecisionPanel
              hasEvaluation
              fitScore={displayedEvaluation.fitScore}
              confidence={displayedEvaluation.confidence}
              hasMandateInputs={
                displayedEvaluation.inputs.proposalDocuments > 0 &&
                displayedEvaluation.inputs.mandateTemplates > 0
              }
              insights={displayedEvaluation.strengths}
              keyRisks={displayedEvaluation.risks}
              recommendation={displayedEvaluation.recommendations?.[0] ?? null}
              readOnly={isReadOnly}
            />

            {/* Memo Status section */}
            {(latestMemoBlobPath || memoCount > 0) && (
              <div className="px-5 py-3 border-t border-slate-100 border-b bg-muted/5">
                <p className="text-xs font-medium text-muted-foreground mb-2">Report Status</p>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                  {latestMemoFileName && (
                    <span className="flex items-center gap-1.5">
                      <FileOutput className="h-3.5 w-3.5 text-muted-foreground" />
                      {latestMemoFileName}
                    </span>
                  )}
                  {latestMemoGeneratedAt && (
                    <span className="text-muted-foreground">
                      {formatDate(latestMemoGeneratedAt)}
                    </span>
                  )}
                  <span className="text-muted-foreground">
                    {memoCount} report{memoCount !== 1 ? "s" : ""} available
                  </span>
                </div>
                {/* Memo History */}
                {memos.length > 0 && (
                  <div className="mt-3 pt-3 border-t">
                    <p className="text-xs font-medium text-muted-foreground mb-2">Report History</p>
                    <div className="space-y-1.5">
                      {memos.map((m) => (
                        <div
                          key={m.blobPath}
                          className="flex items-center justify-between py-1.5 px-2 rounded hover:bg-muted/30 group"
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="text-muted-foreground text-xs shrink-0">
                              {formatDate(m.generatedAt)}
                            </span>
                            <span className="text-sm truncate" title={m.fileName}>
                              {m.fileName}
                            </span>
                            {m.isLatest && (
                              <span className="text-xs rounded-full px-3 py-1 bg-primary/10 text-primary shrink-0">
                                Latest
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 opacity-0 group-hover:opacity-100 transition-opacity shrink-0"
                            onClick={() => handleDownloadMemo(m.blobPath)}
                          >
                            <Download className="h-3.5 w-3.5 mr-1" />
                            Download
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="border-t border-slate-100 px-4 py-6 sm:px-5">
              <ProposalEvaluationEnterprise
                evaluation={{
                  fitScore: displayedEvaluation.fitScore,
                  confidence: displayedEvaluation.confidence,
                  proposalSummary: displayedEvaluation.proposalSummary,
                  mandateSummary: displayedEvaluation.mandateSummary,
                  strengths: displayedEvaluation.strengths,
                  risks: displayedEvaluation.risks,
                  recommendations: displayedEvaluation.recommendations,
                  scoringMethod: displayedEvaluation.scoringMethod,
                  structuredScores: displayedEvaluation.structuredScores,
                  engineType: displayedEvaluation.engineType,
                  evaluatedAt: displayedEvaluation.evaluatedAt,
                  evaluatedByEmail: displayedEvaluation.evaluatedByEmail,
                  evaluatedAtDisplay: formatDate(displayedEvaluation.evaluatedAt),
                }}
                hasInputs={
                  displayedEvaluation.inputs.proposalDocuments > 0 &&
                  displayedEvaluation.inputs.mandateTemplates > 0
                }
                analystNotes={analystNotes}
                onAnalystNotesChange={setAnalystNotes}
                assessors={assessors}
                selectedReviewerId={selectedAssessor}
                onReviewerChange={setSelectedAssessor}
                onAssignReviewer={
                  canAssign
                    ? () => {
                        setAssignmentMode("user");
                        void handleAssign();
                      }
                    : undefined
                }
                assigning={assigning}
                onSaveDecision={() => {
                  setEvaluationMessage({
                    text: "Decision notes recorded for this session.",
                    type: "success",
                  });
                }}
                readOnly={isReadOnly}
              />
            </div>

            {/* Summaries - inline editable */}
            <div className="grid md:grid-cols-2 gap-5 p-5 border-t border-slate-100">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <FileText className="h-4 w-4 text-primary" />
                  <p className="text-sm font-semibold">Mandate Summary</p>
                </div>
                <p className="text-sm text-muted-foreground">{displayedEvaluation.mandateSummary}</p>
              </div>
              <div>
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <p className="text-sm font-semibold">Proposal Summary</p>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7"
                    onClick={() => {
                      setEditingSummary(true);
                      setAnalystSummary(displayedEvaluation.proposalSummary || "");
                    }}
                  >
                    <Pencil className="h-3.5 w-3.5 mr-1" />
                    Edit
                  </Button>
                </div>
                {editingSummary ? (
                  <div className="space-y-2">
                    <Textarea
                      value={analystSummary}
                      onChange={(e) => setAnalystSummary(e.target.value)}
                      className="min-h-[100px] text-sm"
                    />
                    <div className="flex gap-2">
                      <Button size="sm" onClick={() => setEditingSummary(false)}>
                        Cancel
                      </Button>
                      <Button size="sm" onClick={() => setEditingSummary(false)}>
                        <Save className="h-3.5 w-3.5 mr-1" />
                        Save
                      </Button>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">{displayedSummary}</p>
                )}
              </div>
            </div>

            {/* Strengths, Risks, Recommendations - 3 cards side by side */}
            <div className="grid md:grid-cols-3 gap-5">
              {/* Strengths */}
              <Card className="rounded-[14px] border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-slate-100 bg-slate-50 shadow-sm">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                    </div>
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <CheckCircle className="h-5 w-5 text-emerald-600" />
                      Strengths
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-100">
                      <Sparkles className="h-3 w-3" />
                      Powered by AI
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-4">
                    {displayedEvaluation.strengths.map((strength, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                        <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                        <span>{strength}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Risks */}
              <Card className="rounded-[14px] border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                        <AlertTriangle className="h-5 w-5 text-amber-600" />
                        Risks
                      </CardTitle>
                      <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-rose-100/80 text-rose-700 border border-rose-200">
                        <Sparkles className="h-3 w-3" />
                        AI
                      </span>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-xs text-rose-700 hover:bg-rose-100"
                      onClick={() => setExplainAiOpen(true)}
                    >
                      <HelpCircle className="h-3.5 w-3.5 mr-1" />
                      Explain AI
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-4">
                    {displayedEvaluation.risks.map((risk, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                        <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                        <span>{risk}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>

              {/* Recommendations */}
              <Card className="rounded-[14px] border border-slate-100 bg-white p-5 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <CardHeader className="p-0 pb-4">
                  <div className="flex items-center gap-2 flex-wrap">
                    <CardTitle className="text-base font-bold text-slate-900 flex items-center gap-2">
                      <Lightbulb className="h-5 w-5 text-slate-700" />
                      Recommendations
                    </CardTitle>
                    <span className="inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium bg-slate-100 text-slate-700 border border-slate-100">
                      <Sparkles className="h-3 w-3" />
                      AI
                    </span>
                  </div>
                </CardHeader>
                <CardContent className="p-0">
                  <ul className="space-y-4">
                    {displayedEvaluation.recommendations.map((rec, i) => (
                      <li key={i} className="flex items-start gap-2.5 text-sm text-slate-800">
                        <Lightbulb className="h-4 w-4 text-slate-600 mt-0.5 shrink-0" />
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            {/* Previous Evaluations */}
            {evaluations.length > 0 && (
              <div>
                <div className="px-5 py-3 border-b bg-muted/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <History className="h-4 w-4 text-muted-foreground" />
                      <p className="text-sm font-medium">Evaluation History</p>
                      <span className="text-xs text-muted-foreground">({evaluations.length} total)</span>
                    </div>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Main panel displays the {viewingHistorical ? "selected" : "latest"} evaluation. Click &quot;View&quot; to see older evaluations.
                  </p>
                </div>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Evaluation ID</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead className="text-center">Fit Score</TableHead>
                      <TableHead className="w-40"></TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {evaluations.slice(0, 5).map((eval_, i) => (
                      <TableRow 
                        key={eval_.blobPath} 
                        className={`group ${displayedEvaluation?.evaluationId === eval_.evaluationId ? "bg-primary/5" : ""}`}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {i === 0 && (
                              <Award className="h-4 w-4 text-amber-500" />
                            )}
                            <span className="font-mono text-sm">{eval_.evaluationId}</span>
                            {i === 0 && (
                              <span className="text-xs rounded-full px-3 py-1 bg-primary/10 text-primary">
                                Latest
                              </span>
                            )}
                            {displayedEvaluation?.evaluationId === eval_.evaluationId && i !== 0 && (
                              <span className="text-xs rounded-full px-3 py-1 bg-slate-100 text-slate-800 border border-slate-100">
                                Viewing
                              </span>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">
                          {formatDate(eval_.evaluatedAt)}
                        </TableCell>
                        <TableCell className="text-center">
                          {eval_.fitScore !== null ? (
                            <span className={`font-semibold ${getScoreColor(eval_.fitScore)}`}>
                              {eval_.fitScore}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleViewEvaluation(eval_.blobPath, i === 0)}
                              title="View details"
                            >
                              <Eye className="h-4 w-4 mr-1" />
                              View
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownloadEvaluation(eval_.blobPath)}
                              title="Download JSON"
                            >
                              <Download className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}

            {/* Similar Deals */}
            <div className="border-t">
              <div className="px-5 py-3 bg-muted/5">
                <div className="flex items-center gap-2">
                  <GitCompare className="h-4 w-4 text-muted-foreground" />
                  <p className="text-sm font-medium">Similar Deals</p>
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  Previously evaluated proposals with similar mandate fit and characteristics.
                </p>
              </div>
              {similarDealsLoading ? (
                <div className="px-5 py-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading similar deals...
                </div>
              ) : similarDeals.length === 0 ? (
                <div className="px-5 py-4 text-sm text-muted-foreground">
                  No similar deals found. Run evaluations on more proposals to see comparisons.
                </div>
              ) : (
                <div className="divide-y">
                  {similarDeals.map((deal) => (
                    <div
                      key={deal.proposalId}
                      className="px-5 py-3 flex items-start justify-between gap-4 hover:bg-muted/20"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Link
                            href={`/dashboard/proposals/${deal.proposalId}`}
                            className="font-mono text-sm font-medium text-primary hover:underline"
                          >
                            {deal.proposalId}
                          </Link>
                          {deal.fitScore !== null && (
                            <span className={`text-sm font-semibold ${getScoreColor(deal.fitScore)}`}>
                              {deal.fitScore}
                            </span>
                          )}
                          <span className="text-xs text-muted-foreground">
                            {Math.round(deal.similarityScore * 100)}% similar
                          </span>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                          {deal.summary}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6">
            {documents.length === 0 && (
              <div className="mb-4 px-4 py-3 bg-amber-50 border border-amber-200 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-amber-800">No documents uploaded</p>
                    <p className="text-sm text-amber-700">Upload a PDF, DOC, or DOCX document to run meaningful evaluation.</p>
                  </div>
                </div>
              </div>
            )}
            <EmptyState
              icon={Award}
              title="No Evaluations Yet"
              description="Run your first evaluation to analyze this proposal against the fund mandate."
            />
          </div>
        )}
      </DataCard>
      </div>
        </div>

        {/* AI Memo / Report — only after at least one mandate evaluation exists */}
        {hasEvaluation ? (
        <div className="space-y-8 border-t border-slate-100 pt-8">
          {memoMessage && (
            <div className={`px-4 py-3 rounded-lg text-sm ${
              memoMessage.type === "success" ? "bg-emerald-50 text-emerald-700 border border-emerald-200" : "bg-red-50 text-red-700 border border-red-200"
            }`}>
              {memoMessage.text}
            </div>
          )}

          {generatingReport ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground">
              <Loader2 className="h-10 w-10 animate-spin mr-3" />
              <span className="text-base font-medium">Generating report...</span>
            </div>
          ) : reportLoading && !investmentReport && !memoContent ? (
            <div className="flex items-center justify-center py-12 text-muted-foreground">
              <Loader2 className="h-8 w-8 animate-spin mr-2" />
              <span>Loading report...</span>
            </div>
          ) : investmentReport ? (
            /* Premium Investment Report View (from Report Engine) */
            <div className="space-y-6">
              <Card className="overflow-hidden rounded-[14px] border border-slate-100 shadow-[0_1px_3px_rgba(15,23,42,0.05)] transition-all duration-300 hover:shadow-[0_4px_14px_rgba(15,23,42,0.06)]">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 border-b border-slate-100 bg-white p-6">
                  <div>
                    <h2 className="text-xl font-bold text-slate-900">{investmentReport.title}</h2>
                    <p className="text-sm text-muted-foreground mt-1">
                      {proposal?.proposal_name} · {proposal?.applicant_name} · {new Date(investmentReport.generatedAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge
                      variant={investmentReport.score !== null && investmentReport.score >= 70 ? "success" : investmentReport.score !== null && investmentReport.score >= 50 ? "warning" : "secondary"}
                      className="text-sm px-3 py-1"
                    >
                      Score: {investmentReport.score ?? "—"}/100
                    </Badge>
                    <Badge
                      variant={investmentReport.confidence === "high" ? "success" : investmentReport.confidence === "medium" ? "warning" : "secondary"}
                      className="capitalize"
                    >
                      {investmentReport.confidence} Confidence
                    </Badge>
                    <Badge
                      variant={investmentReport.decision === "Invest" ? "success" : investmentReport.decision === "Pass" ? "destructive" : "outline"}
                      className="capitalize"
                    >
                      {investmentReport.decision}
                    </Badge>
                    <Button size="sm" onClick={handleDownloadReportPDF} className="bg-blue-950 hover:bg-blue-900 text-white">
                      <Download className="h-4 w-4 mr-1.5" />
                      Download PDF
                    </Button>
                  </div>
                </div>
                <div className="p-6 space-y-6 max-w-3xl">
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-slate-600" />
                      Executive Summary
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{investmentReport.summary}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <Target className="h-4 w-4 text-slate-600" />
                      Investment Thesis
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{investmentReport.investmentThesis}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <ShieldCheck className="h-4 w-4 text-slate-600" />
                      Validation Summary
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{investmentReport.validationSummary}</p>
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-700 mb-2 flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-slate-600" />
                      Fund Fit Summary
                    </h3>
                    <p className="text-sm text-slate-600 leading-relaxed">{investmentReport.fitSummary}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-200 bg-emerald-50/50 p-4">
                    <h3 className="text-sm font-semibold text-emerald-800 mb-2 flex items-center gap-2">
                      <CheckCircle className="h-4 w-4 text-emerald-600" />
                      Key Strengths
                    </h3>
                    <ul className="space-y-2">
                      {investmentReport.strengths.length > 0 ? (
                        investmentReport.strengths.map((s, i) => (
                          <li key={i} className="text-sm text-emerald-800 flex items-start gap-2">
                            <span className="text-emerald-600 font-medium">{i + 1}.</span>
                            <span>{s}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-emerald-700/80 italic">None identified.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-amber-200 bg-amber-50/50 p-4">
                    <h3 className="text-sm font-semibold text-amber-800 mb-2 flex items-center gap-2">
                      <AlertTriangle className="h-4 w-4 text-amber-600" />
                      Key Risks
                    </h3>
                    <ul className="space-y-2">
                      {investmentReport.risks.length > 0 ? (
                        investmentReport.risks.map((r, i) => (
                          <li key={i} className="text-sm text-amber-800 flex items-start gap-2">
                            <span className="text-amber-600 font-medium">{i + 1}.</span>
                            <span>{r}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-amber-700/80 italic">None identified.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-lg border border-slate-100 bg-slate-50/80 p-4">
                    <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                      <Lightbulb className="h-4 w-4 text-slate-600" />
                      Recommendations / Next Steps
                    </h3>
                    <ul className="space-y-2">
                      {investmentReport.recommendations.length > 0 ? (
                        investmentReport.recommendations.map((r, i) => (
                          <li key={i} className="text-sm text-slate-800 flex items-start gap-2">
                            <span className="font-medium text-slate-600">{i + 1}.</span>
                            <span>{r}</span>
                          </li>
                        ))
                      ) : (
                        <li className="text-sm text-slate-600 italic">None provided.</li>
                      )}
                    </ul>
                  </div>
                  <div className="rounded-lg border-2 border-slate-100 bg-slate-50 p-4">
                    <h3 className="text-sm font-semibold text-slate-800 mb-2">Suggested Decision</h3>
                    <p className="text-base font-medium text-slate-900">{investmentReport.decision}</p>
                  </div>
                  {investmentReport.warnings && investmentReport.warnings.length > 0 && (
                    <div className="rounded-lg border border-amber-200 bg-amber-50/30 p-4">
                      <h3 className="text-sm font-semibold text-amber-800 mb-2">Warnings</h3>
                      <ul className="space-y-1 text-sm text-amber-700">
                        {investmentReport.warnings.map((w, i) => (
                          <li key={i}>• {w}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
                <div className="px-6 py-3 border-t bg-muted/20 flex justify-end gap-2">
                  <Button size="sm" variant="outline" onClick={handleGenerateReport} disabled={reportDisabled}>
                    {generatingReport ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <FileOutput className="h-4 w-4 mr-1" />}
                    Regenerate Report
                  </Button>
                  <Button size="sm" onClick={handleDownloadReportPDF}>
                    <Download className="h-4 w-4 mr-1.5" />
                    Download PDF
                  </Button>
                </div>
              </Card>
            </div>
          ) : memoContent ? (
            <>
              {/* Premium AI Memo Document */}
              <Card className="overflow-hidden">
                {/* Memo Header */}
                <div className="border-b bg-muted/20 px-6 py-4">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <h2 className="text-lg font-semibold tracking-tight">Investment Committee Memo</h2>
                      <p className="text-sm text-muted-foreground mt-0.5">
                        {proposal?.proposal_name} · {proposal?.applicant_name}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={memoContent.confidence === "high" ? "success" : memoContent.confidence === "medium" ? "warning" : "secondary"}
                        className="capitalize"
                      >
                        {memoContent.confidence} Confidence
                      </Badge>
                      <div className="flex items-center gap-2">
                        {displayedEvaluation ? (
                          <Button size="sm" variant="outline" onClick={handleGenerateMemo} disabled={generatingMemo}>
                            {generatingMemo ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileOutput className="h-4 w-4" />}
                            <span className="ml-1.5">Regenerate PDF</span>
                          </Button>
                        ) : (
                          <Button size="sm" variant="outline" onClick={handleGenerateReport} disabled={reportDisabled}>
                            {generatingReport ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileOutput className="h-4 w-4" />}
                            <span className="ml-1.5">Regenerate Report</span>
                          </Button>
                        )}
                        {latestMemoBlobPath && (
                          <Button size="sm" variant="outline" onClick={() => handleDownloadMemo()}>
                            <Download className="h-4 w-4 mr-1.5" />
                            Download PDF
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Memo Body - Document Style */}
                <div className="px-6 py-6 space-y-8 max-w-3xl">
                  {/* 1. Executive Summary */}
                  <MemoSection
                    title="Executive Summary"
                    icon={Sparkles}
                    content={memoContent.proposalSummary}
                    explainKey="exec-summary"
                    explainContent="This summary is generated by the AI from the proposal documents and mandate alignment. It captures the core opportunity and fit."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 2. Investment Highlights */}
                  <MemoSection
                    title="Investment Highlights"
                    icon={TrendingUp}
                    content={
                      (memoContent.strengths?.length ?? 0) > 0 ? (
                      <ul className="space-y-2">
                        {(memoContent.strengths ?? []).map((s, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <CheckCircle className="h-4 w-4 text-emerald-600 mt-0.5 shrink-0" />
                            <span>{s}</span>
                          </li>
                        ))}
                      </ul>
                      ) : (
                        <p className="text-muted-foreground italic">No highlights identified.</p>
                      )
                    }
                    explainKey="highlights"
                    explainContent="These highlights are derived from the AI's analysis of mandate alignment, sector fit, and proposal strengths."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 3. Key Risks (with source references) */}
                  <MemoSection
                    title="Key Risks"
                    icon={AlertTriangle}
                    content={
                      (memoContent.risks?.length ?? 0) > 0 ? (
                      <ul className="space-y-3">
                        {(memoContent.risks ?? []).map((risk, i) => (
                          <li key={i} className="flex items-start gap-2">
                            <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5 shrink-0" />
                            <div>
                              <span>{risk}</span>
                              <p className="text-xs text-muted-foreground mt-1 italic">Source: AI evaluation · Proposal analysis</p>
                            </div>
                          </li>
                        ))}
                      </ul>
                      ) : (
                        <p className="text-muted-foreground italic">No risks identified.</p>
                      )
                    }
                    explainKey="risks"
                    explainContent="Risks are identified through mandate comparison, sector analysis, and qualitative assessment of the proposal materials."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 4. Financial Overview */}
                  <MemoSection
                    title="Financial Overview"
                    icon={DollarSign}
                    content={
                      <div className="space-y-3">
                        <div className="flex justify-between py-2 border-b">
                          <span className="text-muted-foreground">Requested Amount</span>
                          <span className="font-medium">
                            {proposal?.requested_amount != null
                              ? formatAmount(proposal.requested_amount)
                              : "—"}
                          </span>
                        </div>
                        {memoContent.structuredScores && (
                          <div className="grid gap-2 sm:grid-cols-2">
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-muted-foreground">Sector Fit</span>
                              <span>{memoContent.structuredScores.sectorFit}/25</span>
                            </div>
                            <div className="flex justify-between text-sm py-1">
                              <span className="text-muted-foreground">Ticket Size Fit</span>
                              <span>{memoContent.structuredScores.ticketSizeFit}/15</span>
                            </div>
                          </div>
                        )}
                      </div>
                    }
                    explainKey="financial"
                    explainContent="Financial metrics are extracted from proposal documents. Score breakdown reflects mandate alignment."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />

                  {/* 5. Recommendation */}
                  <MemoSection
                    title="Recommendation"
                    icon={Target}
                    content={
                      <div className="space-y-3">
                        <div className="flex items-center gap-3">
                          <div className={`flex h-12 w-12 items-center justify-center rounded-full ${
                            (memoContent.fitScore ?? 0) >= 70 ? "bg-emerald-100" :
                            (memoContent.fitScore ?? 0) >= 50 ? "bg-amber-100" : "bg-red-100"
                          }`}>
                            <span className={`text-lg font-bold ${
                              (memoContent.fitScore ?? 0) >= 70 ? "text-emerald-700" :
                              (memoContent.fitScore ?? 0) >= 50 ? "text-amber-700" : "text-red-700"
                            }`}>
                              {memoContent.fitScore ?? "—"}
                            </span>
                          </div>
                          <div>
                            <p className="font-medium">
                              {(memoContent.fitScore ?? 0) >= 70 ? "Proceed" :
                               (memoContent.fitScore ?? 0) >= 50 ? "Proceed with conditions" : "Defer or decline"}
                            </p>
                            <p className="text-sm text-muted-foreground">Fit Score: {memoContent.fitScore ?? "—"}/100</p>
                          </div>
                        </div>
                        <ul className="space-y-2 mt-3">
                          {(memoContent.recommendations ?? []).slice(0, 3).map((r, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm">
                              <Lightbulb className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                              <span>{r}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    }
                    explainKey="recommendation"
                    explainContent="The recommendation is based on fit score, mandate alignment, and identified strengths and risks."
                    expanded={memoExpanded}
                    onToggle={(key) => setMemoExpanded((p) => ({ ...p, [key]: !p[key] }))}
                  />
                </div>
              </Card>

              {/* Report History */}
              {memos.length > 0 && (
                <DataCard title="Report History" description="Generated PDF reports">
                  <div className="space-y-1.5">
                    {memos.map((m) => (
                      <div key={m.blobPath} className="flex items-center justify-between py-2 px-3 rounded-lg hover:bg-muted/30">
                        <span className="text-sm truncate">{m.fileName}</span>
                        <Button variant="ghost" size="sm" onClick={() => handleDownloadMemo(m.blobPath)}>
                          <Download className="h-3.5 w-3.5 mr-1" />
                          Download PDF
                        </Button>
                      </div>
                    ))}
                  </div>
                </DataCard>
              )}
            </>
          ) : (
            <DataCard
              title="AI Memo"
              description="No report generated yet. Generate a report to create an investment memo."
              actions={
                <Button
                  size="sm"
                  onClick={handleGenerateReport}
                  disabled={reportDisabled}
                >
                  {generatingReport ? (
                    <Loader2 className="h-4 w-4 mr-1 animate-spin" />
                  ) : (
                    <FileOutput className="h-4 w-4 mr-1" />
                  )}
                  Generate Report
                </Button>
              }
            >
              <div className="py-12 text-center max-w-md mx-auto px-4">
                <FileOutput className="h-12 w-12 mx-auto mb-4 text-slate-400" />
                <p className="text-base font-semibold tracking-tight text-slate-900">No report generated yet</p>
                <p className="text-sm text-slate-500 mt-2 leading-relaxed">
                  {documents.length === 0
                    ? "Report could not be generated because no proposal documents were found."
                    : !proposal?.fund_id
                      ? "Select a fund for this proposal first."
                      : !hasEvaluation
                        ? "Run mandate evaluation before generating a report."
                        : "Generate a report to create an AI analysis from your proposal and fund mandate."}
                </p>
              </div>
            </DataCard>
          )}
        </div>
        ) : null}
        </>
        )}
        </div>
      </TabsContent>
      </Tabs>

      {/* Explain AI Dialog */}
      <Dialog open={explainAiOpen} onOpenChange={setExplainAiOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <HelpCircle className="h-5 w-5" />
              Why AI Flagged These Risks
            </DialogTitle>
            <DialogDescription>
              The AI evaluates proposals against the fund mandate and identifies potential concerns based on sector fit, geography, stage, ticket size, and qualitative analysis.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            {displayedEvaluation?.risks?.map((risk, i) => (
              <div key={i} className="rounded-lg border bg-muted/20 p-3">
                <p className="text-sm font-medium mb-1">Risk {i + 1}</p>
                <p className="text-sm text-muted-foreground">{risk}</p>
                <p className="text-xs text-muted-foreground mt-2">
                  This risk was identified based on the proposal content and mandate criteria. Review the full evaluation for detailed context.
                </p>
              </div>
            ))}
          </div>
        </DialogContent>
      </Dialog>
      </div>
    </div>
  );
}
