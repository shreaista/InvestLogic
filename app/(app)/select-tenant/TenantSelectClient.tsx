"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Building2, Loader2, Briefcase } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

interface Tenant {
  id: string;
  name: string;
}

export default function TenantSelectClient() {
  const router = useRouter();
  const [tenants, setTenants] = useState<Tenant[]>([]);
  const [loading, setLoading] = useState(true);
  const [selecting, setSelecting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchTenants() {
      try {
        const res = await fetch("/api/me/authz");
        const data = await res.json();
        if (data.ok && data.data.allowedTenants) {
          setTenants(data.data.allowedTenants);
        } else {
          setError("Failed to load tenants");
        }
      } catch {
        setError("Network error loading tenants");
      } finally {
        setLoading(false);
      }
    }
    fetchTenants();
  }, []);

  async function handleSelect(tenantId: string) {
    setSelecting(tenantId);
    setError(null);

    try {
      const res = await fetch("/api/me/tenant/select", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tenantId }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.error || "Failed to select tenant");
        setSelecting(null);
      }
    } catch {
      setError("Network error");
      setSelecting(null);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary">
            <Briefcase className="h-6 w-6 text-primary-foreground" />
          </div>
          <CardTitle className="text-xl">Select a Tenant</CardTitle>
          <CardDescription>
            Choose the organization you want to work with
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
              <p className="mt-2 text-sm text-muted-foreground">Loading tenants...</p>
            </div>
          ) : error ? (
            <div className="rounded-lg bg-destructive/10 p-4 text-center">
              <p className="text-sm text-destructive">{error}</p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3"
                onClick={() => window.location.reload()}
              >
                Retry
              </Button>
            </div>
          ) : tenants.length === 0 ? (
            <div className="rounded-lg bg-muted p-4 text-center">
              <p className="text-sm text-muted-foreground">
                No tenants available. Please contact your administrator.
              </p>
            </div>
          ) : (
            <div className="space-y-2">
              {tenants.map((tenant) => (
                <button
                  key={tenant.id}
                  onClick={() => handleSelect(tenant.id)}
                  disabled={selecting !== null}
                  className="flex w-full items-center gap-3 rounded-lg border p-4 text-left transition-colors hover:bg-muted disabled:opacity-50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                    <Building2 className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <p className="font-medium">{tenant.name}</p>
                    <p className="text-xs text-muted-foreground">{tenant.id}</p>
                  </div>
                  {selecting === tenant.id && (
                    <Loader2 className="h-5 w-5 animate-spin text-primary" />
                  )}
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
