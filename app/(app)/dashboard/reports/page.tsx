import { PageHeader, StatCard } from "@/components/layout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { CheckCircle, Target, TrendingUp } from "lucide-react";

const recentReports = [
  { proposal: "Youth STEM Program", score: 8.5, date: "Mar 1, 2026", outcome: "Recommended" },
  { proposal: "Community Garden", score: 6.2, date: "Feb 28, 2026", outcome: "Needs Revision" },
  { proposal: "Senior Care Outreach", score: 9.1, date: "Feb 27, 2026", outcome: "Recommended" },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        subtitle="View assessment reports and analytics"
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 mb-6">
        <StatCard
          title="Completed This Week"
          value="18"
          description="+4 from last week"
          trend="up"
          icon={CheckCircle}
        />
        <StatCard
          title="Avg. Score"
          value="7.4"
          description="Above benchmark"
          trend="up"
          icon={Target}
        />
        <StatCard
          title="Approval Rate"
          value="62%"
          description="+5% this month"
          trend="up"
          icon={TrendingUp}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent Reports</CardTitle>
        </CardHeader>
        <CardContent className="p-0 pt-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Score</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentReports.map((report) => (
                <TableRow key={report.proposal}>
                  <TableCell className="font-medium">{report.proposal}</TableCell>
                  <TableCell>{report.score}</TableCell>
                  <TableCell>{report.date}</TableCell>
                  <TableCell
                    className={
                      report.outcome === "Recommended"
                        ? "text-green-600 dark:text-green-400"
                        : "text-yellow-600 dark:text-yellow-400"
                    }
                  >
                    {report.outcome}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
