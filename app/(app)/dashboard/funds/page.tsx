import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const funds = [
  { name: "General Fund 2026", total: "$500,000", allocated: "$320,000", remaining: "$180,000" },
  { name: "Innovation Grant", total: "$150,000", allocated: "$85,000", remaining: "$65,000" },
  { name: "Emergency Reserve", total: "$100,000", allocated: "$12,000", remaining: "$88,000" },
  { name: "Community Outreach", total: "$75,000", allocated: "$45,000", remaining: "$30,000" },
];

export default function FundsPage() {
  return (
    <div>
      <PageHeader
        title="Funds"
        subtitle="Manage funding sources and allocations"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Fund Name</TableHead>
                <TableHead>Total Budget</TableHead>
                <TableHead>Allocated</TableHead>
                <TableHead>Remaining</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {funds.map((fund) => (
                <TableRow key={fund.name}>
                  <TableCell className="font-medium">{fund.name}</TableCell>
                  <TableCell>{fund.total}</TableCell>
                  <TableCell>{fund.allocated}</TableCell>
                  <TableCell className="text-green-600 dark:text-green-400">
                    {fund.remaining}
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
