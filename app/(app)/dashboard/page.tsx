import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { PageHeader, StatCard, DataCard } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
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
  TrendingUp,
  Wallet,
  FileText,
  FileCheck,
  AlertCircle,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  if (user.role === "saas_admin") {
    return <SaaSAdminOverview />;
  }

  if (user.role === "tenant_admin") {
    return <TenantAdminOverview />;
  }

  return <AssessorOverview />;
}

function SaaSAdminOverview() {
  const tenantUsage = [
    { tenant: "Acme Corp", users: 45, proposals: 128, llmCalls: "12.4K", cost: "$234" },
    { tenant: "Beta Inc", users: 12, proposals: 34, llmCalls: "3.2K", cost: "$67" },
    { tenant: "Gamma LLC", users: 5, proposals: 8, llmCalls: "890", cost: "$18" },
    { tenant: "Delta Partners", users: 78, proposals: 256, llmCalls: "28.1K", cost: "$512" },
  ];

  const costDrivers = [
    { name: "GPT-4 Turbo", percentage: 45, amount: "$4,230" },
    { name: "Claude 3 Opus", percentage: 28, amount: "$2,640" },
    { name: "Embeddings", percentage: 15, amount: "$1,410" },
    { name: "Storage", percentage: 8, amount: "$752" },
    { name: "Compute", percentage: 4, amount: "$368" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="SaaS Admin Overview"
        subtitle="Platform-wide metrics and insights"
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
          description="+12% from last month"
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
        <DataCard title="Tenant Usage">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead className="text-right">Users</TableHead>
                <TableHead className="text-right">Proposals</TableHead>
                <TableHead className="text-right">LLM Calls</TableHead>
                <TableHead className="text-right">Cost</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenantUsage.map((row) => (
                <TableRow key={row.tenant}>
                  <TableCell className="font-medium">{row.tenant}</TableCell>
                  <TableCell className="text-right">{row.users}</TableCell>
                  <TableCell className="text-right">{row.proposals}</TableCell>
                  <TableCell className="text-right text-muted-foreground">{row.llmCalls}</TableCell>
                  <TableCell className="text-right font-medium">{row.cost}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </DataCard>

        <DataCard title="Cost Drivers">
          <div className="space-y-4">
            {costDrivers.map((driver) => (
              <div key={driver.name} className="flex items-center justify-between">
                <div className="flex items-center gap-3 flex-1">
                  <span className="text-sm font-medium w-28">{driver.name}</span>
                  <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full"
                      style={{ width: `${driver.percentage}%` }}
                    />
                  </div>
                </div>
                <div className="flex items-center gap-2 ml-4">
                  <Badge variant="secondary">{driver.percentage}%</Badge>
                  <span className="text-sm font-medium w-16 text-right">{driver.amount}</span>
                </div>
              </div>
            ))}
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
      <PageHeader
        title="Tenant Overview"
        subtitle="Your organization's funding pipeline"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Funds Available"
          value="$1.2M"
          description="Across 8 active funds"
          trend="neutral"
          icon={Wallet}
        />
        <StatCard
          title="In Review"
          value="7"
          description="3 due this week"
          trend="neutral"
          icon={Clock}
        />
        <StatCard
          title="Completed (MTD)"
          value="23"
          description="+8 from last month"
          trend="up"
          icon={FileCheck}
        />
        <StatCard
          title="Monthly Cost"
          value="$234"
          description="LLM processing"
          trend="neutral"
          icon={DollarSign}
        />
      </div>

      <DataCard title="Proposal Pipeline">
        <Tabs defaultValue="new">
          <TabsList>
            <TabsTrigger value="new">
              New <Badge variant="secondary" className="ml-1.5">{pipelineData.new.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="assigned">
              Assigned <Badge variant="secondary" className="ml-1.5">{pipelineData.assigned.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="review">
              In Review <Badge variant="secondary" className="ml-1.5">{pipelineData.review.length}</Badge>
            </TabsTrigger>
            <TabsTrigger value="completed">
              Completed <Badge variant="secondary" className="ml-1.5">{pipelineData.completed.length}</Badge>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="new">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Submitted</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineData.new.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.amount}</TableCell>
                    <TableCell className="text-muted-foreground">{item.submitted}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="assigned">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Due Date</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineData.assigned.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.assessor}</TableCell>
                    <TableCell>
                      <Badge variant="warning">{item.due}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="review">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Assessor</TableHead>
                  <TableHead>Score</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineData.review.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>{item.assessor}</TableCell>
                    <TableCell>
                      <Badge variant="info">{item.score}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>

          <TabsContent value="completed">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID</TableHead>
                  <TableHead>Proposal</TableHead>
                  <TableHead>Applicant</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Completed</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pipelineData.completed.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-mono text-xs">{item.id}</TableCell>
                    <TableCell className="font-medium">{item.name}</TableCell>
                    <TableCell>{item.applicant}</TableCell>
                    <TableCell>
                      <Badge variant={item.status === "Approved" ? "success" : "destructive"}>
                        {item.status === "Approved" ? <CheckCircle className="h-3 w-3 mr-1" /> : <AlertCircle className="h-3 w-3 mr-1" />}
                        {item.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{item.date}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
        </Tabs>
      </DataCard>
    </div>
  );
}

function AssessorOverview() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="My Queue"
        subtitle="Your assigned assessments and progress"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Assigned to Me"
          value="12"
          description="4 high priority"
          trend="neutral"
          icon={Target}
        />
        <StatCard
          title="Completed Today"
          value="5"
          description="Above average"
          trend="up"
          icon={CheckCircle}
        />
        <StatCard
          title="Pending Review"
          value="3"
          description="Due this week"
          trend="neutral"
          icon={Clock}
        />
        <StatCard
          title="Avg. Review Time"
          value="2.4 hrs"
          description="-15% improvement"
          trend="up"
          icon={TrendingUp}
        />
      </div>
    </div>
  );
}
