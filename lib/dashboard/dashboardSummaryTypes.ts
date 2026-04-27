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

/** Safe default when DB queries fail so Server Components and APIs never get undefined. */
export function getEmptyDashboardSummary(): DashboardSummaryPayload {
  return {
    kpis: { totalProposals: 0, inReview: 0, pendingValidation: 0, approvedThisMonth: 0 },
    needsAttention: [],
    attentionCounts: {
      missingDocuments: 0,
      stuckInReview: 0,
      validationFailures: 0,
      evaluationGaps: 0,
    },
    myWork: { assignedProposals: 0, pendingReviews: 0, completedToday: 0 },
    pipeline: { upload: 0, extract: 0, validate: 0, evaluate: 0, report: 0, complete: 0 },
    recentActivity: [],
  };
}

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
