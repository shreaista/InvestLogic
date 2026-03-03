import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { PageHeader, StatCard } from "@/components/layout";
import {
  Building2,
  CreditCard,
  DollarSign,
  Users,
  Wallet,
  FileText,
  CheckCircle,
  Clock,
  Target,
  TrendingUp,
} from "lucide-react";

export default async function DashboardPage() {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div>
      <PageHeader
        title={getTitleByRole(user.role)}
        subtitle={getSubtitleByRole(user.role)}
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {renderCardsByRole(user.role)}
      </div>
    </div>
  );
}

function getTitleByRole(role: string): string {
  switch (role) {
    case "saas_admin":
      return "Global Overview";
    case "tenant_admin":
      return "Tenant Overview";
    case "assessor":
      return "My Queue";
    default:
      return "Dashboard";
  }
}

function getSubtitleByRole(role: string): string {
  switch (role) {
    case "saas_admin":
      return "Platform-wide metrics and insights";
    case "tenant_admin":
      return "Your organization at a glance";
    case "assessor":
      return "Your assigned assessments and progress";
    default:
      return "";
  }
}

function renderCardsByRole(role: string) {
  switch (role) {
    case "saas_admin":
      return (
        <>
          <StatCard
            title="Total Tenants"
            value="24"
            description="+3 this month"
            trend="up"
            icon={Building2}
          />
          <StatCard
            title="Active Subscriptions"
            value="18"
            description="75% conversion"
            trend="neutral"
            icon={CreditCard}
          />
          <StatCard
            title="Monthly Revenue"
            value="$42,500"
            description="+12% from last month"
            trend="up"
            icon={DollarSign}
          />
          <StatCard
            title="Total Users"
            value="312"
            description="+28 this week"
            trend="up"
            icon={Users}
          />
        </>
      );
    case "tenant_admin":
      return (
        <>
          <StatCard
            title="Active Funds"
            value="8"
            description="3 closing soon"
            trend="neutral"
            icon={Wallet}
          />
          <StatCard
            title="Open Proposals"
            value="34"
            description="+5 this week"
            trend="up"
            icon={FileText}
          />
          <StatCard
            title="Team Members"
            value="12"
            description="2 pending invites"
            trend="neutral"
            icon={Users}
          />
          <StatCard
            title="Pending Approvals"
            value="7"
            description="Action required"
            trend="neutral"
            icon={Clock}
          />
        </>
      );
    case "assessor":
      return (
        <>
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
        </>
      );
    default:
      return null;
  }
}
