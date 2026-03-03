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

const proposals = [
  { name: "Community Garden Project", applicant: "Green Initiative", amount: "$25,000", status: "Pending" },
  { name: "Youth STEM Program", applicant: "Education First", amount: "$50,000", status: "In Review" },
  { name: "Senior Care Outreach", applicant: "Care Partners", amount: "$18,000", status: "Approved" },
  { name: "Arts & Culture Festival", applicant: "Creative Minds", amount: "$35,000", status: "Pending" },
  { name: "Tech Skills Workshop", applicant: "Digital Future", amount: "$22,000", status: "In Review" },
];

const statusVariant = {
  Pending: "warning" as const,
  "In Review": "info" as const,
  Approved: "success" as const,
};

export default function ProposalsPage() {
  return (
    <div>
      <PageHeader
        title="Proposals"
        subtitle="View and manage funding proposals"
      />
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Proposal</TableHead>
                <TableHead>Applicant</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {proposals.map((proposal) => (
                <TableRow key={proposal.name}>
                  <TableCell className="font-medium">{proposal.name}</TableCell>
                  <TableCell>{proposal.applicant}</TableCell>
                  <TableCell>{proposal.amount}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant[proposal.status as keyof typeof statusVariant]}>
                      {proposal.status}
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
