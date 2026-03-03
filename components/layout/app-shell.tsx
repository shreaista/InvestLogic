import { SessionPayload } from "@/lib/auth";
import { Topbar } from "./topbar";
import { SidebarNav, NavItem } from "./sidebar-nav";

interface AppShellProps {
  user: SessionPayload;
  navItems: NavItem[];
  children: React.ReactNode;
}

export function AppShell({ user, navItems, children }: AppShellProps) {
  return (
    <div className="min-h-screen bg-background">
      <Topbar user={user} />
      <div className="flex">
        <aside className="sticky top-14 hidden h-[calc(100vh-3.5rem)] w-56 shrink-0 border-r bg-sidebar lg:block">
          <SidebarNav items={navItems} />
        </aside>
        <main className="flex-1 overflow-auto">
          <div className="container max-w-6xl py-6 px-4 lg:px-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
