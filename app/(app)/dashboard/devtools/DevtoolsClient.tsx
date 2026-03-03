"use client";

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PageHeader } from "@/components/app";
import { AlertCircle, CheckCircle2, Loader2 } from "lucide-react";

interface ApiResult {
  status: number;
  data: unknown;
  error?: string;
}

function ResultDisplay({ result, loading }: { result: ApiResult | null; loading: boolean }) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" />
        Loading...
      </div>
    );
  }

  if (!result) {
    return <p className="text-sm text-muted-foreground">No result yet</p>;
  }

  const isSuccess = result.status >= 200 && result.status < 300;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {isSuccess ? (
          <CheckCircle2 className="h-4 w-4 text-green-600" />
        ) : (
          <AlertCircle className="h-4 w-4 text-red-600" />
        )}
        <span className={`text-sm font-medium ${isSuccess ? "text-green-600" : "text-red-600"}`}>
          Status: {result.status}
        </span>
      </div>
      <pre className="rounded-md border bg-muted/50 p-3 text-xs overflow-auto max-h-64">
        {JSON.stringify(result.data, null, 2)}
      </pre>
    </div>
  );
}

export default function DevtoolsClient() {
  const [authzResult, setAuthzResult] = useState<ApiResult | null>(null);
  const [authzLoading, setAuthzLoading] = useState(false);

  const [createUserResult, setCreateUserResult] = useState<ApiResult | null>(null);
  const [createUserLoading, setCreateUserLoading] = useState(false);
  const [email, setEmail] = useState("test2@x.com");
  const [name, setName] = useState("Test2");
  const [role, setRole] = useState<"assessor" | "tenant_admin">("assessor");

  async function loadAuthz() {
    setAuthzLoading(true);
    setAuthzResult(null);
    try {
      const res = await fetch("/api/me/authz");
      const data = await res.json();
      setAuthzResult({ status: res.status, data });
    } catch (err) {
      setAuthzResult({ status: 0, data: null, error: String(err) });
    } finally {
      setAuthzLoading(false);
    }
  }

  async function createUser() {
    setCreateUserLoading(true);
    setCreateUserResult(null);
    try {
      const res = await fetch("/api/tenant/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, name, role }),
      });
      const data = await res.json();
      setCreateUserResult({ status: res.status, data });
    } catch (err) {
      setCreateUserResult({ status: 0, data: null, error: String(err) });
    } finally {
      setCreateUserLoading(false);
    }
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="RBAC Devtools"
        subtitle="Internal testing page for RBAC and entitlement enforcement"
      />

      <div className="grid gap-6 md:grid-cols-2">
        {/* Section A: Authz Snapshot */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Authz Snapshot</CardTitle>
            <CardDescription>
              Load your current authorization context from the server
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button onClick={loadAuthz} disabled={authzLoading}>
              {authzLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Load /api/me/authz
            </Button>
            <ResultDisplay result={authzResult} loading={authzLoading} />
          </CardContent>
        </Card>

        {/* Section B: Create User Test */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Create User Test</CardTitle>
            <CardDescription>
              Test the POST /api/tenant/users endpoint with RBAC enforcement
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="test2@x.com"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Test2"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <select
                  id="role"
                  value={role}
                  onChange={(e) => setRole(e.target.value as "assessor" | "tenant_admin")}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="assessor">assessor</option>
                  <option value="tenant_admin">tenant_admin</option>
                </select>
              </div>
            </div>

            <Button onClick={createUser} disabled={createUserLoading}>
              {createUserLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              POST /api/tenant/users
            </Button>

            <ResultDisplay result={createUserResult} loading={createUserLoading} />
          </CardContent>
        </Card>
      </div>

      <Card className="border-yellow-200 bg-yellow-50 dark:border-yellow-900 dark:bg-yellow-950">
        <CardContent className="pt-6">
          <p className="text-sm text-yellow-800 dark:text-yellow-200">
            <strong>Note:</strong> This page is for internal testing only and is not linked in the navigation.
            Access it directly at <code className="rounded bg-yellow-100 px-1 dark:bg-yellow-900">/dashboard/devtools</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
