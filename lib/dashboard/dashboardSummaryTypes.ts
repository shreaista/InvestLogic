/** Client-safe dashboard summary types (mirrors `dashboardSummaryPg` payload). */

export type AttentionSeverity = "error" | "warning" | "info";

export type DashboardAttentionItem = {
  id: string;
  title: string;
  detail: string;
  severity: AttentionSeverity;
  href: string;
};

export type DashboardActivityItem = {
  id: string;
  label: string;
  detail: string;
  timeLabel: string;
  href: string;
};

export type DashboardSummaryPayload = {
  kpis: {
    totalProposals: number;
    inReview: number;
    pendingValidation: number;
    approvedThisMonth: number;
  };
  needsAttention: DashboardAttentionItem[];
  attentionCounts: {
    missingDocuments: number;
    stuckInReview: number;
    validationFailures: number;
    evaluationGaps: number;
  };
  myWork: {
    assignedProposals: number;
    pendingReviews: number;
    completedToday: number;
  };
  pipeline: {
    upload: number;
    extract: number;
    validate: number;
    evaluate: number;
    report: number;
    complete: number;
  };
  recentActivity: DashboardActivityItem[];
};
