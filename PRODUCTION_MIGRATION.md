# InvestLogic: Demo to Production Mode Migration Guide

This document provides a structured plan to convert InvestLogic from demo/sample mode to production mode. Use this as a prompt for Cursor or as a development roadmap.

---

## Migration Progress

### ✅ Completed
- **Database**: Drizzle ORM + SQLite (`lib/db/`, `drizzle/`)
- **Users & Auth**: DB-backed login (`lib/db/users.ts`), seed script (`npm run db:seed`)
- **Funds**: DB-backed CRUD (`lib/db/funds.ts`), fund-mandate links
- **API routes updated**: `/api/tenant/funds`, `/api/tenant/users`, `/api/tenant/assessors`, `/api/auth/login`

### 🔲 Remaining
- Proposals (DB-backed)
- Queues (DB-backed)
- Fund mandates (DB-backed)
- RBAC enforcement on all API routes
- Audit log persistence to DB
- Empty states with CTAs
- Remove production mode / seed filtering

---

## Current State Summary

- **Mock data**: `lib/mock/` (proposals, fundsStore, fundMandates, queues, proposalsStore, funds)
- **Persistence**: JSON files (`data/proposals.json`, `data/funds.json`) + Azure Blob Storage for documents
- **Auth**: Mock users in `lib/users.ts`, session-based auth
- **RBAC**: Types exist in `lib/rbac/types.ts` (saas_admin, tenant_admin, fund_manager, assessor, viewer)
- **Production flag**: `NEXT_PUBLIC_PRODUCTION_MODE` hides seed data but mock structure remains

---

## Phase 1: Database Setup

### 1.1 Choose Database
- **Recommended**: PostgreSQL (or SQLite for simpler deployment)
- Add `drizzle-orm` or `prisma` for schema and migrations

### 1.2 Schema (Core Tables)

```sql
-- tenants
tenants (id, name, slug, created_at, updated_at)

-- users (replace lib/users.ts mock)
users (id, email, name, role, tenant_id, created_at, updated_at)
-- role: saas_admin | tenant_admin | fund_manager | analyst | viewer

-- funds (replace lib/mock/fundsStore.ts)
funds (id, tenant_id, name, code, status, created_at, updated_at)

-- proposals (replace lib/mock/proposals.ts)
proposals (id, tenant_id, name, applicant, fund_id, amount, status, assigned_to_user_id, submitted_at, due_date, priority, created_at, updated_at)

-- queues (replace lib/mock/queues.ts)
queues (id, tenant_id, name, is_active, created_at)
queue_members (queue_id, user_id)
proposal_assignments (proposal_id, queue_id, assigned_by_user_id, assigned_at)

-- fund_mandates (replace lib/mock/fundMandates.ts)
fund_mandates (id, tenant_id, fund_id, name, strategy, geography, min_ticket, max_ticket, status, version, created_at, updated_at)

-- audit_log (replace lib/audit.ts in-memory)
audit_log (id, tenant_id, action, actor_user_id, resource_type, resource_id, details, created_at)

-- entitlements (replace lib/entitlements/demoEntitlements.ts)
tenant_entitlements (tenant_id, max_assessors, fund_mandates_enabled, can_manage_fund_mandates, ...)
```

### 1.3 Environment
- Add `DATABASE_URL` to `.env`
- Document migration steps in README

---

## Phase 2: Remove Mock Data

### 2.1 Files to Replace/Delete

| Current | Action |
|---------|--------|
| `lib/mock/proposals.ts` | Replace with `lib/db/proposals.ts` (DB queries) |
| `lib/mock/fundsStore.ts` | Replace with `lib/db/funds.ts` |
| `lib/mock/fundMandates.ts` | Replace with `lib/db/fundMandates.ts` |
| `lib/mock/queues.ts` | Replace with `lib/db/queues.ts` |
| `lib/mock/proposalsStore.ts` | Replace with DB-backed assignment logic |
| `lib/mock/funds.ts` | Merge into fundsStore or remove |
| `lib/users.ts` (mockUsers) | Replace with `lib/db/users.ts` (DB + auth provider) |
| `lib/entitlements/demoEntitlements.ts` | Replace with DB-backed entitlements |
| `lib/storage/proposalsPersistence.ts` | Remove (use DB) |
| `lib/storage/fundsPersistence.ts` | Remove (use DB) |

### 2.2 Update All Imports
- Grep for `@/lib/mock/` and `@/lib/users` → update to new DB modules
- Ensure no hardcoded seed data remains

---

## Phase 3: RBAC Implementation

### 3.1 Role Mapping (User → System)

| User Role | System Role | Notes |
|-----------|-------------|-------|
| Super Admin | saas_admin | Full access, multi-tenant |
| Tenant Admin | tenant_admin | Single tenant, full tenant scope |
| Fund Manager | fund_manager | Funds + proposals in scope |
| Analyst | analyst (assessor) | Assigned proposals, queue |
| Viewer | viewer | Read-only |

### 3.2 Permission Checks on API Routes

