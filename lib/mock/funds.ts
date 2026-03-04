import "server-only";

// NEW: Mock Funds Module
// Defines funds and their associated mandate templates

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Fund {
  id: string;
  name: string;
  tenantId: string;
  mandateTemplateId: string | null;
  mandateKey: string | null;
  status: "Active" | "Inactive";
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Funds with their associated mandate templates
const funds: Fund[] = [
  {
    id: "F-001",
    name: "General Fund",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-001",
    mandateKey: "growth-equity-2026",
    status: "Active",
  },
  {
    id: "F-002",
    name: "Youth Programs",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-002",
    mandateKey: "impact-investing-2026",
    status: "Active",
  },
  {
    id: "F-003",
    name: "Innovation Grant",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-001",
    mandateKey: "growth-equity-2026",
    status: "Active",
  },
  {
    id: "F-004",
    name: "Community Dev",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-002",
    mandateKey: "impact-investing-2026",
    status: "Active",
  },
  {
    id: "F-005",
    name: "Healthcare Init",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-001",
    mandateKey: "growth-equity-2026",
    status: "Active",
  },
  {
    id: "F-006",
    name: "Emergency Reserve",
    tenantId: "tenant-001",
    mandateTemplateId: "fm-002",
    mandateKey: "impact-investing-2026",
    status: "Active",
  },
];

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listFunds(tenantId: string): Fund[] {
  return funds.filter((f) => f.tenantId === tenantId);
}

export function getFundById(tenantId: string, fundId: string): Fund | undefined {
  return funds.find((f) => f.id === fundId && f.tenantId === tenantId);
}

// NEW: Get fund by name (used to link proposals to funds)
export function getFundByName(tenantId: string, fundName: string): Fund | undefined {
  return funds.find((f) => f.name === fundName && f.tenantId === tenantId);
}

// NEW: Get fund for a proposal (by fund name)
export function getFundForProposal(
  tenantId: string,
  proposalFundName: string
): Fund | undefined {
  return getFundByName(tenantId, proposalFundName);
}
