import "server-only";

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface Queue {
  id: string;
  tenantId: string;
  name: string;
}

export interface QueueMember {
  queueId: string;
  userId: string;
}

export interface ProposalQueue {
  proposalId: string;
  queueId: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data Store
// ─────────────────────────────────────────────────────────────────────────────

const queues: Queue[] = [
  { id: "queue-default", tenantId: "tenant-001", name: "Default Queue" },
  { id: "queue-high-priority", tenantId: "tenant-001", name: "High Priority" },
  { id: "queue-healthcare", tenantId: "tenant-001", name: "Healthcare" },
];

const queueMembers: QueueMember[] = [
  { queueId: "queue-default", userId: "user-003" },
  { queueId: "queue-default", userId: "user-assessor-2" },
  { queueId: "queue-high-priority", userId: "user-003" },
  { queueId: "queue-healthcare", userId: "user-assessor-2" },
  { queueId: "queue-healthcare", userId: "user-assessor-3" },
];

const proposalQueues: ProposalQueue[] = [];

// ─────────────────────────────────────────────────────────────────────────────
// Service Functions
// ─────────────────────────────────────────────────────────────────────────────

export function listQueuesForTenant(tenantId: string): Queue[] {
  return queues.filter((q) => q.tenantId === tenantId);
}

export function getQueueById(queueId: string): Queue | undefined {
  return queues.find((q) => q.id === queueId);
}

export function getQueueIdsForUser(tenantId: string, userId: string): string[] {
  const tenantQueueIds = queues
    .filter((q) => q.tenantId === tenantId)
    .map((q) => q.id);

  return queueMembers
    .filter((m) => m.userId === userId && tenantQueueIds.includes(m.queueId))
    .map((m) => m.queueId);
}

export function getProposalQueueId(proposalId: string): string | null {
  const pq = proposalQueues.find((pq) => pq.proposalId === proposalId);
  return pq ? pq.queueId : null;
}

export function getProposalIdsInQueues(queueIds: string[]): string[] {
  return proposalQueues
    .filter((pq) => queueIds.includes(pq.queueId))
    .map((pq) => pq.proposalId);
}

export interface AssignProposalToQueueParams {
  tenantId: string;
  proposalId: string;
  queueId: string;
}

export interface AssignProposalToQueueResult {
  ok: boolean;
  error?: string;
}

export function assignProposalToQueue(
  params: AssignProposalToQueueParams
): AssignProposalToQueueResult {
  const { tenantId, proposalId, queueId } = params;

  const queue = queues.find((q) => q.id === queueId && q.tenantId === tenantId);
  if (!queue) {
    return { ok: false, error: "Queue not found in tenant" };
  }

  const existingIndex = proposalQueues.findIndex(
    (pq) => pq.proposalId === proposalId
  );

  if (existingIndex >= 0) {
    proposalQueues[existingIndex] = { proposalId, queueId };
  } else {
    proposalQueues.push({ proposalId, queueId });
  }

  return { ok: true };
}

export function removeProposalFromQueue(proposalId: string): void {
  const index = proposalQueues.findIndex((pq) => pq.proposalId === proposalId);
  if (index >= 0) {
    proposalQueues.splice(index, 1);
  }
}

export function isUserInQueue(userId: string, queueId: string): boolean {
  return queueMembers.some(
    (m) => m.userId === userId && m.queueId === queueId
  );
}
