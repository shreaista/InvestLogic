// ─────────────────────────────────────────────────────────────────────────────
// Navigation Configuration (Serializable - no React components)
// ─────────────────────────────────────────────────────────────────────────────

export type IconKey =
  | "layout-dashboard"
  | "building-2"
  | "users"
  | "credit-card"
  | "dollar-sign"
  | "bar-chart-3"
  | "wallet"
  | "file-text"
  | "clipboard-list"
  | "settings";

export interface NavItem {
  label: string;
  href: string;
  iconKey: IconKey;
  permission?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation by Role
// ─────────────────────────────────────────────────────────────────────────────

export const NAV_BY_ROLE: Record<string, NavItem[]> = {
  saas_admin: [
    { label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
    { label: "Tenants", href: "/dashboard/tenants", iconKey: "building-2", permission: "tenant:manage" },
    { label: "Users", href: "/dashboard/users", iconKey: "users", permission: "user:read" },
    { label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card" },
    { label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permission: "tenant:costs:read" },
    { label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
  tenant_admin: [
    { label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
    { label: "Funds", href: "/dashboard/funds", iconKey: "wallet" },
    { label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
    { label: "Users", href: "/dashboard/users", iconKey: "users", permission: "user:read" },
    { label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permission: "tenant:costs:read" },
    { label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
  assessor: [
    { label: "Overview", href: "/dashboard", iconKey: "layout-dashboard" },
    { label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
    { label: "My Queue", href: "/dashboard/queue", iconKey: "clipboard-list" },
    { label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getNavItemsForRole(role: string): NavItem[] {
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.assessor;
}

export function filterNavByPermissions(items: NavItem[], permissions: string[]): NavItem[] {
  return items.filter((item) => {
    if (!item.permission) return true;
    return permissions.includes(item.permission);
  });
}

export function getPageTitle(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}