**Every API route must:**
1. Resolve `tenant_id` from session (user.tenantId or cookie)
2. Enforce `requirePermission` or `requireRole` before data access
3. Filter all queries by `tenant_id`

**Example pattern:**
```ts
// In api route
const user = await requireSession();
const tenantId = requireTenant(user);
requirePermission(user, "proposals:read");

const proposals = await db.query.proposals.findMany({
  where: eq(proposals.tenantId, tenantId),
});
```

### 3.3 Menu Visibility
- Update `components/app-shell/` or layout to use `roleHasPermission` or `getPermissionsForRole`
- Hide menu items: Tenants (saas_admin only), Funds (tenant_admin, fund_manager), etc.

---

## Phase 4: Tenant Isolation

### 4.1 Session Resolution
- `tenant_id` must come from: `user.tenantId` (from session) or `ipa_tenant` cookie
- Saas Admin: may have tenant context or global view
- All other roles: tenant is required

### 4.2 Data Filtering
- **Every** list/read query: `WHERE tenant_id = ?`
- Proposals, funds, queues, mandates, users (tenant-scoped): all filtered by tenant

---

## Phase 5: Audit Logging

### 5.1 Replace In-Memory Audit
- `lib/audit.ts` → persist to `audit_log` table
- Log: create, update, delete, assign, evaluate, report_generate

### 5.2 Audit Events to Log
- `proposal.create`, `proposal.update`, `proposal.delete`
- `proposal.assign`, `proposal.evaluate`
- `proposal.report_generated`
- `fund.create`, `fund.update`
- `user.create`, `user.update`
- etc.

---

## Phase 6: Empty States & CTAs

### 6.1 Requirements
- No page shows fake counts or fake data
- If no real data: show empty state with CTA button
- Examples: "No proposals yet. Create your first proposal." → "Create Proposal"

### 6.2 Pages to Verify
- Dashboard home
- Proposals list
- Funds list
- Queue
- Reports
- Users
- Audit log

---

## Phase 7: API Route Updates

### 7.1 Routes to Update (tenant + permission + DB)

| Route | Changes |
|-------|---------|
| `/api/tenant/proposals` | DB + tenant filter + permission |
| `/api/tenant/proposals/[id]/assign` | DB + permission |
| `/api/tenant/funds` | DB + tenant filter |
| `/api/tenant/queues` | DB + tenant filter |
| `/api/tenant/users` | DB + tenant filter |
| `/api/tenant/assessors` | DB + tenant filter |
| `/api/tenant/fund-mandates` | DB + tenant filter |
| `/api/proposals/*` | Resolve tenant from proposal, enforce permission |
| `/api/tenant/proposals/[id]/generate-report` | DB + tenant + permission |
| `/api/tenant/proposals/[id]/report` | DB + tenant |
| `/api/auth/login` | Real auth (DB users or OAuth) |

---

## Phase 8: Auth & Users

### 8.1 Replace Mock Auth
- Option A: Keep email/password, use DB `users` table + bcrypt
- Option B: Add OAuth (NextAuth, Auth.js, etc.)
- Session must include: `userId`, `email`, `role`, `tenantId`

### 8.2 User Management
- Tenant Admin: CRUD users in their tenant
- SaaS Admin: CRUD users across tenants
- Store user-tenant-role in DB

---

## Phase 9: Entitlements

### 9.1 Replace Demo Entitlements
- Store in `tenant_entitlements` table
- Load per tenant from DB
- Default values for new tenants

---

## Phase 10: Final Cleanup

### 10.1 Remove
- All hardcoded seeds from mock files
- `productionMode` filter logic (no seeds = no filter needed)
- `NEXT_PUBLIC_PRODUCTION_MODE` if no longer needed

### 10.2 Verify
- No fake data after login
- All screens load from DB
- Empty states with CTAs
- RBAC enforced
- Audit logging works

---

## Suggested Order of Execution

1. **Database**: Add schema, migrations, DB client
2. **Users & Auth**: Replace mock users, DB-backed login
3. **Funds**: Migrate funds to DB, update API + UI
4. **Proposals**: Migrate proposals to DB, update API + UI
5. **Queues**: Migrate queues to DB
6. **Mandates**: Migrate fund mandates to DB
7. **Entitlements**: DB-backed entitlements
8. **Audit**: DB-backed audit log
9. **RBAC**: Enforce on all routes + menu
10. **Cleanup**: Remove mock, JSON persistence, production flag

---

## Quick Checklist

- [ ] Database schema added
- [ ] Migrations run
- [ ] Mock proposals removed, DB used
- [ ] Mock funds removed, DB used
- [ ] Mock queues removed, DB used
- [ ] Mock users removed, DB auth used
- [ ] Mock entitlements removed, DB used
- [ ] Audit log persisted to DB
- [ ] All API routes filter by tenant_id
- [ ] All API routes enforce RBAC
- [ ] Menu visibility by role
- [ ] Empty states with CTAs
- [ ] No sample data in UI after login
