"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Building2,
  DollarSign,
  CreditCard,
  Wallet,
  FileText,
  Users,
  ClipboardList,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  icon?: LucideIcon;
}

interface SidebarNavProps {
  items: NavItem[];
}

const iconMap: Record<string, LucideIcon> = {
  "/dashboard": LayoutDashboard,
  "/dashboard/tenants": Building2,
  "/dashboard/costs": DollarSign,
  "/dashboard/subscriptions": CreditCard,
  "/dashboard/funds": Wallet,
  "/dashboard/proposals": FileText,
  "/dashboard/users": Users,
  "/dashboard/reports": BarChart3,
};

export function SidebarNav({ items }: SidebarNavProps) {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 p-2">
      {items.map((item) => {
        const Icon = item.icon || iconMap[item.href] || ClipboardList;
        const isActive = pathname === item.href;

        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
              isActive
                ? "bg-sidebar-accent text-foreground"
                : "text-muted-foreground hover:bg-sidebar-accent hover:text-foreground"
            )}
          >
            <Icon className="h-4 w-4 shrink-0" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
