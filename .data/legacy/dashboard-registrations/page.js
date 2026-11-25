import Link from "next/link";
import { ArrowUpRight, CalendarDays, Clock, MapPin } from "lucide-react";
import PageHeader from "@/components/console/PageHeader";
import StatusBadge from "@/components/ui/StatusBadge";
import CancelRegistration from "@/components/site/CancelRegistration";
import { getSessionUser } from "@/lib/auth";
import { getMyRegistrations } from "@/lib/dashboard";
import { cn, formatDate, formatTime } from "@/lib/utils";

export const metadata = { title: "My events · Student dashboard" };

const FILTERS = [
  ["all", "All"],
  ["upcoming", "Upcoming"],
  ["history", "History"],
  ["cancelled", "Cancelled"],
];

const ATTENDANCE = {
  present: { label: "Present", tone: "emerald" },
  absent: { label: "Absent", tone: "rose" },
  unmarked: { label: "Not marked", tone: "slate" },
};

export default async function MyEventsPage({ searchParams }) {
  const user = await getSessionUser();
  const params = await searchParams;
  const filter = FILTERS.some(([key]) => key === params.filter) ? params.filter : "all";

  const registrations = await getMyRegistrations(user.id);
  const now = Date.now();

  const filtered = registrations.filter((reg) => {
    if (filter === "cancelled") return reg.status === "cancelled";
    if (filter === "upcoming")
      return new Date(reg.event.startAt).getTime() >= now && ["pending", "approved"].includes(reg.status);
    if (filter === "history")
      return new Date(reg.event.startAt).getTime() < now || ["attended", "absent"].includes(reg.status);
    return true;
  });

  return (
    <>
      <PageHeader
        eyebrow="Registration history"
        title="My events"
        description="Every event you've registered for, with live status, attendance and cancellation options."
        actions={
          <Link href="/events" className="btn btn-primary btn-sm">
            <CalendarDays size={14} /> Find events
          </Link>
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map(([key, label]) => (
          <Link
            key={key}
            href={key === "all" ? "/dashboard/registrations" : `/dashboard/registrations?filter=${key}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-[0.74rem] font-medium transition",
              filter === key
                ? "bg-white text-[#070a16]"
                : "border border-white/10 text-mist hover:border-white/25 hover:text-white"
            )}
          >
            {label}
          </Link>
        ))}
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} {filtered.length === 1 ? "registration" : "registrations"}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center">
          <CalendarDays size={20} className="mx-auto text-mist" />
          <p className="mt-3 font-display text-lg text-white">Nothing in this view</p>
          <p className="mx-auto mt-1.5 max-w-sm text-[0.8rem] text-mist">
            {filter === "upcoming"
              ? "You have no upcoming registrations. Browse the calendar and reserve a seat."
              : "Registrations will appear here as you join events."}
          </p>
          <Link href="/events" className="btn btn-secondary btn-sm mt-4">
            Browse events
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015] md:block">
            <table className="table-console">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Schedule</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((reg) => {
                  const attendance = ATTENDANCE[reg.attendance] || ATTENDANCE.unmarked;
                  const canCancel =
                    new Date(reg.event.startAt).getTime() > now && ["pending", "approved"].includes(reg.status);
                  return (
                    <tr key={reg.id}>
                      <td>
                        <div className="flex items-center gap-3">
                          <span className="h-11 w-16 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                            {reg.event.poster ? (
                              <img src={reg.event.poster} alt="" className="h-full w-full object-cover" />
                            ) : null}
                          </span>
                          <span className="min-w-0">
                            <Link href={`/events/${reg.event.slug}`} className="block truncate font-medium text-white hover:text-violet-300">
                              {reg.event.title}
                            </Link>
                            <span className="text-[0.68rem] text-mist">{reg.event.category} · {reg.event.type}</span>
                          </span>
                        </div>
                      </td>
                      <td>
                        <span className="block whitespace-nowrap text-[0.78rem]">{formatDate(reg.event.startAt)}</span>
                        <span className="text-[0.68rem] text-mist">
                          {formatTime(reg.event.startAt)} · {reg.event.venue}
                        </span>
                      </td>
                      <td>
                        <span className="block font-mono text-[0.72rem] text-white/80">{reg.registrationId}</span>
                        <span className="text-[0.66rem] text-mist">{formatDate(reg.registeredAt)}</span>
                      </td>
                      <td>
                        <StatusBadge status={reg.status} kind="registration" />
                      </td>
                      <td>
                        <span className={`badge badge-${attendance.tone}`}>{attendance.label}</span>
                      </td>
                      <td>
                        <div className="flex items-center justify-end gap-2">
                          <Link href={`/events/${reg.event.slug}`} className="btn btn-ghost btn-sm">
                            View <ArrowUpRight size={12} />
                          </Link>
                          {canCancel ? <CancelRegistration registrationId={reg.id} /> : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="space-y-3 md:hidden">
            {filtered.map((reg) => {
              const attendance = ATTENDANCE[reg.attendance] || ATTENDANCE.unmarked;
              const canCancel =
                new Date(reg.event.startAt).getTime() > now && ["pending", "approved"].includes(reg.status);
              return (
                <div key={reg.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                  <div className="flex items-start gap-3">
                    <span className="h-14 w-20 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
                      {reg.event.poster ? (
                        <img src={reg.event.poster} alt="" className="h-full w-full object-cover" />
                      ) : null}
                    </span>
                    <div className="min-w-0 flex-1">
                      <Link href={`/events/${reg.event.slug}`} className="block truncate text-[0.86rem] font-medium text-white">
                        {reg.event.title}
                      </Link>
                      <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-mist">
                        <CalendarDays size={11} /> {formatDate(reg.event.startAt)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-mist">
                        <Clock size={11} /> {formatTime(reg.event.startAt)}
                      </p>
                      <p className="mt-0.5 flex items-center gap-1.5 text-[0.7rem] text-mist">
                        <MapPin size={11} /> {reg.event.venue}
                      </p>
                    </div>
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <StatusBadge status={reg.status} kind="registration" />
                    <span className={`badge badge-${attendance.tone}`}>{attendance.label}</span>
                    <span className="ml-auto font-mono text-[0.66rem] text-mist">{reg.registrationId}</span>
                  </div>
                  {canCancel ? (
                    <div className="mt-3">
                      <CancelRegistration registrationId={reg.id} />
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        </>
      )}
    </>
  );
}
