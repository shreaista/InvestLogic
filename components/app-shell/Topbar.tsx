"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { Badge } from "@/components/ui/badge";
import {
  Menu,
  Search,
  LogOut,
  Briefcase,
  ChevronDown,
  User,
  Settings,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { TenantSwitcher } from "./TenantSwitcher";

export interface UserInfo {
  name: string;
  email: string;
  role: string;
  isReadOnly?: boolean;
}

interface TopbarProps {
  user: UserInfo;
  pageTitle: string;
  activeTenantId: string | null;
  onMenuClick: () => void;
}

const ROLE_LABELS: Record<string, string> = {
  saas_admin: "SaaS Admin",
  tenant_admin: "Tenant Admin",
  fund_manager: "Fund Manager",
  assessor: "Assessor",
  viewer: "Viewer",
};

function formatRole(role: string): string {
  return ROLE_LABELS[role] ?? role.split("_").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
}

export function Topbar({ user, pageTitle, activeTenantId, onMenuClick }: TopbarProps) {
  const router = useRouter();
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  const showTenantSwitcher =
    user.role === "saas_admin" ||
    user.role === "tenant_admin" ||
    user.role === "fund_manager" ||
    user.role === "assessor" ||
    user.role === "viewer";

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-ipa-shell-border bg-ipa-shell px-4 text-white backdrop-blur-sm lg:px-6">
      <button
        onClick={onMenuClick}
        className="lg:hidden -ml-2 rounded-lg p-2 text-ipa-shell-muted transition-colors hover:bg-white/[0.06] hover:text-white"
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Toggle menu</span>
      </button>

      <div className="flex items-center gap-3">
        <div className="hidden lg:flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ipa-primary">
            <Briefcase className="h-4 w-4 text-white" />
          </div>
          <span className="font-semibold text-white">InvestLogic</span>
        </div>
        <span className="hidden sm:block text-lg font-light text-ipa-shell-muted">/</span>
        <span className="hidden sm:block text-sm font-medium text-ipa-shell-item">{pageTitle}</span>
      </div>

      <div className="flex-1" />

      {showTenantSwitcher && (
        <TenantSwitcher activeTenantId={activeTenantId} role={user.role} darkHeader />
      )}

      <div className="hidden md:flex items-center">
        <button
          type="button"
          className="flex h-9 min-w-[200px] items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-ipa-shell-item transition-colors hover:border-white/15 hover:bg-white/10 hover:text-white"
        >
          <Search className="h-4 w-4 shrink-0 text-ipa-shell-muted" />
          <span className="flex-1 text-left text-ipa-shell-muted">Search...</span>
          <kbd className="pointer-events-none hidden lg:inline-flex h-5 items-center gap-1 rounded border border-white/10 bg-ipa-shell px-1.5 font-mono text-[10px] font-medium text-ipa-shell-muted">
            ⌘K
          </kbd>
        </button>
      </div>

      <div className="flex items-center gap-1">
        <button
          type="button"
          className="md:hidden rounded-lg p-2 text-ipa-shell-muted transition-colors hover:bg-white/[0.06] hover:text-white"
        >
          <Search className="h-5 w-5" />
        </button>

        <ThemeToggle className="text-ipa-shell-muted hover:bg-white/[0.06] hover:text-white" />

        <div className="relative ml-1">
          <button
            type="button"
            onClick={() => setUserMenuOpen(!userMenuOpen)}
            className="flex items-center gap-2 rounded-lg p-1.5 pr-2 transition-colors hover:bg-white/[0.06]"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ipa-primary/20 text-ipa-primary">
              <User className="h-4 w-4" />
            </div>
            <div className="hidden lg:block text-left">
              <p className="text-sm font-medium leading-none text-white">{user.name}</p>
              <p className="mt-0.5 text-[11px] text-ipa-shell-muted">
                {formatRole(user.role)}
              </p>
            </div>
            <ChevronDown
              className={cn(
                "hidden lg:block h-4 w-4 text-ipa-shell-muted transition-transform",
                userMenuOpen && "rotate-180"
              )}
            />
          </button>

          {userMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setUserMenuOpen(false)}
              />
              <div className="absolute right-0 top-full z-50 mt-2 w-64 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-lg">
                <div className="border-b border-slate-100 bg-slate-50/80 p-4">
                  <div className="flex items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-ipa-primary/10 text-ipa-primary">
                      <User className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{user.name}</p>
                      <p className="truncate text-xs text-slate-500">{user.email}</p>
                    </div>
                  </div>
                  <Badge variant="secondary" className="mt-3">
                    {formatRole(user.role)}
                  </Badge>
                </div>

                <div className="p-2">
                  <button
                    type="button"
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <Settings className="h-4 w-4" />
                    Settings
                  </button>
                  <button
                    type="button"
                    onClick={handleLogout}
                    className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign out
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
