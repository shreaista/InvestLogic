"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import type { IconKey, SidebarNav } from "@/lib/nav";
import { isSidebarLinkActive } from "@/lib/nav";
import {
  LayoutDashboard,
  Building2,
  Users,
  CreditCard,
  DollarSign,
  BarChart3,
  Wallet,
  FileText,
  ClipboardList,
  Settings,
  ScrollText,
  Briefcase,
  PanelLeftClose,
  PanelLeft,
  X,
  ListChecks,
  Target,
  MessageSquare,
  History,
  Sparkles,
  Scale,
  type LucideIcon,
} from "lucide-react";

const iconMap: Record<IconKey, LucideIcon> = {
  "layout-dashboard": LayoutDashboard,
  "building-2": Building2,
  users: Users,
  "credit-card": CreditCard,
  "dollar-sign": DollarSign,
  "bar-chart-3": BarChart3,
  wallet: Wallet,
  "file-text": FileText,
  "clipboard-list": ClipboardList,
  settings: Settings,
  "scroll-text": ScrollText,
  "list-checks": ListChecks,
  target: Target,
  "message-square": MessageSquare,
  history: History,
  sparkles: Sparkles,
  scale: Scale,
};

interface SidebarProps {
  sidebarNav: SidebarNav;
  collapsed: boolean;
  onToggle: () => void;
}

function NavLinkRow({
  href,
  label,
  iconKey,
  exact,
  collapsed,
  pathname,
}: {
  href: string;
  label: string;
  iconKey: IconKey;
  exact?: boolean;
  collapsed: boolean;
  pathname: string;
}) {
  const Icon = iconMap[iconKey];
  const isActive = isSidebarLinkActive(pathname, href, exact);

  return (
    <Link
      href={href}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all duration-200",
        collapsed && "mx-auto h-10 w-10 justify-center px-0",
        isActive
          ? "bg-ipa-primary/15 text-white shadow-sm"
          : "text-ipa-shell-item hover:bg-white/[0.06] hover:text-white"
      )}
      title={collapsed ? label : undefined}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ipa-primary"
          aria-hidden
        />
      )}
      <Icon
        className={cn(
          "h-[18px] w-[18px] shrink-0 transition-colors duration-200",
          isActive ? "text-white" : "text-ipa-shell-item group-hover:text-white"
        )}
      />
      {!collapsed && <span className="truncate">{label}</span>}
    </Link>
  );
}

/** Desktop nav — deep navy shell; sections, groups, and nested links */
export function Sidebar({ sidebarNav, collapsed, onToggle }: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "sticky top-14 z-20 hidden h-[calc(100vh-3.5rem)] flex-col border-r border-ipa-shell-border bg-ipa-shell transition-all duration-200 ease-out lg:flex",
        collapsed ? "w-[68px]" : "w-[240px]"
      )}
    >
      <div className="flex-1 overflow-y-auto py-3">
        <nav className="flex flex-col px-2.5">
          {sidebarNav.map((section, sIdx) => (
            <div key={section.id} className={cn(sIdx > 0 && "mt-6")}>
              {!collapsed && (
                <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ipa-shell-muted">
                  {section.label}
                </p>
              )}
              <div className="flex flex-col gap-4">
                {section.groups.map((group) => (
                  <div key={group.key}>
                    {!collapsed && group.label ? (
                      <p className="mb-1.5 px-3 text-xs font-medium text-ipa-shell-muted">{group.label}</p>
                    ) : null}
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((link) => (
                        <NavLinkRow
                          key={link.key}
                          href={link.href}
                          label={link.label}
                          iconKey={link.iconKey}
                          exact={link.exact}
                          collapsed={collapsed}
                          pathname={pathname}
                        />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </div>

      <div className="border-t border-ipa-shell-border p-2.5">
        <button
          type="button"
          onClick={onToggle}
          className={cn(
            "flex w-full items-center justify-center rounded-lg p-2 text-ipa-shell-muted transition-all duration-200 hover:bg-white/[0.06] hover:text-white",
            !collapsed && "justify-start gap-2 px-3"
          )}
        >
          {collapsed ? (
            <PanelLeft className="h-4 w-4" />
          ) : (
            <>
              <PanelLeftClose className="h-4 w-4" />
              <span className="text-xs font-medium">Collapse</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

interface MobileSidebarProps {
  sidebarNav: SidebarNav;
  open: boolean;
  onClose: () => void;
}

export function MobileSidebar({ sidebarNav, open, onClose }: MobileSidebarProps) {
  const pathname = usePathname();

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-40 bg-black/40 backdrop-blur-sm lg:hidden"
        onClick={onClose}
        aria-hidden
      />

      <aside className="fixed inset-y-0 left-0 z-50 w-[280px] animate-in slide-in-from-left-full border-r border-ipa-shell-border bg-ipa-shell shadow-2xl duration-200 lg:hidden">
        <div className="flex h-14 items-center justify-between border-b border-ipa-shell-border px-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-ipa-primary">
              <Briefcase className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-white">InvestLogic</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-ipa-shell-muted transition-colors hover:bg-white/[0.06] hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <nav className="flex max-h-[calc(100vh-3.5rem)] flex-col overflow-y-auto p-3">
          {sidebarNav.map((section, sIdx) => (
            <div key={section.id} className={cn(sIdx > 0 && "mt-6")}>
              <p className="mb-2 px-3 text-[10px] font-semibold uppercase tracking-wider text-ipa-shell-muted">
                {section.label}
              </p>
              <div className="flex flex-col gap-4">
                {section.groups.map((group) => (
                  <div key={group.key}>
                    {group.label ? (
                      <p className="mb-1.5 px-3 text-xs font-medium text-ipa-shell-muted">{group.label}</p>
                    ) : null}
                    <div className="flex flex-col gap-0.5">
                      {group.items.map((link) => {
                        const Icon = iconMap[link.iconKey];
                        const isActive = isSidebarLinkActive(pathname, link.href, link.exact);
                        return (
                          <Link
                            key={link.key}
                            href={link.href}
                            onClick={onClose}
                            className={cn(
                              "group relative flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all duration-200",
                              isActive
                                ? "bg-ipa-primary/15 text-white"
                                : "text-ipa-shell-item hover:bg-white/[0.06] hover:text-white"
                            )}
                          >
                            {isActive && (
                              <span
                                className="absolute left-0 top-1/2 h-5 w-[3px] -translate-y-1/2 rounded-r-full bg-ipa-primary"
                                aria-hidden
                              />
                            )}
                            <Icon
                              className={cn(
                                "h-[18px] w-[18px] shrink-0 transition-colors",
                                isActive ? "text-white" : "text-ipa-shell-item group-hover:text-white"
                              )}
                            />
                            <span>{link.label}</span>
                          </Link>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </nav>
      </aside>
    </>
  );
}
