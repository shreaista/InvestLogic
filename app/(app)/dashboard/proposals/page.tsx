"use client";

import { useState } from "react";
import { PageHeader, StatCard, DataCard, StatusBadge, EmptyState } from "@/components/app";
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
  DropdownMenuLabel,
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
  Clock,
  AlertTriangle,
  Filter,
  ChevronDown,
  Download,
  LucideIcon,
} from "lucide-react";

const proposals = [
  { id: "P-101", name: "Community Arts Program", applicant: "Arts Alliance", fund: "General Fund", amount: "$45,000", status: "New", assessor: "-", due: "-", submitted: "Mar 2, 2026", priority: "Medium" },
  { id: "P-102", name: "Youth Sports Initiative", applicant: "Sports Foundation", fund: "Youth Programs", amount: "$32,000", status: "New", assessor: "-", due: "-", submitted: "Mar 1, 2026", priority: "Low" },
  { id: "P-098", name: "Green Energy Project", applicant: "Eco Solutions", fund: "Innovation Grant", amount: "$78,000", status: "Assigned", assessor: "John D.", due: "Mar 5, 2026", submitted: "Feb 25, 2026", priority: "High" },
  { id: "P-099", name: "Digital Literacy Program", applicant: "Tech For All", fund: "Community Dev", amount: "$25,000", status: "Assigned", assessor: "Sarah M.", due: "Mar 6, 2026", submitted: "Feb 26, 2026", priority: "Medium" },
  { id: "P-095", name: "Senior Wellness Center", applicant: "Elder Care Co", fund: "Healthcare Init", amount: "$120,000", status: "In Review", assessor: "Mike R.", due: "Mar 3, 2026", submitted: "Feb 20, 2026", priority: "High" },
  { id: "P-096", name: "Food Security Network", applicant: "Hunger Relief", fund: "Emergency Reserve", amount: "$55,000", status: "In Review", assessor: "Lisa K.", due: "Mar 4, 2026", submitted: "Feb 22, 2026", priority: "High" },
  { id: "P-090", name: "Healthcare Access", applicant: "Health First", fund: "Healthcare Init", amount: "$150,000", status: "Approved", assessor: "Mike R.", due: "-", submitted: "Feb 15, 2026", priority: "High" },
  { id: "P-091", name: "Housing Initiative", applicant: "Shelter Org", fund: "Community Dev", amount: "$200,000", status: "Approved", assessor: "Sarah M.", due: "-", submitted: "Feb 12, 2026", priority: "Medium" },
  { id: "P-092", name: "Transport Subsidy", applicant: "Mobility Aid", fund: "General Fund", amount: "$35,000", status: "Declined", assessor: "John D.", due: "-", submitted: "Feb 10, 2026", priority: "Low" },
];

type StatusKey = "New" | "Assigned" | "In Review" | "Approved" | "Declined";
type FilterKey = "all" | "new" | "assigned" | "in-review" | "approved" | "declined";

const statusVariants: Record<StatusKey, "muted" | "info" | "warning" | "success" | "error"> = {
  New: "muted",
  Assigned: "info",
  "In Review": "warning",
  Approved: "success",
  Declined: "error",
};

const statusIcons: Record<StatusKey, LucideIcon> = {
  New: FileText,
  Assigned: UserPlus,
  "In Review": Clock,
  Approved: CheckCircle,
  Declined: XCircle,
};

