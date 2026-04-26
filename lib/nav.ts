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
  | "settings"
  | "scroll-text"
  | "list-checks"
  | "target"
  | "message-square"
  | "history"
  | "sparkles"
  | "scale";

/** Grouped sidebar (sections → groups → links) */
export interface SidebarLink {
  key: string;
  label: string;
  href: string;
  iconKey: IconKey;
  permissionKey?: string;
  roles?: string[];
  /** If true, only exact pathname match counts as active */
  exact?: boolean;
}

export interface SidebarGroup {
  key: string;
  label: string;
  items: SidebarLink[];
}

export interface SidebarSection {
  id: string;
  label: string;
  groups: SidebarGroup[];
}

export type SidebarNav = SidebarSection[];

export interface NavItem {
  key: string;
  label: string;
  href: string;
  iconKey: IconKey;
  permissionKey?: string;
  roles?: string[];
}

// ─────────────────────────────────────────────────────────────────────────────
// Navigation by Role
// ─────────────────────────────────────────────────────────────────────────────

// SaaS Admin in global mode (no tenant selected)
const SAAS_ADMIN_GLOBAL: NavItem[] = [
  { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
  { key: "tenants", label: "Tenants", href: "/dashboard/tenants", iconKey: "building-2", permissionKey: "tenant:read", roles: ["saas_admin"] },
  { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
  { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
  { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
];

// SaaS Admin viewing as a tenant
const SAAS_ADMIN_TENANT: NavItem[] = [
  { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
  { key: "tenants", label: "Tenants", href: "/dashboard/tenants", iconKey: "building-2", permissionKey: "tenant:read", roles: ["saas_admin"] },
  { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
  { key: "fund-manager", label: "Fund Manager", href: "/dashboard/fund-manager", iconKey: "target", permissionKey: "proposal:read", roles: ["tenant_admin", "saas_admin"] },
  { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: "proposal:read" },
  { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  { key: "audit", label: "Audit Log", href: "/dashboard/audit", iconKey: "history", roles: ["tenant_admin", "saas_admin"] },
  { key: "mandates", label: "Mandate Templates", href: "/dashboard/funds/mandates", iconKey: "scroll-text", permissionKey: "fund:mandate:read", roles: ["tenant_admin", "saas_admin"] },
  { key: "prompts", label: "Prompt Management", href: "/dashboard/prompts", iconKey: "message-square", roles: ["tenant_admin", "saas_admin"] },
  { key: "queues", label: "Queues (Advanced)", href: "/dashboard/queues", iconKey: "list-checks", permissionKey: "queue:manage", roles: ["tenant_admin", "saas_admin"] },
  { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: "user:read" },
  { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
  { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
];

export const NAV_BY_ROLE: Record<string, NavItem[]> = {
  saas_admin: SAAS_ADMIN_GLOBAL,
  saas_admin_tenant: SAAS_ADMIN_TENANT,
  tenant_admin: [
    { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
    { key: "fund-manager", label: "Fund Manager", href: "/dashboard/fund-manager", iconKey: "target", permissionKey: "proposal:read", roles: ["tenant_admin", "saas_admin"] },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: "proposal:read" },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
    { key: "audit", label: "Audit Log", href: "/dashboard/audit", iconKey: "history", roles: ["tenant_admin", "saas_admin"] },
    { key: "mandates", label: "Mandate Templates", href: "/dashboard/funds/mandates", iconKey: "scroll-text", permissionKey: "fund:mandate:read", roles: ["tenant_admin", "saas_admin"] },
    { key: "prompts", label: "Prompt Management", href: "/dashboard/prompts", iconKey: "message-square", roles: ["tenant_admin", "saas_admin"] },
    { key: "queues", label: "Queues (Advanced)", href: "/dashboard/queues", iconKey: "list-checks", permissionKey: "queue:manage", roles: ["tenant_admin", "saas_admin"] },
    { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: "user:read" },
    { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
  ],
  // Fund Manager: IC dashboard + decision tools (no config/audit/funds/mandates/prompts/users)
  fund_manager: [
    { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "fund-manager", label: "Fund Manager", href: "/dashboard/fund-manager", iconKey: "target" },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
    { key: "queues", label: "Queues", href: "/dashboard/queues", iconKey: "list-checks" },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],

  // Analyst: proposal workspace
  assessor: [
    { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "queue", label: "My Queue", href: "/dashboard/queue", iconKey: "clipboard-list", roles: ["assessor"] },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],

  // Viewer: read-only dashboards
  viewer: [
    { key: "overview", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard" },
    { key: "fund-manager", label: "Fund Manager", href: "/dashboard/fund-manager", iconKey: "target" },
    { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
    { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Helper Functions
// ─────────────────────────────────────────────────────────────────────────────

export function getNavItemsForRole(role: string, activeTenantId?: string | null): NavItem[] {
  if (role === "saas_admin") {
    return activeTenantId ? NAV_BY_ROLE.saas_admin_tenant : NAV_BY_ROLE.saas_admin;
  }
  return NAV_BY_ROLE[role] ?? NAV_BY_ROLE.assessor;
}

export function filterNavItems(
  items: NavItem[],
  permissions: string[],
  role: string
): NavItem[] {
  return items.filter((item) => {
    // Check role restriction first
    if (item.roles && item.roles.length > 0) {
      if (!item.roles.includes(role)) {
        return false;
      }
    }
    // Check permission restriction
    if (item.permissionKey) {
      if (!permissions.includes(item.permissionKey)) {
        return false;
      }
    }
    return true;
  });
}

export function filterNavByPermissions(
  items: NavItem[],
  permissions: string[],
  role?: string
): NavItem[] {
  return items.filter((item) => {
    if (item.roles && item.roles.length > 0 && role) {
      if (!item.roles.includes(role)) return false;
    }
    if (!item.permissionKey) return true;
    return permissions.includes(item.permissionKey);
  });
}

export function getPageTitle(pathname: string, items: NavItem[]): string {
  const item = items.find((n) => n.href === pathname);
  return item?.label || "Dashboard";
}

// ─────────────────────────────────────────────────────────────────────────────
// Premium enterprise sidebar (grouped sections)
// ─────────────────────────────────────────────────────────────────────────────

const proposalRead = "proposal:read";
const fundMandateRead = "fund:mandate:read";
const queueManage = "queue:manage";
const userRead = "user:read";

/** SaaS admin with no tenant selected — platform scope only */
const SIDEBAR_SAAS_GLOBAL: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "ADMIN",
    groups: [
      {
        key: "admin",
        label: "",
        items: [
          {
            key: "tenants",
            label: "Tenants",
            href: "/dashboard/tenants",
            iconKey: "building-2",
            permissionKey: "tenant:read",
            roles: ["saas_admin"],
          },
          { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
          { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
        ],
      },
    ],
  },
];

const SIDEBAR_TENANT_ADMIN: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
          { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: proposalRead },
          { key: "evaluations-hub", label: "Evaluations", href: "/dashboard/evaluations", iconKey: "sparkles", permissionKey: proposalRead },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "WORK MANAGEMENT",
    groups: [
      {
        key: "work",
        label: "",
        items: [
          {
            key: "review-queue",
            label: "Review Queue",
            href: "/dashboard/queues",
            iconKey: "clipboard-list",
            permissionKey: queueManage,
            roles: ["tenant_admin", "saas_admin"],
          },
          {
            key: "decisions",
            label: "Decisions",
            href: "/dashboard/fund-manager",
            iconKey: "target",
            permissionKey: proposalRead,
            roles: ["tenant_admin", "saas_admin"],
          },
        ],
      },
    ],
  },
  {
    id: "configuration",
    label: "CONFIGURATION",
    groups: [
      {
        key: "configuration",
        label: "",
        items: [
          {
            key: "mandates",
            label: "Mandates",
            href: "/dashboard/funds/mandates",
            iconKey: "scroll-text",
            permissionKey: fundMandateRead,
            roles: ["tenant_admin", "saas_admin"],
          },
          { key: "prompts", label: "Prompt Management", href: "/dashboard/prompts", iconKey: "message-square", roles: ["tenant_admin", "saas_admin"] },
          { key: "scoring", label: "Scoring Rules", href: "/dashboard/scoring-rules", iconKey: "scale", roles: ["tenant_admin", "saas_admin"] },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "ADMIN",
    groups: [
      {
        key: "admin",
        label: "",
        items: [
          { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: userRead },
          { key: "roles", label: "Roles & Permissions", href: "/dashboard/users", iconKey: "settings", permissionKey: userRead },
          { key: "audit", label: "Audit Logs", href: "/dashboard/audit", iconKey: "history", roles: ["tenant_admin", "saas_admin"] },
          {
            key: "queues",
            label: "Queues",
            href: "/dashboard/queues",
            iconKey: "list-checks",
            permissionKey: queueManage,
            roles: ["tenant_admin", "saas_admin"],
          },
          { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
        ],
      },
    ],
  },
];

/** SaaS admin in tenant context: ADMIN includes Tenants + Subscriptions */
const SIDEBAR_SAAS_ADMIN_TENANT: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet", roles: ["tenant_admin", "saas_admin"] },
          { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text", permissionKey: proposalRead },
          { key: "evaluations-hub", label: "Evaluations", href: "/dashboard/evaluations", iconKey: "sparkles", permissionKey: proposalRead },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "WORK MANAGEMENT",
    groups: [
      {
        key: "work",
        label: "",
        items: [
          {
            key: "review-queue",
            label: "Review Queue",
            href: "/dashboard/queues",
            iconKey: "clipboard-list",
            permissionKey: queueManage,
            roles: ["tenant_admin", "saas_admin"],
          },
          {
            key: "decisions",
            label: "Decisions",
            href: "/dashboard/fund-manager",
            iconKey: "target",
            permissionKey: proposalRead,
            roles: ["tenant_admin", "saas_admin"],
          },
        ],
      },
    ],
  },
  {
    id: "configuration",
    label: "CONFIGURATION",
    groups: [
      {
        key: "configuration",
        label: "",
        items: [
          {
            key: "mandates",
            label: "Mandates",
            href: "/dashboard/funds/mandates",
            iconKey: "scroll-text",
            permissionKey: fundMandateRead,
            roles: ["tenant_admin", "saas_admin"],
          },
          { key: "prompts", label: "Prompt Management", href: "/dashboard/prompts", iconKey: "message-square", roles: ["tenant_admin", "saas_admin"] },
          { key: "scoring", label: "Scoring Rules", href: "/dashboard/scoring-rules", iconKey: "scale", roles: ["tenant_admin", "saas_admin"] },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "ADMIN",
    groups: [
      {
        key: "admin",
        label: "",
        items: [
          {
            key: "tenants",
            label: "Tenants",
            href: "/dashboard/tenants",
            iconKey: "building-2",
            permissionKey: "tenant:read",
            roles: ["saas_admin"],
          },
          { key: "subscriptions", label: "Subscriptions", href: "/dashboard/subscriptions", iconKey: "credit-card", roles: ["saas_admin"] },
          { key: "users", label: "Users", href: "/dashboard/users", iconKey: "users", permissionKey: userRead },
          { key: "roles", label: "Roles & Permissions", href: "/dashboard/users", iconKey: "settings", permissionKey: userRead },
          { key: "audit", label: "Audit Logs", href: "/dashboard/audit", iconKey: "history", roles: ["tenant_admin", "saas_admin"] },
          {
            key: "queues",
            label: "Queues",
            href: "/dashboard/queues",
            iconKey: "list-checks",
            permissionKey: queueManage,
            roles: ["tenant_admin", "saas_admin"],
          },
          { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
        ],
      },
    ],
  },
];

const SIDEBAR_FUND_MANAGER: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet" },
          { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
          { key: "evaluations-hub", label: "Evaluations", href: "/dashboard/evaluations", iconKey: "sparkles" },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "WORK MANAGEMENT",
    groups: [
      {
        key: "work",
        label: "",
        items: [
          { key: "review-queue", label: "Review Queue", href: "/dashboard/queues", iconKey: "clipboard-list" },
          { key: "decisions", label: "Decisions", href: "/dashboard/fund-manager", iconKey: "target" },
        ],
      },
    ],
  },
  {
    id: "configuration",
    label: "CONFIGURATION",
    groups: [
      {
        key: "configuration",
        label: "",
        items: [
          { key: "mandates", label: "Mandates", href: "/dashboard/funds/mandates", iconKey: "scroll-text" },
          { key: "prompts", label: "Prompt Management", href: "/dashboard/prompts", iconKey: "message-square" },
          { key: "scoring", label: "Scoring Rules", href: "/dashboard/scoring-rules", iconKey: "scale" },
        ],
      },
    ],
  },
  {
    id: "admin",
    label: "ADMIN",
    groups: [
      {
        key: "admin",
        label: "",
        items: [
          { key: "audit", label: "Audit Logs", href: "/dashboard/audit", iconKey: "history" },
          { key: "queues", label: "Queues", href: "/dashboard/queues", iconKey: "list-checks" },
          { key: "costs", label: "Costs", href: "/dashboard/costs", iconKey: "dollar-sign", permissionKey: "costs:read" },
        ],
      },
    ],
  },
];

const SIDEBAR_ASSESSOR: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
          { key: "evaluations-hub", label: "Evaluations", href: "/dashboard/evaluations", iconKey: "sparkles" },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "WORK MANAGEMENT",
    groups: [
      {
        key: "work",
        label: "",
        items: [
          { key: "review-queue", label: "Review Queue", href: "/dashboard/queue", iconKey: "clipboard-list", roles: ["assessor"] },
          { key: "decisions", label: "Decisions", href: "/dashboard/fund-manager", iconKey: "target" },
        ],
      },
    ],
  },
];

const SIDEBAR_VIEWER: SidebarNav = [
  {
    id: "main",
    label: "MAIN",
    groups: [
      {
        key: "main",
        label: "",
        items: [
          { key: "dashboard", label: "Dashboard", href: "/dashboard", iconKey: "layout-dashboard", exact: true },
          { key: "funds", label: "Funds", href: "/dashboard/funds", iconKey: "wallet" },
          { key: "proposals", label: "Proposals", href: "/dashboard/proposals", iconKey: "file-text" },
          { key: "evaluations-hub", label: "Evaluations", href: "/dashboard/evaluations", iconKey: "sparkles" },
          { key: "reports", label: "Reports", href: "/dashboard/reports", iconKey: "bar-chart-3" },
        ],
      },
    ],
  },
  {
    id: "work",
    label: "WORK MANAGEMENT",
    groups: [
      {
        key: "work",
        label: "",
        items: [
          { key: "decisions", label: "Decisions", href: "/dashboard/fund-manager", iconKey: "target" },
        ],
      },
    ],
  },
];

function filterSidebarLink(link: SidebarLink, permissions: string[], role: string): boolean {
  if (link.roles && link.roles.length > 0 && !link.roles.includes(role)) return false;
  if (link.permissionKey && !permissions.includes(link.permissionKey)) return false;
  return true;
}

export function filterSidebarNav(nav: SidebarNav, permissions: string[], role: string): SidebarNav {
  return nav
    .map((section) => ({
      ...section,
      groups: section.groups
        .map((group) => ({
          ...group,
          items: group.items.filter((link) => filterSidebarLink(link, permissions, role)),
        }))
        .filter((g) => g.items.length > 0),
    }))
    .filter((s) => s.groups.length > 0);
}

export function getSidebarForRole(role: string, activeTenantId?: string | null): SidebarNav {
  if (role === "saas_admin") {
    return activeTenantId ? SIDEBAR_SAAS_ADMIN_TENANT : SIDEBAR_SAAS_GLOBAL;
  }
  if (role === "tenant_admin") return SIDEBAR_TENANT_ADMIN;
  if (role === "fund_manager") return SIDEBAR_FUND_MANAGER;
  if (role === "viewer") return SIDEBAR_VIEWER;
  return SIDEBAR_ASSESSOR;
}

/** Whether a nav link is active for the current path */
export function isSidebarLinkActive(pathname: string, href: string, exact?: boolean): boolean {
  if (exact) return pathname === href;
  if (pathname === href) return true;
  if (href === "/dashboard/proposals") {
    if (pathname === "/dashboard/proposals/new") return false;
    return pathname.startsWith("/dashboard/proposals");
  }
  if (href === "/dashboard/funds") {
    return pathname === "/dashboard/funds" || pathname.startsWith("/dashboard/funds/");
  }
  // Avoid treating /dashboard as parent of every /dashboard/* route unless explicitly matched above
  if (href === "/dashboard" && !exact) {
    return false;
  }
  return pathname.startsWith(`${href}/`);
}

function collectSidebarLinks(nav: SidebarNav): SidebarLink[] {
  const out: SidebarLink[] = [];
  for (const section of nav) {
    for (const group of section.groups) {
      out.push(...group.items);
    }
  }
  return out;
}

/** Page title from grouped sidebar (longest matching href wins) */
export function getPageTitleFromSidebar(pathname: string, nav: SidebarNav): string {
  const links = collectSidebarLinks(nav);
  const sorted = [...links].sort((a, b) => b.href.length - a.href.length);
  for (const link of sorted) {
    if (isSidebarLinkActive(pathname, link.href, link.exact)) {
      return link.label;
    }
  }
  return "Dashboard";
}

/** Flat list for legacy callers */
export function sidebarToFlatNavItems(nav: SidebarNav): NavItem[] {
  return collectSidebarLinks(nav).map((l) => ({
    key: l.key,
    label: l.label,
    href: l.href,
    iconKey: l.iconKey,
    permissionKey: l.permissionKey,
    roles: l.roles,
  }));
}
