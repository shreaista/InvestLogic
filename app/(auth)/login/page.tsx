"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Briefcase,
  Loader2,
  AlertCircle,
  Shield,
  BarChart3,
  Users,
  Zap,
  Mail,
  Lock,
  ShieldCheck,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    console.log("LOGIN CLICKED", email, password);
    setError("");
    setLoading(true);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await res.json();

      if (data.ok) {
        router.push("/dashboard");
      } else {
        setError(data.error || "Sign-in failed. Please check your email and password.");
      }
    } catch {
      setError("Unable to connect. Please check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex">
      {/* Background */}
      <div className="fixed inset-0 -z-10 bg-background">
        <svg className="absolute inset-0 h-full w-full stroke-muted-foreground/10 [mask-image:radial-gradient(100%_100%_at_top_right,white,transparent)]">
          <defs>
            <pattern id="grid" width="40" height="40" patternUnits="userSpaceOnUse">
              <path d="M.5 40V.5H40" fill="none" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" strokeWidth="0" fill="url(#grid)" />
        </svg>
      </div>

      {/* Left Panel - Brand */}
      <div className="relative hidden overflow-hidden bg-nav lg:flex lg:w-1/2 xl:w-[55%]">
        <div className="relative z-10 flex flex-col justify-center px-12 xl:px-20 text-nav-foreground">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm border border-white/10">
              <Briefcase className="h-5 w-5" />
            </div>
            <span className="text-xl font-semibold tracking-tight">InvestLogic</span>
          </div>

          {/* Headline */}
          <h1 className="text-4xl xl:text-5xl font-bold leading-[1.1] tracking-tight mb-4">
            InvestLogic
            <br />
            <span className="text-nav-muted">Proposals, diligence, and reporting</span>
          </h1>

          <p className="mb-12 max-w-md text-lg leading-relaxed text-nav-muted">
            Enterprise-grade solution for managing funding proposals, assessments, and portfolio analytics.
          </p>

          {/* Features */}
          <div className="space-y-4 mb-12">
            <FeatureItem icon={Shield} text="Role-based access control" />
            <FeatureItem icon={BarChart3} text="Real-time analytics dashboard" />
            <FeatureItem icon={Users} text="Multi-tenant architecture" />
            <FeatureItem icon={Zap} text="Automated assessment workflows" />
          </div>

          {/* Security callout */}
          <div className="flex items-center gap-3 px-4 py-3 rounded-xl bg-white/5 border border-white/10 max-w-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-success" />
            <p className="text-sm text-nav-muted">
              <span className="font-medium text-nav-foreground">Enterprise Security.</span>{" "}
              SOC 2 compliant with end-to-end encryption.
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Login */}
      <div className="flex-1 flex flex-col">
        <div className="flex-1 flex items-center justify-center p-6 sm:p-12">
          <div className="w-full max-w-sm">
            {/* Mobile logo */}
            <div className="flex items-center justify-center gap-2.5 mb-10 lg:hidden">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary">
                <Briefcase className="h-4 w-4 text-primary-foreground" />
              </div>
              <span className="text-lg font-semibold">InvestLogic</span>
            </div>

            {/* Login Card */}
            <Card className="border-border/80">
              <CardContent className="p-6 sm:p-8">
                <div className="mb-6">
                  <h2 className="text-xl font-semibold tracking-tight">
                    Welcome back
                  </h2>
                  <p className="text-sm text-muted-foreground mt-1">
                    Sign in to your account to continue
                  </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Email */}
                  <div className="space-y-2">
                    <label htmlFor="email" className="text-sm font-medium">
                      Email
                    </label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="email"
                        type="email"
                        placeholder="name@company.com"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        autoComplete="email"
                        className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div className="space-y-2">
                    <label htmlFor="password" className="text-sm font-medium">
                      Password
                    </label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                      <input
                        id="password"
                        type="password"
                        placeholder="••••••••"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        required
                        autoComplete="current-password"
                        className="flex h-11 w-full rounded-lg border border-input bg-background pl-10 pr-3 py-2 text-sm transition-all duration-150 placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1 focus-visible:border-transparent"
                      />
                    </div>
                  </div>

                  {/* Error */}
                  {error && (
                    <Alert variant="destructive" className="py-3">
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription className="ml-2">{error}</AlertDescription>
                    </Alert>
                  )}

                  {/* Submit */}
                  <Button
                    type="submit"
                    className="w-full h-11 font-medium"
                    disabled={loading}
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Signing in...
                      </>
                    ) : (
                      "Sign in"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>

            {/* Footer */}
            <p className="mt-8 text-center text-xs text-muted-foreground">
              © ShreAIsta — InvestLogic
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function FeatureItem({ icon: Icon, text }: { icon: React.ElementType; text: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/15">
        <Icon className="h-4 w-4 text-primary" />
      </div>
      <span className="text-sm text-nav-muted">{text}</span>
    </div>
  );
}
