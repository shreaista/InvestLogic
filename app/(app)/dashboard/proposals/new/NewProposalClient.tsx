"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { PageHeader, EmptyState } from "@/components/app";
import { ArrowLeft, FileText } from "lucide-react";

export default function NewProposalClient() {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/proposals">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Proposals
          </Button>
        </Link>
      </div>

      <PageHeader
        title="New Proposal"
        subtitle="Create a new funding proposal"
      />

      <EmptyState
        icon={FileText}
        title="Proposal creation"
        description="Proposal creation flow will be available here. For now, proposals are managed from the proposals list."
        action={{
          label: "Back to Proposals",
          onClick: () => router.push("/dashboard/proposals"),
        }}
      />
    </div>
  );
}
