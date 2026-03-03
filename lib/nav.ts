import type { Role } from "./types";

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
  href: string;
  label: string;
  iconKey: IconKey;
  rolesAllowed?: Role[];
}

export const navItems: NavItem[] = [
  { href: "/dashboard", label: "Overview", iconKey: "layout-dashboard" },
  { href: "/dashboard/tenants", label: "Tenants", iconKey: "building-2", rolesAllowed: ["saas_admin"] },
  { href: "/dashboard/funds", label: "Funds", iconKey: "wallet", rolesAllowed: ["tenant_admin"] },
  { href: "/dashboard/proposals", label: "Proposals", iconKey: "file-text", rolesAllowed: ["tenant_admin", "assessor"] },
  { href: "/dashboard/queue", label: "My Queue", iconKey: "clipboard-list", rolesAllowed: ["assessor"] },
  { href: "/dashboard/users", label: "Users", iconKey: "users", rolesAllowed: ["saas_admin", "tenant_admin"] },
  { href: "/dashboard/subscriptions", label: "Subscriptions", iconKey: "credit-card", rolesAllowed: ["saas_admin"] },
  { href: "/dashboard/costs", label: "Costs", iconKey: "dollar-sign", rolesAllowed: ["saas_admin", "tenant_admin"] },
  { href: "/dashboard/reports", label: "Reports", iconKey: "bar-chart-3" },
];

export function getNavItemsForRole(role: Role): NavItem[] {
  return navItems.filter((item) => {
    if (!item.rolesAllowed) return true;
    return item.rolesAllowed.includes(role);
  });
}

export function getPageTitle(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}
