import { PageHeader, StatCard } from "@/components/layout";
import { Server, Cpu, Database } from "lucide-react";

export default function CostsPage() {
  return (
    <div>
      <PageHeader
        title="Costs"
        subtitle="Platform cost analytics and billing"
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Infrastructure"
          value="$12,340"
          description="+8% from last month"
          trend="up"
          icon={Server}
        />
        <StatCard
          title="API Usage"
          value="$4,520"
          description="-3% from last month"
          trend="down"
          icon={Cpu}
        />
        <StatCard
          title="Storage"
          value="$2,180"
          description="Stable"
          trend="neutral"
          icon={Database}
        />
      </div>
    </div>
  );
}
