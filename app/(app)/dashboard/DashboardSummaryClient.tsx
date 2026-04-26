"use client";

import { useCallback, useEffect, useState } from "react";
import DashboardHome from "./DashboardHome";
import type { DashboardSummaryPayload } from "@/lib/dashboard/dashboardSummaryTypes";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

type User = {
  id?: string;
  email?: string;
  name?: string;
  role?: string;
};

export default function DashboardSummaryClient({
  user,
  tenantId,
}: {
  user: User;
  tenantId: string | null;
}) {
  const [data, setData] = useState<DashboardSummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!tenantId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/dashboard/summary", { credentials: "include" });
      const json = (await res.json()) as { ok?: boolean; data?: DashboardSummaryPayload; error?: string };
      if (!res.ok || !json.ok || !json.data) {
        setError(json.error ?? `Unable to load dashboard (${res.status})`);
        setData(null);
        return;
      }
      setData(json.data);
    } catch {
      setError("Network error loading dashboard");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [tenantId]);

  useEffect(() => {
    if (!tenantId) {
      setLoading(false);
      setData(null);
      setError(null);
      return;
    }
    void load();
  }, [tenantId, load]);

  const role = user.role || "assessor";

  if (!tenantId && role === "saas_admin") {
    return <DashboardHome user={user} tenantId={tenantId} snapshot={null} />;
  }

  if (!tenantId) {
    return null;
  }

  if (loading && !data) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-4 rounded-2xl border border-slate-200/80 bg-white p-12 shadow-sm">
        <Loader2 className="h-8 w-8 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium text-slate-600">Loading workspace metrics…</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-2xl border border-amber-200/80 bg-amber-50/50 p-6 text-sm text-amber-950">
        <p className="font-medium">{error ?? "Dashboard data unavailable"}</p>
        <Button variant="outline" size="sm" className="mt-4" onClick={() => void load()}>
          Retry
        </Button>
      </div>
    );
  }

  return <DashboardHome user={user} tenantId={tenantId} snapshot={data} />;
}
