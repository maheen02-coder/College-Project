import { redirect } from "next/navigation";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getSessionUser, hasAdminPermission, isAdmin } from "@/lib/auth";
import { ADMIN_NAV, filterNav } from "@/lib/navigation";
import { getInstitute } from "@/lib/queries";

export const metadata = { title: "Admin console" };

export default async function AdminLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/admin");
  if (!isAdmin(user)) redirect("/dashboard");
  if (!user.isActive) redirect("/login?next=/admin");

  const institute = await getInstitute();
  const nav = filterNav(ADMIN_NAV, (permission) => hasAdminPermission(user, permission));
  const plainUser = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    adminRole: user.adminRole,
    adminPermissions: user.adminPermissions,
    avatar: user.avatar,
    points: user.points,
  };

  return (
    <ConsoleShell
      user={plainUser}
      institute={{ shortName: institute?.shortName || "KIPS", name: institute?.name || "KIPS College" }}
      nav={nav}
      variant="admin"
    >
      {children}
    </ConsoleShell>
  );
}
