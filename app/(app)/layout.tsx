import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { Role } from "@/lib/auth";
import { AppShell, NavItem } from "@/components/layout";

const navByRole: Record<Role, NavItem[]> = {
  saas_admin: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/tenants", label: "Tenants" },
    { href: "/dashboard/costs", label: "Costs" },
    { href: "/dashboard/subscriptions", label: "Subscriptions" },
  ],
  tenant_admin: [
    { href: "/dashboard", label: "Overview" },
    { href: "/dashboard/funds", label: "Funds" },
    { href: "/dashboard/proposals", label: "Proposals" },
    { href: "/dashboard/users", label: "Users" },
  ],
  assessor: [
    { href: "/dashboard", label: "My Queue" },
    { href: "/dashboard/proposals", label: "Proposals" },
    { href: "/dashboard/reports", label: "Reports" },
  ],
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const navItems = navByRole[user.role];

  return (
    <AppShell user={user} navItems={navItems}>
      {children}
    </AppShell>
  );
}
