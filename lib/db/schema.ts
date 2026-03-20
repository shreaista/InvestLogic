import {
  sqliteTable,
  text,
  integer,
  primaryKey,
} from "drizzle-orm/sqlite-core";

// ─────────────────────────────────────────────────────────────────────────────
// Tenants
// ─────────────────────────────────────────────────────────────────────────────

export const tenants = sqliteTable("tenants", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Users
// ─────────────────────────────────────────────────────────────────────────────

export type DbRole = "saas_admin" | "tenant_admin" | "fund_manager" | "assessor" | "viewer";

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash"),
  name: text("name").notNull(),
  role: text("role", { enum: ["saas_admin", "tenant_admin", "fund_manager", "assessor", "viewer"] }).notNull(),
  tenantId: text("tenant_id").references(() => tenants.id),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Funds
// ─────────────────────────────────────────────────────────────────────────────

export const funds = sqliteTable("funds", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  code: text("code"),
  status: text("status", { enum: ["active", "inactive"] }).notNull().default("active"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Proposals
// ─────────────────────────────────────────────────────────────────────────────

export const proposals = sqliteTable("proposals", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  applicant: text("applicant").notNull(),
  fundId: text("fund_id").references(() => funds.id),
  amount: integer("amount").notNull().default(0),
  status: text("status", {
    enum: ["New", "Assigned", "In Review", "Approved", "Declined", "Deferred"],
  }).notNull().default("New"),
  assignedToUserId: text("assigned_to_user_id").references(() => users.id),
  submittedAt: text("submitted_at").notNull(),
  dueDate: text("due_date"),
  priority: text("priority", { enum: ["High", "Medium", "Low"] }).notNull().default("Medium"),
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

export const queues = sqliteTable("queues", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description").notNull().default(""),
  isActive: integer("is_active", { mode: "boolean" }).notNull().default(true),
  createdAt: text("created_at").notNull(),
});

export const queueMembers = sqliteTable("queue_members", {
  queueId: text("queue_id").notNull().references(() => queues.id),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  userId: text("user_id").notNull().references(() => users.id),
  addedAt: text("added_at").notNull(),
}, (t) => [primaryKey({ columns: [t.queueId, t.userId] })]);

export const proposalQueues = sqliteTable("proposal_queues", {
  proposalId: text("proposal_id").notNull().references(() => proposals.id),
  queueId: text("queue_id").notNull().references(() => queues.id),
  assignedByUserId: text("assigned_by_user_id").references(() => users.id),
  assignedAt: text("assigned_at").notNull(),
}, (t) => [primaryKey({ columns: [t.proposalId, t.queueId] })]);

// ─────────────────────────────────────────────────────────────────────────────
// Fund Mandates
// ─────────────────────────────────────────────────────────────────────────────

export const fundMandateLinks = sqliteTable("fund_mandate_links", {
  id: text("id").primaryKey(),
  fundId: text("fund_id").notNull().references(() => funds.id),
  mandateId: text("mandate_id").notNull(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
  linkedAt: text("linked_at").notNull(),
  linkedByUserId: text("linked_by_user_id").references(() => users.id),
});

export const fundMandates = sqliteTable("fund_mandates", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id").notNull().references(() => tenants.id),
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

export const fundMandateFiles = sqliteTable("fund_mandate_files", {
  id: text("id").primaryKey(),
  mandateId: text("mandate_id").notNull().references(() => fundMandates.id),
  fileName: text("file_name").notNull(),
  contentType: text("content_type").notNull(),
  sizeBytes: integer("size_bytes").notNull(),
  version: integer("version").notNull(),
  storageKey: text("storage_key").notNull(),
  uploadedByUserId: text("uploaded_by_user_id").references(() => users.id),
  uploadedAt: text("uploaded_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Audit Log
// ─────────────────────────────────────────────────────────────────────────────

export const auditLog = sqliteTable("audit_log", {
  id: text("id").primaryKey(),
  tenantId: text("tenant_id"),
  action: text("action").notNull(),
  actorUserId: text("actor_user_id").notNull(),
  actorEmail: text("actor_email"),
  resourceType: text("resource_type").notNull(),
  resourceId: text("resource_id").notNull(),
  details: text("details"), // JSON
  createdAt: text("created_at").notNull(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Tenant Entitlements
// ─────────────────────────────────────────────────────────────────────────────

export const tenantEntitlements = sqliteTable("tenant_entitlements", {
  tenantId: text("tenant_id").primaryKey().references(() => tenants.id),
  maxAssessors: integer("max_assessors").notNull().default(5),
  maxUploadsPerAssessment: integer("max_uploads_per_assessment").notNull().default(3),
  maxReportsPerMonth: integer("max_reports_per_month").notNull().default(10),
  fundMandatesEnabled: integer("fund_mandates_enabled", { mode: "boolean" }).notNull().default(true),
  canManageFundMandates: integer("can_manage_fund_mandates", { mode: "boolean" }).notNull().default(true),
  updatedAt: text("updated_at").notNull(),
});
