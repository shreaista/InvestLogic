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

const tenants = [
  { name: "Acme Corp", plan: "Enterprise", users: 45, status: "Active" },
  { name: "Beta Inc", plan: "Pro", users: 12, status: "Active" },
  { name: "Gamma LLC", plan: "Starter", users: 5, status: "Trial" },
  { name: "Delta Partners", plan: "Enterprise", users: 78, status: "Active" },
  { name: "Epsilon Fund", plan: "Pro", users: 23, status: "Active" },
];

export default function TenantsPage() {
  return (
    <div>
      <PageHeader
        title="Tenants"
        subtitle="Manage all tenant organizations"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant Name</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Users</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tenants.map((tenant) => (
                <TableRow key={tenant.name}>
                  <TableCell className="font-medium">{tenant.name}</TableCell>
                  <TableCell>{tenant.plan}</TableCell>
                  <TableCell>{tenant.users}</TableCell>
                  <TableCell>
                    <Badge
                      variant={tenant.status === "Active" ? "success" : "warning"}
                    >
                      {tenant.status}
                    </Badge>
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
