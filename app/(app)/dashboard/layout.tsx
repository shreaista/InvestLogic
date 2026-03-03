import { redirect } from "next/navigation";
import { getSessionSafe } from "@/lib/session";
import { getNavItemsForRole } from "@/lib/nav";
import { AppShell } from "@/components/app-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user } = await getSessionSafe();

  if (!user) {
    redirect("/login");
  }

  const navItems = getNavItemsForRole(user.role);

  const userInfo = {
    name: user.name,
    email: user.email,
    role: user.role,
  };

  return (
    <AppShell user={userInfo} navItems={navItems}>
      {children}
    </AppShell>
  );
}
