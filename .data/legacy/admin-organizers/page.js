import { Award, ClipboardCheck, ShieldCheck, Users2 } from "lucide-react";
import PageHeader from "@/components/console/PageHeader";
import StatCard from "@/components/console/StatCard";
import UserManager from "@/components/console/UserManager";
import { getSessionUser } from "@/lib/auth";
import { getUserDirectory } from "@/lib/dashboard";

export const metadata = { title: "Organizers · Administration" };

export default async function AdminOrganizersPage() {
  const user = await getSessionUser();
  const organizers = await getUserDirectory(user.instituteId, "organizer");

  return (
    <>
      <PageHeader
        eyebrow="People directory"
        title="Organizers"
        description="Create organizer accounts and decide exactly which operations each one can perform."
      />

      <div className="mb-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={Users2} label="Organizers" value={organizers.length} tone="violet" />
        <StatCard
          icon={ClipboardCheck}
          label="Can mark attendance"
          value={organizers.filter((item) => item.organizerPermissions.includes("manage_attendance")).length}
          tone="blue"
        />
        <StatCard
          icon={ShieldCheck}
          label="Can manage results"
          value={organizers.filter((item) => item.organizerPermissions.includes("manage_results")).length}
          tone="emerald"
        />
        <StatCard
          icon={Award}
          label="Can issue certificates"
          value={organizers.filter((item) => item.organizerPermissions.includes("issue_certificates")).length}
          tone="amber"
        />
      </div>

      <UserManager users={organizers} role="organizer" />
    </>
  );
}
