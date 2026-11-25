import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import PageHeader from "@/components/console/PageHeader";
import CompetitionWorkspace from "@/components/console/CompetitionWorkspace";
import { getCompetitionConsole } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/utils";

export default async function CompetitionConsolePage({ user, competitionId, scope = "organizer", basePath }) {
  const data = await getCompetitionConsole(competitionId);
  if (!data) notFound();

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  if (scope === "organizer" && !isAdmin && data.competition.organizerId !== user.id) notFound();

  const permissions = user.organizerPermissions || [];
  const canManageResults = isAdmin || permissions.includes("manage_results");
  const canIssueCertificates = isAdmin || permissions.includes("issue_certificates");
  const canManage = isAdmin || permissions.includes("manage_events");

  return (
    <>
      <PageHeader
        eyebrow="Competition workspace"
        title={data.competition.title}
        description={`${formatDateTime(data.competition.startAt)} · ${data.competition.venue} · ${data.competition.mode === "team" ? "Team" : "Individual"} format`}
        backHref={basePath}
        backLabel="Back to competitions"
        actions={
          <>
            <Link href={`/competitions/${data.competition.slug}`} className="btn btn-ghost btn-sm">
              <ExternalLink size={13} /> Public page
            </Link>
            {canManage ? (
              <Link href={`${basePath}/${data.competition.id}/edit`} className="btn btn-secondary btn-sm">
                <Pencil size={13} /> Edit competition
              </Link>
            ) : null}
          </>
        }
      />

      {!canManage ? (
        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-[0.78rem] text-amber-200">
          Your account can view this competition but cannot change it. Ask an administrator for the manage events
          permission.
        </div>
      ) : null}

      <CompetitionWorkspace
        competition={data.competition}
        initialEntries={data.entries}
        certificateMap={data.certificates}
        canManageResults={canManageResults}
        canIssueCertificates={canIssueCertificates}
      />
    </>
  );
}
