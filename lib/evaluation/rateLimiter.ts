import "server-only";

// NEW: In-Memory Rate Limiter for Proposal Evaluations
//
// Simple per-tenant rate limiting: 10 requests per 10 minutes
// Uses in-memory storage (resets on server restart)

// ─────────────────────────────────────────────────────────────────────────────
// Configuration
// ─────────────────────────────────────────────────────────────────────────────

// NEW: Rate limit settings
const MAX_REQUESTS = 10;
const WINDOW_MS = 10 * 60 * 1000; // 10 minutes

// ─────────────────────────────────────────────────────────────────────────────
// In-Memory Storage
// ─────────────────────────────────────────────────────────────────────────────

interface RateLimitEntry {
  timestamps: number[];
}

// NEW: Store rate limit data per tenant
const rateLimitStore = new Map<string, RateLimitEntry>();

// ─────────────────────────────────────────────────────────────────────────────
// Rate Limiter Functions
// ─────────────────────────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetInMs: number;
  message?: string;
}

// NEW: Check if request is allowed and record it
export function checkRateLimit(tenantId: string): RateLimitResult {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  // Get or create entry for tenant
  let entry = rateLimitStore.get(tenantId);
  if (!entry) {
    entry = { timestamps: [] };
    rateLimitStore.set(tenantId, entry);
  }

  // Remove timestamps outside the window
  entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);

  // Check if under limit
  if (entry.timestamps.length >= MAX_REQUESTS) {
    // Calculate when the oldest request in window will expire
    const oldestInWindow = entry.timestamps[0];
    const resetInMs = oldestInWindow + WINDOW_MS - now;

    return {
      allowed: false,
      remaining: 0,
      resetInMs,
      message: `Rate limit exceeded. Try again in ${Math.ceil(resetInMs / 1000)} seconds.`,
    };
  }

  // Allow request and record timestamp
  entry.timestamps.push(now);

  return {
    allowed: true,
    remaining: MAX_REQUESTS - entry.timestamps.length,
    resetInMs: WINDOW_MS,
  };
}

// NEW: Get current rate limit status without recording a request
export function getRateLimitStatus(tenantId: string): {
  used: number;
  remaining: number;
  limit: number;
} {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  const entry = rateLimitStore.get(tenantId);
  if (!entry) {
    return { used: 0, remaining: MAX_REQUESTS, limit: MAX_REQUESTS };
  }

  // Count requests in current window
  const recentRequests = entry.timestamps.filter((ts) => ts > windowStart).length;

  return {
    used: recentRequests,
    remaining: Math.max(0, MAX_REQUESTS - recentRequests),
    limit: MAX_REQUESTS,
  };
}

// NEW: Clear rate limit for a tenant (for testing/admin purposes)
export function clearRateLimit(tenantId: string): void {
  rateLimitStore.delete(tenantId);
}

// NEW: Cleanup old entries periodically (call this in background if needed)
export function cleanupRateLimitStore(): void {
  const now = Date.now();
  const windowStart = now - WINDOW_MS;

  for (const [tenantId, entry] of rateLimitStore.entries()) {
    entry.timestamps = entry.timestamps.filter((ts) => ts > windowStart);
    if (entry.timestamps.length === 0) {
      rateLimitStore.delete(tenantId);
    }
  }
}
