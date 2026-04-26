import Link from "next/link";
import { PageHeader, StatCard, DataCard } from "@/components/app";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { DashboardSummaryPayload } from "@/lib/dashboard/dashboardSummaryTypes";
import {
  FileText,
  Clock,
  CheckCircle,
  AlertTriangle,
  ArrowRight,
  Target,
  Users,
  DollarSign,
  Building2,
  ExternalLink,
  AlertCircle,
  ChevronRight,
  Plus,
  Upload,
  ShieldCheck,
  FileBarChart,
  Inbox,
  Activity,
  FileWarning,
  Cpu,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
interface DashboardHomeProps {
  user: {
    id?: string;
    email?: string;
    name?: string;
    role?: string;
  };
  tenantId: string | null;
  snapshot: DashboardSummaryPayload | null;
}

export default function DashboardHome({ user, tenantId, snapshot }: DashboardHomeProps) {
  const role = user.role || "assessor";

  if (!tenantId && role === "saas_admin") {
    return <SaaSGlobalDashboard />;
  }

  if (tenantId && !snapshot) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 text-sm text-amber-950">
        Workspace metrics could not be loaded. Check the database connection and try again.
      </div>
    );
  }

  if (!snapshot) {
    return null;
  }

  if (role === "saas_admin") {
    return <TenantDashboard user={user} snapshot={snapshot} variant="saas" />;
  }

  if (role === "assessor") {
    return <TenantDashboard user={user} snapshot={snapshot} variant="assessor" />;
  }

  return <TenantDashboard user={user} snapshot={snapshot} variant="standard" />;
}

