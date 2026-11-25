import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink, Pencil } from "lucide-react";
import PageHeader from "@/components/console/PageHeader";
import EventWorkspace from "@/components/console/EventWorkspace";
import { getEventConsole } from "@/lib/dashboard";
import { formatDateTime } from "@/lib/utils";

export default async function EventConsolePage({ user, eventId, scope = "organizer", basePath }) {
  const data = await getEventConsole(eventId);
  if (!data) notFound();

  const isAdmin = user.role === "admin" || user.role === "superadmin";
  if (scope === "organizer" && !isAdmin && data.event.organizerId !== user.id) notFound();

  const permissions = user.organizerPermissions || [];
  const canManageAttendance = isAdmin || permissions.includes("manage_attendance");
  const canIssueCertificates = isAdmin || permissions.includes("issue_certificates");
  const canManage = isAdmin || permissions.includes("manage_events");

  return (
    <>
      <PageHeader
        eyebrow="Event workspace"
        title={data.event.title}
        description={`${formatDateTime(data.event.startAt)} · ${data.event.venue} · Organised by ${data.event.organizerName || "Campus team"}`}
        backHref={basePath}
        backLabel="Back to events"
        actions={
          <>
            <Link href={`/events/${data.event.slug}`} className="btn btn-ghost btn-sm">
              <ExternalLink size={13} /> Public page
            </Link>
            {canManage ? (
              <Link href={`${basePath}/${data.event.id}/edit`} className="btn btn-secondary btn-sm">
                <Pencil size={13} /> Edit event
              </Link>
            ) : null}
          </>
        }
      />

      {!canManage ? (
        <div className="mb-5 rounded-2xl border border-amber-400/20 bg-amber-500/[0.06] px-4 py-3 text-[0.78rem] text-amber-200">
          Your account can view this event but cannot change it. Ask an administrator for the manage events
          permission.
        </div>
      ) : null}

      <EventWorkspace
        event={data.event}
        initialRegistrations={data.registrations}
        certificateMap={data.certificates}
        canManageAttendance={canManageAttendance}
        canIssueCertificates={canIssueCertificates}
      />
    </>
  );
}
