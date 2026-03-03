import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/currentUser";
import { getNavItems } from "@/lib/nav";
import { DashboardShell } from "@/components/dashboard";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect("/login");
  }

  const navItems = getNavItems(user.role);

  return (
    <DashboardShell user={user} navItems={navItems}>
      {children}
    </DashboardShell>
  );
}
