"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, ChevronDown, Globe, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface Tenant {
  id: string;
  name: string;
}

interface TenantSwitcherProps {
  activeTenantId: string | null;
  role: string;
}

export function TenantSwitcher({ activeTenantId, role }: TenantSwitcherProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [tenantsLoading, setTenantsLoading] = useState(true);

  const isSaasAdmin = role === "saas_admin";

  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch("/api/me/authz");
        const data = await res.json();
        if (data.ok && data.data.allowedTenants) {
          setTenants(data.data.allowedTenants);
        }
      } catch {
        console.error("Failed to fetch tenants");
      } finally {
        setTenantsLoading(false);
      }
    }
    fetchTenants();
  }, []);

  const currentTenant = tenants.find((t) => t.id === activeTenantId);

  async function handleSelectTenant(tenantId: string) {
    setLoading(true);
    try {
      const res = await fetch("/api/me/tenant/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });
      const data = await res.json();
      if (data.ok) {
        router.refresh();
      }
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  async function handleClearTenant() {
    setLoading(true);
    try {
      await fetch("/api/me/tenant/clear", { method: "POST" });
      router.refresh();
    } finally {
      setLoading(false);
      setOpen(false);
    }
  }

  if (tenantsLoading) {
    return (
      <div className="flex items-center gap-2 h-9 px-3 rounded-lg border bg-muted/40 text-muted-foreground text-sm">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          "flex items-center gap-2 h-9 px-3 rounded-lg border text-sm transition-colors",
          activeTenantId
            ? "bg-amber-50 border-amber-200 text-amber-800 hover:bg-amber-100 dark:bg-amber-900/20 dark:border-amber-800 dark:text-amber-200 dark:hover:bg-amber-900/30"
            : "bg-muted/40 border-border text-muted-foreground hover:bg-muted"
        )}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : activeTenantId ? (
          <Building2 className="h-4 w-4" />
        ) : (
          <Globe className="h-4 w-4" />
        )}
        <span className="max-w-[140px] truncate">
          {currentTenant?.name || (isSaasAdmin ? "Global" : "Select Tenant")}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 transition-transform",
            open && "rotate-180"
          )}
        />
      </button>

      {open && (
        <>
          <div
            className="fixed inset-0 z-40"
            onClick={() => setOpen(false)}
          />
          <div className="absolute right-0 top-full mt-2 w-56 rounded-xl border bg-card shadow-lg z-50 overflow-hidden">
            <div className="p-2 border-b">
              <p className="px-2 py-1 text-xs font-medium text-muted-foreground uppercase tracking-wide">
                {isSaasAdmin ? "View as Tenant" : "Select Tenant"}
              </p>
            </div>
            <div className="p-2 max-h-64 overflow-y-auto">
              {isSaasAdmin && (
                <>
                  <button
                    onClick={handleClearTenant}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                      !activeTenantId
                        ? "bg-primary/10 text-primary"
                        : "text-foreground hover:bg-muted"
                    )}
                  >
                    <Globe className="h-4 w-4" />
                    <span className="flex-1 text-left">Global (no tenant)</span>
                    {!activeTenantId && <Check className="h-4 w-4" />}
                  </button>
                  <div className="my-2 border-t" />
                </>
              )}

              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelectTenant(tenant.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                    activeTenantId === tenant.id
                      ? "bg-primary/10 text-primary"
                      : "text-foreground hover:bg-muted"
                  )}
                >
                  <Building2 className="h-4 w-4" />
                  <span className="flex-1 text-left truncate">{tenant.name}</span>
                  {activeTenantId === tenant.id && <Check className="h-4 w-4" />}
                </button>
              ))}

              {tenants.length === 0 && (
                <p className="px-3 py-2 text-sm text-muted-foreground">
                  No tenants available
                </p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
