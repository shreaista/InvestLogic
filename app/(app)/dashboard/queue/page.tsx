import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const queueItems = [
  { id: "P-001", proposal: "Youth STEM Program", priority: "High", assigned: "Mar 1, 2026", deadline: "Mar 5, 2026" },
  { id: "P-002", proposal: "Community Garden Project", priority: "Medium", assigned: "Mar 1, 2026", deadline: "Mar 7, 2026" },
  { id: "P-003", proposal: "Senior Care Outreach", priority: "High", assigned: "Feb 28, 2026", deadline: "Mar 4, 2026" },
  { id: "P-004", proposal: "Arts & Culture Festival", priority: "Low", assigned: "Mar 2, 2026", deadline: "Mar 10, 2026" },
  { id: "P-005", proposal: "Tech Skills Workshop", priority: "Medium", assigned: "Mar 2, 2026", deadline: "Mar 8, 2026" },
];

const priorityVariant = {
  High: "destructive" as const,
  Medium: "warning" as const,
  Low: "secondary" as const,
};

export default function QueuePage() {
  return (
    <div>
      <PageHeader
        title="My Queue"
        subtitle="Proposals assigned to you for assessment"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proposal</TableHead>
                <TableHead>Priority</TableHead>
                <TableHead>Assigned</TableHead>
                <TableHead>Deadline</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {queueItems.map((item) => (
                <TableRow key={item.id}>
                  <TableCell className="font-mono text-xs">{item.id}</TableCell>
                  <TableCell className="font-medium">{item.proposal}</TableCell>
                  <TableCell>
                    <Badge variant={priorityVariant[item.priority as keyof typeof priorityVariant]}>
                      {item.priority}
                    </Badge>
                  </TableCell>
                  <TableCell>{item.assigned}</TableCell>
                  <TableCell>{item.deadline}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
