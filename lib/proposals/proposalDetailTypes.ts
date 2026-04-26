/** Proposal row for detail UI (PostgreSQL `proposals` + optional fund display name). Client-safe. */

export type ProposalDetailRow = {
  proposal_id: string;
  fund_id: string;
  proposal_name: string;
  applicant_name: string;
  requested_amount: number | null;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  business_model: string | null;
  description: string | null;
  status: string;
  review_priority: string;
  created_at: string;
  fund_name: string | null;
};
