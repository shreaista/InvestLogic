"use client";

import { useState } from "react";
import { PageHeader, StatCard, StatusBadge } from "@/components/app";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Cpu,
  Zap,
  Database,
  Settings,
  CheckCircle,
  AlertTriangle,
  Gauge,
  Shield,
  Clock,
  Sparkles,
} from "lucide-react";

const providers = [
  {
    name: "OpenAI",
    status: "Active",
    models: ["GPT-4 Turbo", "GPT-3.5 Turbo"],
    usage: 78,
    usedTokens: "780K",
    limit: "1M tokens/day",
    rateLimit: 3500,
    latency: "1.2s",
    uptime: "99.9%",
  },
  {
    name: "Anthropic",
    status: "Active",
    models: ["Claude 3 Opus", "Claude 3 Sonnet"],
    usage: 45,
    usedTokens: "225K",
    limit: "500K tokens/day",
    rateLimit: 2000,
    latency: "1.4s",
    uptime: "99.7%",
  },
  {
    name: "Azure OpenAI",
    status: "Pending",
    models: ["GPT-4", "Embeddings"],
    usage: 0,
    usedTokens: "0",
    limit: "Unlimited",
    rateLimit: 5000,
    latency: "-",
    uptime: "-",
  },
];

const entitlements = [
  { name: "Max Tenants", current: 24, limit: 50, icon: Shield },
  { name: "Max Users / Tenant", current: 78, limit: 100, icon: Cpu },
  { name: "Storage", current: 45, limit: 100, unit: "GB", icon: Database },
  { name: "API Calls / Month", current: 1.2, limit: 5, unit: "M", icon: Zap },
];

export default function SubscriptionsClient() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Subscriptions"
        subtitle="Manage provider limits and entitlements"
        actions={
          <Button>
            <Sparkles className="h-4 w-4 mr-2" />
            Add Provider
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard
          title="Active Providers"
          value="2"
          description="of 3 configured"
          icon={Cpu}
        />
        <StatCard
          title="Daily Tokens Used"
          value="824K"
          description="32% of total limit"
          trend="neutral"
          icon={Zap}
        />
        <StatCard
          title="Avg Response Time"
          value="1.2s"
          description="-0.3s from last week"
          trend="up"
          icon={Clock}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Plan Entitlements</CardTitle>
          <CardDescription>Your current plan limits and usage</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {entitlements.map((item) => {
              const Icon = item.icon;
              const percentage = (item.current / item.limit) * 100;
              const isHigh = percentage > 80;
              return (
                <div key={item.name} className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                      <Icon className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <span className="text-sm font-medium">{item.name}</span>
                  </div>
                  <div>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-2xl font-semibold tabular-nums">
                        {item.current}
                      </span>
                      <span className="text-sm text-muted-foreground">
                        / {item.limit}{item.unit || ""}
                      </span>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          isHigh ? "bg-amber-500" : "bg-primary"
                        }`}
                        style={{ width: `${Math.min(percentage, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {providers.map((provider) => (
          <ProviderCard key={provider.name} provider={provider} />
        ))}
      </div>
    </div>
  );
}

interface Provider {
  name: string;
  status: string;
  models: string[];
  usage: number;
  usedTokens: string;
  limit: string;
  rateLimit: number;
  latency: string;
  uptime: string;
}

function ProviderCard({ provider }: { provider: Provider }) {
  const [rateLimit, setRateLimit] = useState(provider.rateLimit);
  const isActive = provider.status === "Active";

  return (
    <Card className="group">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-primary/10">
              <Cpu className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle className="text-base">{provider.name}</CardTitle>
              <CardDescription className="text-xs">
                {provider.models.join(" • ")}
              </CardDescription>
            </div>
          </div>
          <StatusBadge
            variant={isActive ? "success" : "warning"}
            icon={isActive ? CheckCircle : AlertTriangle}
          >
            {provider.status}
          </StatusBadge>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-muted-foreground">Daily Usage</span>
            <span className="font-medium tabular-nums">
              {provider.usedTokens} / {provider.limit}
            </span>
          </div>
          <div className="h-2.5 bg-muted rounded-full overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                provider.usage > 80
                  ? "bg-destructive"
                  : provider.usage > 50
                  ? "bg-warning"
                  : "bg-success"
              }`}
              style={{ width: `${provider.usage}%` }}
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {provider.usage}% of daily limit used
          </p>
        </div>

        <Separator />

        <div>
          <div className="flex items-center justify-between text-sm mb-3">
            <div className="flex items-center gap-2">
              <Gauge className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Rate Limit</span>
            </div>
            <Badge variant="outline" className="tabular-nums">
              {rateLimit.toLocaleString()} req/min
            </Badge>
          </div>
          <input
            type="range"
            min={500}
            max={10000}
            step={100}
            value={rateLimit}
            onChange={(e) => setRateLimit(Number(e.target.value))}
            disabled={!isActive}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary disabled:opacity-50 disabled:cursor-not-allowed"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1.5">
            <span>500</span>
            <span>10,000</span>
          </div>
        </div>

        <Separator />

        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-xs text-muted-foreground mb-1">Avg Latency</p>
            <p className="text-sm font-medium">{provider.latency}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-1">Uptime</p>
            <p className="text-sm font-medium">{provider.uptime}</p>
          </div>
        </div>

        <Button variant="outline" className="w-full" size="sm" disabled={!isActive}>
          <Settings className="h-4 w-4 mr-2" />
          Configure
        </Button>
      </CardContent>
    </Card>
  );
}
