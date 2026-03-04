"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { API_CATALOG, type ApiEndpoint } from "@/lib/devtools/apiCatalog";

interface ApiResult {
  status: number;
  data: unknown;
}

function generateCurlCommand(endpoint: ApiEndpoint, baseUrl: string): string {
  const url = `${baseUrl}${endpoint.path}`;
  const parts: string[] = ["curl.exe"];

  if (endpoint.method !== "GET") {
    parts.push(`-X ${endpoint.method}`);
  }

  if (endpoint.auth === "requiresLogin") {
    parts.push('-H "Cookie: ipa_session=PASTE_TOKEN_HERE"');
  }

  if (endpoint.sampleBody) {
    parts.push('-H "Content-Type: application/json"');
    parts.push(`-d '${JSON.stringify(endpoint.sampleBody)}'`);
  }

  parts.push(`"${url}"`);

  return parts.join(" ");
}

function getMethodBadgeVariant(method: string): "default" | "success" | "warning" | "info" {
  switch (method) {
    case "GET":
      return "success";
    case "POST":
      return "info";
    case "PATCH":
      return "warning";
    case "DELETE":
      return "default";
    default:
      return "default";
  }
}

function CopyCurlButton({ endpoint }: { endpoint: ApiEndpoint }) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
    const curl = generateCurlCommand(endpoint, baseUrl);
    await navigator.clipboard.writeText(curl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button variant="outline" size="sm" onClick={handleCopy}>
      {copied ? "Copied!" : "Copy curl"}
    </Button>
  );
}

export default function DevtoolsClient() {
  const [authzResult, setAuthzResult] = useState<ApiResult | null>(null);
  const [createResult, setCreateResult] = useState<ApiResult | null>(null);

  const [email, setEmail] = useState("test2@x.com");
  const [name, setName] = useState("Test2");
  const [role, setRole] = useState("assessor");

  async function loadAuthz() {
    const res = await fetch("/api/me/authz");
    const data = await res.json();
    setAuthzResult({ status: res.status, data });
  }

  async function createUser() {
    const res = await fetch("/api/tenant/users", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, role }),
    });
    const data = await res.json();
    setCreateResult({ status: res.status, data });
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">RBAC Devtools</h1>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Authz Snapshot</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button onClick={loadAuthz}>Load /api/me/authz</Button>
          {authzResult && (
            <pre className="text-xs whitespace-pre-wrap rounded border bg-muted p-3">
              Status: {authzResult.status}
              {"\n\n"}
              {JSON.stringify(authzResult.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">POST /api/tenant/users</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="role">Role</Label>
              <select
                id="role"
                value={role}
                onChange={(e) => setRole(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 py-1 text-sm"
              >
                <option value="assessor">assessor</option>
                <option value="tenant_admin">tenant_admin</option>
              </select>
            </div>
          </div>
          <Button onClick={createUser}>Create user</Button>
          {createResult && (
            <pre className="text-xs whitespace-pre-wrap rounded border bg-muted p-3">
              Status: {createResult.status}
              {"\n\n"}
              {JSON.stringify(createResult.data, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API Explorer</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="rounded-lg border bg-muted/50 p-4">
            <h3 className="font-medium mb-3">How to test quickly</h3>
            <div className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground mb-1">1. Check your auth context:</p>
                <pre className="bg-background rounded border p-2 text-xs overflow-x-auto">
{`curl.exe -H "Cookie: ipa_session=PASTE_TOKEN_HERE" "${typeof window !== "undefined" ? window.location.origin : ""}/api/me/authz"`}
                </pre>
              </div>
              <div>
                <p className="text-muted-foreground mb-1">2. Login to get a session:</p>
                <pre className="bg-background rounded border p-2 text-xs overflow-x-auto">
{`curl.exe -X POST -H "Content-Type: application/json" -d '{"email":"admin@example.com","password":"password"}' "${typeof window !== "undefined" ? window.location.origin : ""}/api/auth/login"`}
                </pre>
              </div>
            </div>
          </div>

          <div className="rounded-lg border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[80px]">Method</TableHead>
                  <TableHead className="w-[250px]">Path</TableHead>
                  <TableHead className="w-[100px]">Auth</TableHead>
                  <TableHead className="w-[180px]">Role / Permission</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {API_CATALOG.map((endpoint, idx) => (
                  <TableRow key={`${endpoint.method}-${endpoint.path}-${idx}`}>
                    <TableCell>
                      <Badge variant={getMethodBadgeVariant(endpoint.method)}>
                        {endpoint.method}
                      </Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs">
                      {endpoint.path}
                    </TableCell>
                    <TableCell>
                      <Badge variant={endpoint.auth === "public" ? "outline" : "secondary"}>
                        {endpoint.auth === "public" ? "Public" : "Login"}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs">
                      <div className="space-y-1">
                        <span className="font-medium">{endpoint.requiredRole}</span>
                        {endpoint.requiredPermission && (
                          <div className="text-muted-foreground">
                            {endpoint.requiredPermission}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {endpoint.description}
                    </TableCell>
                    <TableCell>
                      <CopyCurlButton endpoint={endpoint} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
