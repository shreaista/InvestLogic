"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import type { SidebarNav } from "@/lib/nav";
import { getPageTitleFromSidebar } from "@/lib/nav";
import { Topbar, type UserInfo } from "./Topbar";
import { Sidebar, MobileSidebar } from "./Sidebar";
import { RoleProvider } from "./RoleContext";

interface AppShellProps {
  user: UserInfo;
  sidebarNav: SidebarNav;
  activeTenantId: string | null;
  children: React.ReactNode;
}

export function AppShell({ user, sidebarNav, activeTenantId, children }: AppShellProps) {
  const pathname = usePathname();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const pageTitle = getPageTitleFromSidebar(pathname, sidebarNav);
  const isReadOnly = user.isReadOnly ?? false;

  return (
    <RoleProvider role={user.role} isReadOnly={isReadOnly}>
      <div className="min-h-screen bg-ipa-canvas">
        <Topbar
          user={user}
          pageTitle={pageTitle}
          activeTenantId={activeTenantId}
          onMenuClick={() => setMobileMenuOpen(true)}
        />

        <div className="flex">
          <Sidebar
            sidebarNav={sidebarNav}
            collapsed={sidebarCollapsed}
            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
          />

          <MobileSidebar
            sidebarNav={sidebarNav}
            open={mobileMenuOpen}
            onClose={() => setMobileMenuOpen(false)}
          />

          <main className="min-h-[calc(100vh-3.5rem)] flex-1 bg-ipa-canvas">
            <div className="mx-auto max-w-6xl px-4 py-6 sm:px-6 sm:py-6 lg:px-8 lg:py-7">{children}</div>
          </main>
        </div>
      </div>
    </RoleProvider>
  );
}
