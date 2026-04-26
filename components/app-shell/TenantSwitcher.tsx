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
  /** Match deep navy app header */
  darkHeader?: boolean;
}

export function TenantSwitcher({ activeTenantId, role, darkHeader }: TenantSwitcherProps) {
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
      <div
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border px-3 text-sm",
          darkHeader
            ? "border-ipa-shell-border bg-white/5 text-ipa-shell-muted"
            : "border-border bg-muted/40 text-muted-foreground"
        )}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        <span>Loading...</span>
      </div>
    );
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        disabled={loading}
        className={cn(
          "flex h-9 items-center gap-2 rounded-lg border text-sm transition-colors",
          darkHeader
            ? activeTenantId
              ? "border-ipa-primary/35 bg-ipa-primary/10 text-white hover:border-ipa-primary/45 hover:bg-ipa-primary/15"
              : "border-ipa-shell-border bg-white/5 text-ipa-shell-item hover:border-white/10 hover:bg-white/[0.06] hover:text-white"
            : activeTenantId
              ? "border-ipa-primary/25 bg-ipa-primary/10 text-ipa-primary hover:bg-ipa-primary/15"
              : "border-border bg-muted/40 text-muted-foreground hover:bg-muted"
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