function SaaSGlobalDashboard() {
  return (
    <div className="space-y-12 lg:space-y-14">
      <PageHeader
        className="mb-0"
        title="Platform"
        subtitle="Select a tenant to see investment workspace metrics, or manage tenants and billing."
        actions={
          <Link href="/dashboard/tenants">
            <Button size="sm" variant="outline">
              Tenants
              <ArrowRight className="ml-2 h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      />
      <div className="rounded-2xl border border-dashed border-slate-200/90 bg-white p-10 text-center shadow-card">
        <Building2 className="mx-auto h-10 w-10 text-slate-400" />
        <h2 className="mt-4 text-base font-semibold text-slate-900">No tenant context</h2>
        <p className="mx-auto mt-2 max-w-md text-sm text-slate-600">
          Use the tenant switcher in the header to view a fund workspace, or open Tenants to manage organizations.
        </p>
        <Link href="/select-tenant" className="mt-6 inline-block">
          <Button>Select tenant</Button>
        </Link>
      </div>
    </div>
  );
}

function PipelineBar({ pipeline }: { pipeline: DashboardSummaryPayload["pipeline"] }) {
  const stages = [
    { key: "upload", label: "Upload", count: pipeline.upload },
    { key: "extract", label: "Extract", count: pipeline.extract },
    { key: "validate", label: "Validate", count: pipeline.validate },
    { key: "evaluate", label: "Evaluate", count: pipeline.evaluate },
    { key: "report", label: "Report", count: pipeline.report },
    { key: "complete", label: "Complete", count: pipeline.complete },
  ] as const;
  const total = stages.reduce((a, s) => a + s.count, 0);
  const denom = total > 0 ? total : 1;

  return (
    <div className="space-y-4">
      <p className="text-sm text-slate-500">
        Distribution across workflow stages (derived from documents, extraction, validation, evaluation, and reports).
        Total in pipeline: <span className="font-medium text-slate-800">{total}</span>
      </p>
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-100">
        {stages.map((s) => (
          <div
            key={s.key}
            className="h-full bg-primary transition-all first:rounded-l-full last:rounded-r-full"
            style={{ width: `${(s.count / denom) * 100}%`, minWidth: s.count > 0 ? "4px" : "0" }}
            title={`${s.label}: ${s.count}`}
          />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stages.map((s) => (
          <div
            key={s.key}
            className="rounded-xl border border-slate-200/85 bg-white p-4 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
          >
            <p className="text-2xl font-bold tabular-nums text-slate-900">{s.count}</p>
            <p className="mt-1 text-xs font-medium uppercase tracking-wide text-slate-500">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function severityIcon(sev: "error" | "warning" | "info"): LucideIcon {
  if (sev === "error") return AlertCircle;
  if (sev === "warning") return FileWarning;
  return AlertCircle;
}

function NeedsAttentionList({
  items,
  viewAllHref,
}: {
  items: DashboardSummaryPayload["needsAttention"];
  viewAllHref: string;
}) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 py-12 text-center">
        <Inbox className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-800">Nothing needs attention</p>
        <p className="mt-1 text-xs text-slate-500">Missing documents, stalled reviews, and validation issues will appear here.</p>
        <Link href="/dashboard/proposals" className="mt-4 inline-block">
          <Button size="sm" variant="outline">
            View proposals
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <>
      <ul className="space-y-2">
        {items.map((item) => {
          const Icon = severityIcon(item.severity);
          return (
            <li key={item.id}>
              <Link
                href={item.href}
                className={cn(
                  "flex items-start gap-3 rounded-xl border border-slate-200/80 border-l-4 bg-white px-3 py-3 shadow-soft transition-all duration-200",
                  "hover:bg-slate-50/95 hover:shadow-card",
                  item.severity === "error" && "border-l-red-600/70",
                  item.severity === "warning" && "border-l-amber-500/75",
                  item.severity === "info" && "border-l-blue-600/55"
                )}
              >
                <Icon
                  className={
                    item.severity === "error"
                      ? "mt-0.5 h-4 w-4 shrink-0 text-red-600"
                      : item.severity === "warning"
                        ? "mt-0.5 h-4 w-4 shrink-0 text-amber-700"
                        : "mt-0.5 h-4 w-4 shrink-0 text-blue-700/80"
                  }
                />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug tracking-tight text-slate-900">{item.title}</p>
                  <p className="mt-0.5 text-xs text-slate-500">{item.detail}</p>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-300" />
              </Link>
            </li>
          );
        })}
      </ul>
      <div className="mt-4 border-t border-slate-100 pt-4">
        <Link href={viewAllHref}>
          <Button variant="outline" size="sm">
            View all
            <ArrowRight className="ml-2 h-3.5 w-3.5" />
          </Button>
        </Link>
      </div>
    </>
  );
}

function RecentList({ items }: { items: DashboardSummaryPayload["recentActivity"] }) {
  if (items.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50/40 py-12 text-center">
        <Activity className="mx-auto h-8 w-8 text-slate-400" />
        <p className="mt-3 text-sm font-medium text-slate-800">No recent activity</p>
        <p className="mt-1 text-xs text-slate-500">Events will appear as your team works through proposals.</p>
        <Link href="/dashboard/proposals" className="mt-4 inline-block">
          <Button variant="outline" size="sm">
            Browse proposals
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <ul className="divide-y divide-slate-100">
      {items.map((row) => (
        <li key={row.id}>
          <Link
            href={row.href}
            className="-mx-2 flex items-start justify-between gap-4 rounded-lg px-2 py-3 transition-colors hover:bg-slate-50/80"
          >
            <div className="min-w-0">
              <p className="text-sm font-medium text-slate-900">{row.label}</p>
              <p className="mt-0.5 truncate text-xs text-slate-500">{row.detail}</p>
            </div>
            <span className="shrink-0 text-xs tabular-nums text-slate-400">{row.timeLabel}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function QuickActions() {
  const actions = [
    {
      href: "/dashboard/proposals/new",
      label: "New Proposal",
      icon: Plus,
      variant: "default" as const,
    },
    {
      href: "/dashboard/proposals",
      label: "Upload Documents",
      icon: Upload,
      variant: "outline" as const,
    },
    {
      href: "/dashboard/prompts",
      label: "Run Validation",
      icon: ShieldCheck,
      variant: "outline" as const,
    },
    {
      href: "/dashboard/reports",
      label: "Generate Report",
      icon: FileBarChart,
      variant: "outline" as const,
    },
  ];

  return (
    <div className="grid w-full grid-cols-2 gap-2.5 md:grid-cols-4 md:gap-3">
      {actions.map(({ href, label, icon: Icon, variant }) => (
        <Link
          key={label}
          href={href}
          className={cn(
            buttonVariants({ variant }),
            "h-14 w-full shrink-0 flex-row items-center justify-start gap-3 rounded-xl px-3 text-left text-sm font-medium sm:px-3.5",
            variant === "default" &&
              "shadow-card transition-all duration-200 hover:-translate-y-px hover:shadow-card-hover",
            variant === "outline" &&
              "border-slate-300/95 bg-white text-slate-900 shadow-soft transition-all duration-200 hover:-translate-y-px hover:border-slate-400 hover:bg-slate-50/80 hover:shadow-card-hover"
          )}
        >
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg",
              variant === "default"
                ? "bg-primary/10 text-primary"
                : "bg-slate-200/95 text-slate-800"
            )}
          >
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1 leading-snug">{label}</span>
        </Link>
      ))}
    </div>
  );
}

function TenantDashboard({
  user,
  snapshot,
  variant,
}: {
  user: DashboardHomeProps["user"];
  snapshot: DashboardSummaryPayload;
  variant: "standard" | "assessor" | "saas";
}) {
  const role = user.role || "assessor";
  const queueHref = role === "assessor" ? "/dashboard/queue" : "/dashboard/queues";

  return (
    <div className="space-y-12 lg:space-y-14">
      <PageHeader
        className="mb-0"
        title="Dashboard"
        subtitle={
          variant === "assessor"
            ? "Your queue, pipeline, and recent activity"
            : "Investment proposal pipeline and workspace activity"
        }
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Link href="/dashboard/fund-manager">
              <Button variant="outline" size="sm">
                Fund Manager
                <ArrowRight className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
            <Link href="/dashboard/proposals">
              <Button size="sm" variant={variant === "standard" ? "default" : "outline"}>
                {role === "viewer" ? "Browse proposals" : "Proposals"}
                <ExternalLink className="ml-2 h-3.5 w-3.5" />
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          title="Total proposals"
          value={snapshot.kpis.totalProposals}
          description="In this workspace"
          icon={FileText}
          iconTint="blue"
        />
        <StatCard
          title="In review"
          value={snapshot.kpis.inReview}
          description="With IC / reviewers"
          icon={Clock}
          iconTint="blue"
        />
        <StatCard
          title="Pending validation"
          value={snapshot.kpis.pendingValidation}
          description="Assigned pre-IC"
          icon={AlertTriangle}
          iconTint="amber"
        />
        <StatCard
          title="Approved this month"
          value={snapshot.kpis.approvedThisMonth}
          description="Closed approvals"
          icon={CheckCircle}
          iconTint="emerald"
        />
      </div>

      <DataCard
        title="Quick actions"
        description="Primary workflow shortcuts"
        accent="blue"
        headerClassName="py-3 sm:py-3.5"
        descriptionClassName="mt-0.5"
        noPadding
        bodyClassName="flex flex-col justify-start pt-1 pb-4 px-4 sm:px-5 sm:pb-5"
      >
        <QuickActions />
      </DataCard>

      <DataCard
        title="Needs attention"
        titleClassName="font-bold tracking-tight"
        description={`Missing documents, stalled reviews, and risk signals · Missing docs ${snapshot.attentionCounts.missingDocuments}, stalled ${snapshot.attentionCounts.stuckInReview}, validation ${snapshot.attentionCounts.validationFailures}, eval gaps ${snapshot.attentionCounts.evaluationGaps}`}
        accent="rose"
      >
        <NeedsAttentionList items={snapshot.needsAttention} viewAllHref={queueHref} />
      </DataCard>

      <DataCard title="My work" description="Assignments, your review queue, and completions today" accent="indigo">
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            {
              label: "Assigned proposals",
              value: snapshot.myWork.assignedProposals,
              hint: "Assigned to you in this workspace",
              icon: Target,
            },
            {
              label: "Pending reviews",
              value: snapshot.myWork.pendingReviews,
              hint: "In review stage",
              icon: FileText,
            },
            {
              label: "Completed today",
              value: snapshot.myWork.completedToday,
              hint: "Approved / declined / deferred",
              icon: CheckCircle,
            },
          ].map((w) => (
            <div
              key={w.label}
              className="rounded-xl border border-slate-200/70 bg-white px-4 py-5 text-center shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-card-hover"
            >
              <w.icon className="mx-auto mb-2 h-5 w-5 text-primary" />
              <p className="text-3xl font-bold tabular-nums text-slate-900">{w.value}</p>
              <p className="mt-1 text-sm font-medium text-slate-800">{w.label}</p>
              <p className="mt-1 text-xs text-slate-500">{w.hint}</p>
            </div>
          ))}
        </div>
      </DataCard>

      <DataCard title="Pipeline overview" description="Upload → Extract → Validate → Evaluate → Report" accent="blue">
        <PipelineBar pipeline={snapshot.pipeline} />
      </DataCard>

      <DataCard
        title="Recent activity"
        description="From the audit trail for this tenant"
        actions={
          <Link href="/dashboard/audit">
            <Button variant="ghost" size="sm">
              Audit log
              <ArrowRight className="ml-1 h-3.5 w-3.5" />
            </Button>
          </Link>
        }
      >
        <RecentList items={snapshot.recentActivity} />
      </DataCard>

      {variant === "saas" && (
        <DataCard title="Platform shortcuts" description="Cross-tenant administration" accent="blue">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              { label: "Tenants", href: "/dashboard/tenants", icon: Building2 },
              { label: "Subscriptions", href: "/dashboard/subscriptions", icon: Users },
              { label: "Costs", href: "/dashboard/costs", icon: DollarSign },
              { label: "LLM usage", href: "/dashboard/costs", icon: Cpu },
            ].map(({ label, href, icon: Icon }) => (
              <Link
                key={label}
                href={href}
                className="flex items-center gap-3 rounded-xl border border-slate-200/90 bg-white px-4 py-3 text-sm font-medium text-slate-800 shadow-sm transition-all hover:-translate-y-0.5 hover:border-primary/25 hover:shadow-md"
              >
                <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-4 w-4" />
                </span>
                {label}
                <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
              </Link>
            ))}
          </div>
        </DataCard>
      )}
    </div>
  );
}