export default function ProposalsPage() {
  const [filter, setFilter] = useState<FilterKey>("all");
  const [search, setSearch] = useState("");

  const filteredProposals = proposals.filter((p) => {
    const matchesFilter = filter === "all" || p.status.toLowerCase().replace(" ", "-") === filter;
    const matchesSearch =
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.applicant.toLowerCase().includes(search.toLowerCase()) ||
      p.id.toLowerCase().includes(search.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const counts = {
    all: proposals.length,
    new: proposals.filter(p => p.status === "New").length,
    assigned: proposals.filter(p => p.status === "Assigned").length,
    inReview: proposals.filter(p => p.status === "In Review").length,
    approved: proposals.filter(p => p.status === "Approved").length,
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="Proposals"
        subtitle="View and manage all funding proposals"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline" size="sm">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuLabel>Filter by Fund</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem>All Funds</DropdownMenuItem>
                <DropdownMenuItem>General Fund</DropdownMenuItem>
                <DropdownMenuItem>Innovation Grant</DropdownMenuItem>
                <DropdownMenuItem>Community Dev</DropdownMenuItem>
                <DropdownMenuItem>Youth Programs</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Proposals"
          value={counts.all}
          description="All time"
          icon={FileText}
        />
        <StatCard
          title="Pending Review"
          value={counts.new + counts.assigned}
          description={`${counts.new} new, ${counts.assigned} assigned`}
          icon={Clock}
        />
        <StatCard
          title="In Review"
          value={counts.inReview}
          description="Active assessments"
          trend="neutral"
          icon={AlertTriangle}
        />
        <StatCard
          title="Approved (MTD)"
          value={counts.approved}
          description="+3 from last month"
          trend="up"
          icon={CheckCircle}
        />
      </div>

      <DataCard title="All Proposals" noPadding>
        <div className="p-4 border-b space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 lg:items-center lg:justify-between">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterKey)}>
              <TabsList>
                <TabsTrigger value="all">
                  All
                  <span className="ml-1.5 text-xs text-muted-foreground">({counts.all})</span>
                </TabsTrigger>
                <TabsTrigger value="new">
                  New
                  <span className="ml-1.5 text-xs text-muted-foreground">({counts.new})</span>
                </TabsTrigger>
                <TabsTrigger value="assigned">
                  Assigned
                </TabsTrigger>
                <TabsTrigger value="in-review">
                  In Review
                </TabsTrigger>
                <TabsTrigger value="approved">
                  Approved
                </TabsTrigger>
              </TabsList>
            </Tabs>

            <div className="relative w-full lg:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search proposals..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        {filteredProposals.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No proposals found"
            description="Try adjusting your search or filter criteria"
            action={{ label: "Clear filters", onClick: () => { setFilter("all"); setSearch(""); } }}
          />
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Proposal</TableHead>
                <TableHead className="hidden md:table-cell">Fund</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden lg:table-cell">Assessor</TableHead>
                <TableHead className="hidden sm:table-cell">Due</TableHead>
                <TableHead className="w-10"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredProposals.map((proposal) => {
                const StatusIcon = statusIcons[proposal.status as StatusKey];
                return (
                  <TableRow key={proposal.id} className="group">
                    <TableCell>
                      <span className="font-mono text-xs text-muted-foreground">{proposal.id}</span>
                    </TableCell>
                    <TableCell>
                      <div className="min-w-0">
                        <p className="font-medium truncate">{proposal.name}</p>
                        <p className="text-xs text-muted-foreground truncate">{proposal.applicant}</p>
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant="outline" className="font-normal">
                        {proposal.fund}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-medium tabular-nums">{proposal.amount}</span>
                    </TableCell>
                    <TableCell>
                      <StatusBadge
                        variant={statusVariants[proposal.status as StatusKey]}
                        icon={StatusIcon}
                      >
                        {proposal.status}
                      </StatusBadge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {proposal.assessor !== "-" ? (
                        <div className="flex items-center gap-2">
                          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center text-xs font-medium text-primary">
                            {proposal.assessor.split(" ").map(n => n[0]).join("")}
                          </div>
                          <span className="text-sm">{proposal.assessor}</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      {proposal.due !== "-" ? (
                        <StatusBadge variant={
                          proposal.due === "Mar 3, 2026" ? "error" : "warning"
                        }>
                          {proposal.due}
                        </StatusBadge>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
                          >
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
                              <DropdownMenuItem className="text-emerald-600">
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Approve
                              </DropdownMenuItem>
                              <DropdownMenuItem className="text-red-600">
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
                );
              })}
            </TableBody>
          </Table>
        )}
      </DataCard>
    </div>
  );
}
