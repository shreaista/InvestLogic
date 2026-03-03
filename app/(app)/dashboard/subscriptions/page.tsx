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

const subscriptions = [
  { tenant: "Acme Corp", plan: "Enterprise", mrr: "$2,500", nextBilling: "Apr 1, 2026" },
  { tenant: "Beta Inc", plan: "Pro", mrr: "$500", nextBilling: "Mar 15, 2026" },
  { tenant: "Gamma LLC", plan: "Starter", mrr: "$99", nextBilling: "Mar 20, 2026" },
  { tenant: "Delta Partners", plan: "Enterprise", mrr: "$2,500", nextBilling: "Apr 5, 2026" },
];

export default function SubscriptionsPage() {
  return (
    <div>
      <PageHeader
        title="Subscriptions"
        subtitle="Manage subscription plans and billing cycles"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>MRR</TableHead>
                <TableHead>Next Billing</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {subscriptions.map((sub) => (
                <TableRow key={sub.tenant}>
                  <TableCell className="font-medium">{sub.tenant}</TableCell>
                  <TableCell>{sub.plan}</TableCell>
                  <TableCell>{sub.mrr}</TableCell>
                  <TableCell>{sub.nextBilling}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
