"use client";

import { PageHeader, StatCard, DataCard, StatusBadge } from "@/components/app";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Building2,
  Users,
  DollarSign,
  Cpu,
  CheckCircle,
  Clock,
  Target,
  Wallet,
  FileCheck,
  AlertCircle,
  ArrowRight,
  AlertTriangle,
  Timer,
  TrendingUp,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface DashboardHomeProps {
  user: {
    id?: string;
    email?: string;
    name?: string;
    role?: "saas_admin" | "tenant_admin" | "assessor";
  };
}

export default function DashboardHome({ user }: DashboardHomeProps) {
  const role = user.role || "assessor";

  return (
    <div className="space-y-6">
      {role === "saas_admin" && <SaaSAdminOverview />}
      {role === "tenant_admin" && <TenantAdminOverview />}
      {role === "assessor" && <AssessorOverview />}
    </div>
  );
}

function SaaSAdminOverview() {
  const tenantUsage = [
    { tenant: "Delta Partners", users: 78, proposals: 256, llmCalls: "28.1K", cost: "$512", trend: "up" },
    { tenant: "Acme Corp", users: 45, proposals: 128, llmCalls: "12.4K", cost: "$234", trend: "up" },
    { tenant: "Zeta Ventures", users: 48, proposals: 89, llmCalls: "8.2K", cost: "$156", trend: "neutral" },
    { tenant: "Beta Inc", users: 12, proposals: 34, llmCalls: "3.2K", cost: "$67", trend: "down" },
    { tenant: "Gamma LLC", users: 5, proposals: 8, llmCalls: "890", cost: "$18", trend: "neutral" },
  ];

  const costDrivers = [
    { name: "GPT-4 Turbo", percentage: 45, amount: "$4,230", color: "bg-violet-500" },
    { name: "Claude 3 Opus", percentage: 28, amount: "$2,640", color: "bg-blue-500" },
    { name: "Embeddings", percentage: 15, amount: "$1,410", color: "bg-emerald-500" },
    { name: "Storage", percentage: 8, amount: "$752", color: "bg-amber-500" },
    { name: "Compute", percentage: 4, amount: "$368", color: "bg-slate-400" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Platform Overview"
        subtitle="Real-time metrics across all tenants"
        actions={
          <Link href="/dashboard/reports">
            <Button variant="outline" size="sm">
              View Reports
              <ExternalLink className="h-3.5 w-3.5 ml-2" />
            </Button>
          </Link>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Tenants"
          value="24"
          description="+3 this month"
          trend="up"
          icon={Building2}
        />
        <StatCard
          title="Active Users"
          value="312"
          description="+28 this week"
          trend="up"
          icon={Users}
        />
        <StatCard
          title="Monthly Cost"
          value="$9,420"
          description="+12% vs last month"
          trend="up"
          icon={DollarSign}
        />
        <StatCard
          title="LLM Requests"
          value="1.2M"
          description="Last 30 days"
          trend="neutral"
          icon={Cpu}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <DataCard
          title="Tenant Usage"
          description="Top tenants by activity"
          actions={
            <Link href="/dashboard/tenants">
              <Button variant="ghost" size="sm">
                View All
                <ArrowRight className="h-3.5 w-3.5 ml-1" />
              </Button>
            </Link>
          }
          noPadding
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right hidden sm:table-cell">Proposals</TableHead>
                <TableHead className="text-right hidden md:table-cell">LLM Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsage.map((row) => (
                <TableRow key={row.tenant} className="group">
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <div className="h-8 w-8 rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="font-medium truncate">{row.tenant}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{row.users}</TableCell>
                  <TableCell className="text-right tabular-nums hidden sm:table-cell">{row.proposals}</TableCell>
                  <TableCell className="text-right text-muted-foreground hidden md:table-cell">{row.llmCalls}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <span className="font-medium tabular-nums">{row.cost}</span>
                      {row.trend === "up" && <TrendingUp className="h-3 w-3 text-emerald-500" />}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>

        <DataCard title="Cost Drivers" description="Monthly spend breakdown">
          <div className="space-y-4">
            {costDrivers.map((driver) => (
              <div key={driver.name} className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">{driver.name}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="tabular-nums">
                      {driver.percentage}%
                    </Badge>
                    <span className="text-sm font-semibold tabular-nums w-16 text-right">
                      {driver.amount}
                    </span>
                  </div>
                </div>
                <div className="h-2 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${driver.color}`}
                    style={{ width: `${driver.percentage}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Total Monthly Cost</span>
              <span className="font-semibold text-lg">$9,400</span>
            </div>
          </div>
        </DataCard>
      </div>
    </div>
  );
}

function TenantAdminOverview() {
  const pipelineData = {
    new: [
      { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", amount: "$45,000", submitted: "Mar 2, 2026" },
      { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", amount: "$32,000", submitted: "Mar 1, 2026" },
    ],
    assigned: [
      { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", amount: "$78,000", assessor: "John D.", due: "Mar 5, 2026" },
      { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", amount: "$25,000", assessor: "Sarah M.", due: "Mar 6, 2026" },
    ],
    review: [
      { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", amount: "$120,000", assessor: "Mike R.", score: "8.2" },
      { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", amount: "$55,000", assessor: "Lisa K.", score: "7.8" },
      { id: "P-097", name: "Education Technology", applicant: "EduTech Inc", amount: "$89,000", assessor: "John D.", score: "9.1" },
    ],
    completed: [
      { id: "P-090", name: "Healthcare Access", applicant: "Health First", amount: "$150,000", status: "Approved", date: "Feb 28, 2026" },
      { id: "P-091", name: "Housing Initiative", applicant: "Shelter Org", amount: "$200,000", status: "Approved", date: "Feb 27, 2026" },
      { id: "P-092", name: "Transport Subsidy", applicant: "Mobility Aid", amount: "$35,000", status: "Declined", date: "Feb 26, 2026" },
    ],
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Tenant Overview" subtitle="Your organization's funding pipeline" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Funds Available" value="$1.2M" description="Across 8 active funds" trend="neutral" icon={Wallet} />
        <StatCard title="In Review" value="7" description="3 due this week" trend="neutral" icon={Clock} />
        <StatCard title="Completed (MTD)" value="23" description="+8 from last month" trend="up" icon={FileCheck} />
        <StatCard title="Monthly Cost" value="$234" description="LLM processing" trend="neutral" icon={DollarSign} />
      </div>

      <DataCard title="Proposal Pipeline" noPadding>
        <div className="p-4 border-b">
          <Tabs defaultValue="new">
            <TabsList>
              <TabsTrigger value="new">
                New
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pipelineData.new.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="assigned">
                Assigned
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pipelineData.assigned.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="review">
                In Review
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pipelineData.review.length}</Badge>
              </TabsTrigger>
              <TabsTrigger value="completed">
                Completed
                <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">{pipelineData.completed.length}</Badge>
              </TabsTrigger>
            </TabsList>

            <TabsContent value="new" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proposal</TableHead>
                    <TableHead className="hidden sm:table-cell">Applicant</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead className="hidden md:table-cell">Submitted</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineData.new.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.applicant}</TableCell>
                      <TableCell className="tabular-nums">{item.amount}</TableCell>
                      <TableCell className="text-muted-foreground hidden md:table-cell">{item.submitted}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="assigned" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proposal</TableHead>
                    <TableHead className="hidden sm:table-cell">Assessor</TableHead>
                    <TableHead>Due Date</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineData.assigned.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.assessor}</TableCell>
                      <TableCell>
                        <StatusBadge variant="warning">{item.due}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="review" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proposal</TableHead>
                    <TableHead className="hidden sm:table-cell">Assessor</TableHead>
                    <TableHead>Score</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineData.review.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell className="hidden sm:table-cell">{item.assessor}</TableCell>
                      <TableCell>
                        <StatusBadge variant="info">{item.score}</StatusBadge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="completed" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>ID</TableHead>
                    <TableHead>Proposal</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Completed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pipelineData.completed.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell className="font-mono text-xs">{item.id}</TableCell>
                      <TableCell className="font-medium">{item.name}</TableCell>
                      <TableCell>
                        <StatusBadge
                          variant={item.status === "Approved" ? "success" : "error"}
                          icon={item.status === "Approved" ? CheckCircle : AlertCircle}
                        >
                          {item.status}
                        </StatusBadge>
                      </TableCell>
                      <TableCell className="text-muted-foreground hidden sm:table-cell">{item.date}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </div>
      </DataCard>
    </div>
  );
}

function AssessorOverview() {
  const queue = [
    { id: "P-095", name: "Senior Wellness Center", tenant: "Elder Care Co", priority: "High", status: "In Progress", due: "Mar 3, 2026", daysLeft: 1 },
    { id: "P-098", name: "Green Energy Project", tenant: "Eco Solutions", priority: "High", status: "Not Started", due: "Mar 5, 2026", daysLeft: 3 },
    { id: "P-096", name: "Food Security Network", tenant: "Hunger Relief", priority: "Medium", status: "In Progress", due: "Mar 4, 2026", daysLeft: 2 },
    { id: "P-099", name: "Digital Literacy Program", tenant: "Tech For All", priority: "Medium", status: "Not Started", due: "Mar 6, 2026", daysLeft: 4 },
    { id: "P-100", name: "Arts & Culture Festival", tenant: "Creative Minds", priority: "Low", status: "Not Started", due: "Mar 10, 2026", daysLeft: 8 },
  ];

  type PriorityKey = "High" | "Medium" | "Low";
  type StatusKey = "In Progress" | "Not Started";

  const priorityVariants: Record<PriorityKey, "error" | "warning" | "muted"> = {
    High: "error",
    Medium: "warning",
    Low: "muted",
  };

  const statusVariants: Record<StatusKey, "info" | "muted"> = {
    "In Progress": "info",
    "Not Started": "muted",
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="My Dashboard"
        subtitle="Your assessment queue and progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Assigned" value="5" description="Total in queue" icon={Target} />
        <StatCard title="Due Soon" value="2" description="Within 48 hours" trend="neutral" icon={AlertTriangle} />
        <StatCard title="Completed (Week)" value="8" description="+2 from last week" trend="up" icon={CheckCircle} />
        <StatCard title="Avg Turnaround" value="1.8 days" description="-0.4 days improved" trend="up" icon={Timer} />
      </div>

      <DataCard
        title="My Queue"
        actions={
          <Link href="/dashboard/queue">
            <Button variant="outline" size="sm">
              View All
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </Link>
        }
      >
        <Tabs defaultValue="all">
          <TabsList>
            <TabsTrigger value="all">
              All
              <Badge variant="secondary" className="ml-1.5 h-5 px-1.5">5</Badge>
            </TabsTrigger>
            <TabsTrigger value="high">
              High Priority
              <Badge variant="destructive" className="ml-1.5 h-5 px-1.5">2</Badge>
            </TabsTrigger>
            <TabsTrigger value="in-progress">
              In Progress
              <Badge variant="info" className="ml-1.5 h-5 px-1.5">2</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="all" className="mt-4">
            <div className="space-y-2">
              {queue.map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  priorityVariants={priorityVariants}
                  statusVariants={statusVariants}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="high" className="mt-4">
            <div className="space-y-2">
              {queue.filter(q => q.priority === "High").map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  priorityVariants={priorityVariants}
                  statusVariants={statusVariants}
                />
              ))}
            </div>
          </TabsContent>

          <TabsContent value="in-progress" className="mt-4">
            <div className="space-y-2">
              {queue.filter(q => q.status === "In Progress").map((item) => (
                <QueueItem
                  key={item.id}
                  item={item}
                  priorityVariants={priorityVariants}
                  statusVariants={statusVariants}
                />
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </DataCard>
    </div>
  );
}

interface QueueItemProps {
  item: {
    id: string;
    name: string;
    tenant: string;
    priority: string;
    status: string;
    due: string;
    daysLeft: number;
  };
  priorityVariants: Record<string, "error" | "warning" | "muted">;
  statusVariants: Record<string, "info" | "muted">;
}

function QueueItem({ item, priorityVariants, statusVariants }: QueueItemProps) {
  return (
    <div className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors">
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-muted-foreground">{item.id}</span>
            <span className="font-medium truncate">{item.name}</span>
          </div>
          <p className="text-sm text-muted-foreground">{item.tenant}</p>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <StatusBadge variant={priorityVariants[item.priority]}>
            {item.priority}
          </StatusBadge>
          <StatusBadge variant={statusVariants[item.status]}>
            {item.status}
          </StatusBadge>
        </div>
        <div className="hidden md:block text-right">
          <p className="text-sm font-medium">{item.due}</p>
          <p className={`text-xs ${item.daysLeft <= 2 ? "text-red-500" : "text-muted-foreground"}`}>
            {item.daysLeft} day{item.daysLeft !== 1 ? "s" : ""} left
          </p>
        </div>
      </div>
      <Button variant="outline" size="sm" className="ml-4">
        Open
      </Button>
    </div>
  );
}
