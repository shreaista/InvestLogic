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

const users = [
  { name: "Alice Johnson", email: "alice@tenant.com", role: "Admin", status: "Active" },
  { name: "Bob Smith", email: "bob@tenant.com", role: "Assessor", status: "Active" },
  { name: "Carol Davis", email: "carol@tenant.com", role: "Assessor", status: "Invited" },
  { name: "David Lee", email: "david@tenant.com", role: "Viewer", status: "Active" },
];

export default function UsersPage() {
  return (
    <div>
      <PageHeader
        title="Users"
        subtitle="Manage team members and permissions"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow key={user.email}>
                  <TableCell className="font-medium">{user.name}</TableCell>
                  <TableCell>{user.email}</TableCell>
                  <TableCell>{user.role}</TableCell>
                  <TableCell>
                    <Badge variant={user.status === "Active" ? "success" : "secondary"}>
                      {user.status}
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
