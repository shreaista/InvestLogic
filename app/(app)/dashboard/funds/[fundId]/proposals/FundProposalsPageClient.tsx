"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { ArrowLeft, Loader2, Plus } from "lucide-react";
import { useToast } from "@/components/ui/toast";
import type { Fund } from "@/lib/types";

interface ProposalRow {
  proposal_id: string;
  proposal_name: string;
  applicant_name: string;
  requested_amount: string | number | null;
  sector: string | null;
  stage: string | null;
  geography: string | null;
  status: string;
  created_at: string;
}

interface FundProposalsPageClientProps {
  fund: Fund;
}

function formatDate(dateString: string): string {
  if (!dateString) return "-";
  try {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "-";
  }
}

const emptyForm = {
  proposal_name: "",
  applicant_name: "",
  requested_amount: "",
  sector: "",
  stage: "",
  geography: "",
  business_model: "",
  description: "",
};

export default function FundProposalsPageClient({ fund }: FundProposalsPageClientProps) {
  const { toast } = useToast();
  const [proposals, setProposals] = useState<ProposalRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState(emptyForm);

  const loadProposals = useCallback(async () => {
    try {
      const res = await fetch(`/api/proposals?fund_id=${encodeURIComponent(fund.id)}`, {
        credentials: "include",
      });
      const data = await res.json();
      if (data.ok && Array.isArray(data.proposals)) {
        setProposals(data.proposals);
      } else {
        setProposals([]);
      }
    } catch {
      setProposals([]);
    } finally {
      setLoading(false);
    }
  }, [fund.id]);

  useEffect(() => {
    loadProposals();
  }, [loadProposals]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.proposal_name.trim()) {
      toast("Proposal name is required", "error");
      return;
    }
    setSubmitting(true);
    try {
      const amount = form.requested_amount.trim()
        ? Number(form.requested_amount)
        : null;
      if (form.requested_amount.trim() && (amount === null || Number.isNaN(amount))) {
        toast("Requested amount must be a number", "error");
        setSubmitting(false);
        return;
      }
      console.log("[FundProposals] submitted fund_id", fund.id);
      const res = await fetch("/api/proposals", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fund_id: fund.id,
          proposal_name: form.proposal_name.trim(),
          applicant_name: form.applicant_name.trim(),
          requested_amount: amount,
          sector: form.sector.trim() || null,
          stage: form.stage.trim() || null,
          geography: form.geography.trim() || null,
          business_model: form.business_model.trim() || null,
          description: form.description.trim() || null,
        }),
      });
      const data = await res.json();
      if (data.ok) {
        toast("Proposal created", "success");
        setForm(emptyForm);
        setDialogOpen(false);
        await loadProposals();
      } else {
        toast(data.error || "Failed to create proposal", "error");
      }
    } catch {
      toast("Failed to create proposal", "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Proposals
          </h1>
          <p className="text-sm text-slate-500 mt-0.5">
            {fund.name}
            {fund.code && (
              <span className="font-mono text-slate-600 ml-2">({fund.code})</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Proposal
          </Button>
          <Link href="/dashboard/funds">
            <Button variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Funds
            </Button>
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-slate-400" />
        </div>
      ) : proposals.length === 0 ? (
        <div className="rounded-lg border border-slate-200 bg-white p-8 text-center">
          <p className="text-sm text-slate-600 mb-4">No proposals for this fund yet.</p>
          <Button type="button" onClick={() => setDialogOpen(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Proposal
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border border-slate-200 bg-white overflow-hidden">
          <div className="px-4 py-3 border-b border-slate-200 bg-slate-50/50">
            <h2 className="text-sm font-semibold text-slate-700">Proposals</h2>
          </div>
          <ul className="divide-y divide-slate-200">
            {proposals.map((p) => (
              <li
                key={p.proposal_id}
                className="flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-slate-900">{p.proposal_name}</p>
                  <p className="text-xs text-slate-500">
                    {p.applicant_name}
                    {p.requested_amount != null && p.requested_amount !== "" && (
                      <span>
                        {" "}
                        ·{" "}
                        {typeof p.requested_amount === "number"
                          ? p.requested_amount.toLocaleString()
                          : p.requested_amount}
                      </span>
                    )}
                    {" · "}
                    {formatDate(p.created_at)}
                  </p>
                </div>
                <span className="shrink-0 text-xs text-slate-600">{p.status}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[90vh] max-w-lg overflow-y-auto sm:max-w-lg">
          <form onSubmit={handleSubmit}>
            <DialogHeader>
              <DialogTitle>Create proposal</DialogTitle>
            </DialogHeader>
            <div className="grid gap-3 py-4">
              <div className="space-y-1.5">
                <Label htmlFor="proposal_name">proposal_name</Label>
                <Input
                  id="proposal_name"
                  value={form.proposal_name}
                  onChange={(e) => setForm((f) => ({ ...f, proposal_name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="applicant_name">applicant_name</Label>
                <Input
                  id="applicant_name"
                  value={form.applicant_name}
                  onChange={(e) => setForm((f) => ({ ...f, applicant_name: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="requested_amount">requested_amount</Label>
                <Input
                  id="requested_amount"
                  type="number"
                  step="any"
                  min="0"
                  value={form.requested_amount}
                  onChange={(e) => setForm((f) => ({ ...f, requested_amount: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="sector">sector</Label>
                <Input
                  id="sector"
                  value={form.sector}
                  onChange={(e) => setForm((f) => ({ ...f, sector: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="stage">stage</Label>
                <Input
                  id="stage"
                  value={form.stage}
                  onChange={(e) => setForm((f) => ({ ...f, stage: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="geography">geography</Label>
                <Input
                  id="geography"
                  value={form.geography}
                  onChange={(e) => setForm((f) => ({ ...f, geography: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="business_model">business_model</Label>
                <Input
                  id="business_model"
                  value={form.business_model}
                  onChange={(e) => setForm((f) => ({ ...f, business_model: e.target.value }))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">description</Label>
                <Textarea
                  id="description"
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
