/**
 * API Catalog for Devtools API Explorer
 * Static, serializable list of API endpoints - DO NOT import icons or React components here
 */

export type HttpMethod = "GET" | "POST" | "PATCH" | "DELETE";
export type AuthType = "public" | "requiresLogin";
export type RequiredRole = "saas_admin" | "tenant_admin" | "assessor" | "any";

export interface ApiEndpoint {
  method: HttpMethod;
  path: string;
  description: string;
  auth: AuthType;
  requiredRole: RequiredRole;
  requiredPermission?: string;
  sampleBody?: Record<string, unknown>;
}

export const API_CATALOG: ApiEndpoint[] = [
  // Auth endpoints
  {
    method: "POST",
    path: "/api/auth/login",
    description: "Authenticate user with email and password",
    auth: "public",
    requiredRole: "any",
    sampleBody: { email: "user@example.com", password: "password123" },
  },
  {
    method: "POST",
    path: "/api/auth/logout",
    description: "Log out and clear session",
    auth: "requiresLogin",
    requiredRole: "any",
  },

  // Me endpoints
  {
    method: "GET",
    path: "/api/me",
    description: "Get current user profile",
    auth: "requiresLogin",
    requiredRole: "any",
  },
  {
    method: "GET",
    path: "/api/me/authz",
    description: "Get current user authorization context (role, permissions, tenant)",
    auth: "requiresLogin",
    requiredRole: "any",
  },

  // Tenant management
  {
    method: "GET",
    path: "/api/tenants",
    description: "List all tenants",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
  },
  {
    method: "POST",
    path: "/api/tenants",
    description: "Create a new tenant",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
    sampleBody: { name: "Acme Corp", slug: "acme-corp" },
  },
  {
    method: "GET",
    path: "/api/tenants/[tenantId]",
    description: "Get tenant details by ID",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
  },

  // Tenant context
  {
    method: "POST",
    path: "/api/tenant-context",
    description: "Set active tenant context (SaaS admin tenant switching)",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
    sampleBody: { tenantId: "tenant-uuid" },
  },
  {
    method: "DELETE",
    path: "/api/tenant-context",
    description: "Clear active tenant context",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
  },

  // Tenant users
  {
    method: "GET",
    path: "/api/tenant/users",
    description: "List users in current tenant",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "user:read",
  },
  {
    method: "POST",
    path: "/api/tenant/users",
    description: "Create a new user in current tenant",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "user:create",
    sampleBody: { email: "newuser@example.com", name: "New User", role: "assessor" },
  },
  {
    method: "PATCH",
    path: "/api/tenant/users/[userId]",
    description: "Update user details",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "user:update",
    sampleBody: { name: "Updated Name", role: "tenant_admin" },
  },

  // Funds
  {
    method: "GET",
    path: "/api/tenant/funds",
    description: "List all funds in current tenant",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "fund:read",
  },
  {
    method: "POST",
    path: "/api/tenant/funds",
    description: "Create a new fund",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "fund:create",
    sampleBody: { name: "Innovation Fund 2026", description: "Fund for innovative projects" },
  },
  {
    method: "GET",
    path: "/api/tenant/funds/[fundId]",
    description: "Get fund details",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "fund:read",
  },

  // Mandates
  {
    method: "GET",
    path: "/api/tenant/funds/[fundId]/mandates",
    description: "List mandates for a fund",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "mandate:read",
  },
  {
    method: "POST",
    path: "/api/tenant/funds/[fundId]/mandates",
    description: "Create a new mandate for a fund",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
    requiredPermission: "mandate:create",
    sampleBody: { name: "Green Energy Mandate", criteria: [] },
  },

  // Proposals
  {
    method: "GET",
    path: "/api/tenant/proposals",
    description: "List all proposals in current tenant",
    auth: "requiresLogin",
    requiredRole: "assessor",
    requiredPermission: "proposal:read",
  },
  {
    method: "GET",
    path: "/api/tenant/proposals/[proposalId]",
    description: "Get proposal details",
    auth: "requiresLogin",
    requiredRole: "assessor",
    requiredPermission: "proposal:read",
  },

  // Subscriptions (SaaS Admin only)
  {
    method: "GET",
    path: "/api/subscriptions",
    description: "List all subscriptions",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
  },
  {
    method: "POST",
    path: "/api/subscriptions",
    description: "Create a subscription for a tenant",
    auth: "requiresLogin",
    requiredRole: "saas_admin",
    sampleBody: { tenantId: "tenant-uuid", plan: "pro", features: [] },
  },

  // RBAC
  {
    method: "GET",
    path: "/api/rbac/roles",
    description: "Get available roles and their permissions",
    auth: "requiresLogin",
    requiredRole: "tenant_admin",
  },
];
