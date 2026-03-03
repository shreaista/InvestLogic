"use client";

import { useState } from "react";
import { PageHeader } from "@/components/layout";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  MoreHorizontal,
  Eye,
  UserPlus,
  MessageSquare,
  CheckCircle,
  XCircle,
  FileText,
} from "lucide-react";

const proposals = [
  { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", fund: "General Fund", amount: "$45,000", status: "New", assessor: "-", due: "-", submitted: "Mar 2, 2026" },
  { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", fund: "Youth Programs", amount: "$32,000", status: "New", assessor: "-", due: "-", submitted: "Mar 1, 2026" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", fund: "Innovation Grant", amount: "$78,000", status: "Assigned", assessor: "John D.", due: "Mar 5, 2026", submitted: "Feb 25, 2026" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", fund: "Community Dev", amount: "$25,000", status: "Assigned", assessor: "Sarah M.", due: "Mar 6, 2026", submitted: "Feb 26, 2026" },
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", fund: "Healthcare Init", amount: "$120,000", status: "In Review", assessor: "Mike R.", due: "Mar 3, 2026", submitted: "Feb 20, 2026" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", fund: "Emergency Reserve", amount: "$55,000", status: "In Review", assessor: "Lisa K.", due: "Mar 4, 2026", submitted: "Feb 22, 2026" },
  { id: "P-090", name: "Healthcare Access", applicant: "Health First", fund: "Healthcare Init", amount: "$150,000", status: "Approved", assessor: "Mike R.", due: "-", submitted: "Feb 15, 2026" },
  { id: "P-091", name: "Housing Initiative", applicant: "Shelter Org", fund: "Community Dev", amount: "$200,000", status: "Approved", assessor: "Sarah M.", due: "-", submitted: "Feb 12, 2026" },
  { id: "P-092", name: "Transport Subsidy", applicant: "Mobility Aid", fund: "General Fund", amount: "$35,000", status: "Declined", assessor: "John D.", due: "-", submitted: "Feb 10, 2026" },
];

const statusStyles = {
  New: "secondary",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "destructive",
} as const;

export default function ProposalsPage() {
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filter === "all" || p.status.toLowerCase().replace(" ", "-") === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.applicant.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="View and manage all funding proposals"
      />

      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Tabs value={filter} onValueChange={setFilter}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="new">New</TabsTrigger>
                <TabsTrigger value="assigned">Assigned</TabsTrigger>
                <TabsTrigger value="in-review">In Review</TabsTrigger>
                <TabsTrigger value="approved">Approved</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proposal</TableHead>
                <TableHead>Fund</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Assessor</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => (
                <TableRow key={proposal.id}>
                  <TableCell className="font-mono text-xs">{proposal.id}</TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium">{proposal.name}</p>
                      <p className="text-xs text-muted-foreground">{proposal.applicant}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-muted-foreground text-sm">{proposal.fund}</TableCell>
                  <TableCell className="font-medium">{proposal.amount}</TableCell>
                  <TableCell>
                    <Badge variant={statusStyles[proposal.status as keyof typeof statusStyles]}>
                      {proposal.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{proposal.assessor}</TableCell>
                  <TableCell>
                    {proposal.due !== "-" ? (
                      <Badge variant="outline">{proposal.due}</Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Eye className="h-4 w-4 mr-2" />
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FileText className="h-4 w-4 mr-2" />
                          View Documents
                        </DropdownMenuItem>
                        {proposal.status === "New" && (
                          <DropdownMenuItem>
                            <UserPlus className="h-4 w-4 mr-2" />
                            Assign Assessor
                          </DropdownMenuItem>
                        )}
                        {proposal.status === "In Review" && (
                          <>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              Approve
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-destructive">
                              <XCircle className="h-4 w-4 mr-2" />
                              Decline
                            </DropdownMenuItem>
                          </>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <MessageSquare className="h-4 w-4 mr-2" />
                          Add Comment
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
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
