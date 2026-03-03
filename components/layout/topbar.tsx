"use client";

import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { LogOut, Briefcase } from "lucide-react";
import { SessionPayload } from "@/lib/auth";

interface TopbarProps {
  user: SessionPayload;
}

function formatRole(role: string): string {
  return role
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function Topbar({ user }: TopbarProps) {
  const router = useRouter();

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
  }

  return (
    <header className="sticky top-0 z-50 flex h-14 items-center justify-between border-b bg-background px-4 lg:px-6">
      <div className="flex items-center gap-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary">
          <Briefcase className="h-4 w-4 text-primary-foreground" />
        </div>
        <span className="text-lg font-semibold">IPA</span>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden items-center gap-2 text-sm md:flex">
          <span className="text-muted-foreground">{user.email}</span>
          <span className="rounded-md bg-secondary px-2 py-0.5 text-xs font-medium">
            {formatRole(user.role)}
          </span>
        </div>
        <ThemeToggle />
        <Button variant="ghost" size="sm" onClick={handleLogout}>
          <LogOut className="h-4 w-4 mr-2" />
          <span className="hidden sm:inline">Logout</span>
        </Button>
      </div>
    </header>
  );
}
