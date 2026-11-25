import { redirect } from "next/navigation";
import ConsoleShell from "@/components/layout/ConsoleShell";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { STUDENT_NAV } from "@/lib/navigation";
import { getInstitute } from "@/lib/queries";

export const metadata = { title: "Student dashboard" };

export default async function DashboardLayout({ children }) {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/dashboard");
  if (isAdmin(user)) redirect("/admin");

  const institute = await getInstitute();
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
      nav={STUDENT_NAV}
      variant="student"
    >
      {children}
    </ConsoleShell>
  );
}
