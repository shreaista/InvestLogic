import {
  pgTable,
  text,
  integer,
  boolean,
  primaryKey,
  timestamp,
} from "drizzle-orm/pg-core";

// ─────────────────────────────────────────────────────────────────────────────
// Tenants
// ─────────────────────────────────────────────────────────────────────────────

export const tenants = pgTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Users (physical table: app_users). Role lives in user_roles + roles, not a column.
// TS property "id" maps to DB "user_id"; "name" is full_name in DB.
// ─────────────────────────────────────────────────────────────────────────────

export type DbRole = "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer";

export const users = pgTable("app_users", {
  id: text("user_id").primaryKey(),
  email: text("email").notNull(),
  passwordHash: text("password_hash"),
  name: text("full_name").notNull().default(""),
  tenantId: text("tenant_id").references(() => tenants.id),
  authProvider: text("auth_provider"),
  status: text("status"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Funds (DB: fund_id, fund_name, fund_code, …)
// ─────────────────────────────────────────────────────────────────────────────

export const funds = pgTable("funds", {
  id: text("fund_id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("fund_name").notNull(),
  code: text("fund_code"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
});

// ─────────────────────────────────────────────────────────────────────────────
// Proposals (align with production: proposal_id, proposal_name, requested_amount, …)
// ─────────────────────────────────────────────────────────────────────────────

export const proposals = pgTable("proposals", {
  id: text("proposal_id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("proposal_name").notNull(),
  applicant: text("applicant_name").notNull(),
  fundId: text("fund_id").references(() => funds.id),
  amount: integer("requested_amount").notNull().default(0),
  status: text("status").notNull().default("new"),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  submittedAt: text("submitted_at").notNull(),
  dueDate: text("due_date"),
  priority: text("review_priority").notNull().default("medium"),
  sector: text("sector"),
  stage: text("stage"),
  geography: text("geography"),
  businessModel: text("business_model"),
  description: text("description"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Queues
// ─────────────────────────────────────────────────────────────────────────────

export const queues = pgTable("queues", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const queueMembers = pgTable(
  "queue_members",
  {
    queueId: text("queue_id")
      .notNull()
      .references(() => queues.id),
    tenantId: text("tenant_id")
      .notNull()
      .references(() => tenants.id),
    userId: text("user_id")
      .notNull()
      .references(() => users.id),
    addedAt: text("added_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.queueId, t.userId] })]
);

export const proposalQueues = pgTable(
  "proposal_queues",
  {
    proposalId: text("proposal_id")
      .notNull()
      .references(() => proposals.id),
    queueId: text("queue_id")
      .notNull()
      .references(() => queues.id),
    assignedByUserId: text("assigned_by_user_id").references(() => users.id),
    assignedAt: text("assigned_at").notNull(),
  },
  (t) => [primaryKey({ columns: [t.proposalId, t.queueId] })]
);

// ─────────────────────────────────────────────────────────────────────────────
// Fund Mandates
// ─────────────────────────────────────────────────────────────────────────────

export const fundMandateLinks = pgTable("fund_mandate_links", {
  id: text("id").primaryKey(),
  fundId: text("fund_id")
    .notNull()
    .references(() => funds.id),
  mandateId: text("mandate_id").notNull(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  linkedAt: text("linked_at").notNull(),
  linkedByUserId: text("linked_by_user_id").references(() => users.id),
});

export const fundMandates = pgTable("fund_mandates", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id")
    .notNull()
    .references(() => tenants.id),
  fundId: text("fund_id").references(() => funds.id),
  name: text("name").notNull(),
  strategy: text("strategy").notNull(),
  geography: text("geography").notNull(),
  minTicket: integer("min_ticket").notNull(),
  maxTicket: integer("max_ticket").notNull(),
  status: text("status", { enum: ["draft", "active", "inactive"] }).notNull().default("draft"),
  version: integer("version").notNull().default(1),
  notes: text("notes"),
  updatedByUserId: text("updated_by_user_id").references(() => users.id),
  updatedAt: text("updated_at").notNull(),
  createdAt: text("created_at").notNull(),
});

export const fundMandateFiles = pgTable("fund_mandate_files", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id")
    .notNull()
    .references(() => fundMandates.id),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  version: integer("version").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  uploadedAt: text("uploaded_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit (physical table: audit_logs; columns vary by environment — use pgAudit for IO)
// ─────────────────────────────────────────────────────────────────────────────

export const auditLog = pgTable("audit_logs", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  action: text("action").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorEmail: text("actor_email"),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details"),
  createdAt: text("created_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Entitlements
// ─────────────────────────────────────────────────────────────────────────────

export const tenantEntitlements = pgTable("tenant_entitlements", {
  tenantId: text("tenant_id")
    .primaryKey()
    .references(() => tenants.id),
  maxAssessors: integer("max_assessors").notNull().default(5),
  maxUploadsPerAssessment: integer("max_uploads_per_assessment").notNull().default(3),
  maxReportsPerMonth: integer("max_reports_per_month").notNull().default(10),
  fundMandatesEnabled: boolean("fund_mandates_enabled").notNull().default(true),
  canManageFundMandates: boolean("can_manage_fund_mandates").notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});
