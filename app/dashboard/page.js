"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  Award,
  Bell,
  CalendarDays,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  Clock,
  ListChecks,
  MapPin,
  Sparkles,
  Trophy,
  UserRound,
  Users,
} from "lucide-react";
import { Alert, ConsoleHeading, Panel, Skeleton, StatTile } from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, SocietyAvatar, fetchParallel } from "@/components/dashboard/common";
import { formatDate, formatDateRange, timeAgo } from "@/lib/utils";

const QUICK_LINKS = [
  { href: "/events", label: "Browse events", icon: CalendarDays },
  { href: "/dashboard/events", label: "My registrations", icon: ClipboardList },
  { href: "/dashboard/competitions", label: "Competitions", icon: Trophy },
  { href: "/dashboard/applications", label: "Applications", icon: Users },
  { href: "/dashboard/certificates", label: "Certificates", icon: Award },
  { href: "/dashboard/profile", label: "My profile", icon: UserRound },
];

function OverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Skeleton className="h-8 w-64" />
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} className="h-[86px]" />
        ))}
      </div>
      <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Skeleton className="h-48" />
          <Skeleton className="h-64" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-64" />
          <Skeleton className="h-48" />
        </div>
      </div>
    </div>
  );
}

export default function StudentOverviewPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    const result = await fetchParallel([
      ["user", "/api/users/me"],
      ["registrations", "/api/registrations"],
      ["entries", "/api/entries"],
      ["applications", "/api/applications"],
      ["certificates", "/api/certificates"],
      ["notifications", "/api/notifications?limit=5"],
      ["tasks", "/api/tasks"],
      ["points", "/api/points"],
    ]);
    setData(result.data);
    if (!result.data.user) setError(result.errors.user || "Could not load your account.");
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const user = data?.user?.user || null;
  const registrations = useMemo(() => data?.registrations?.items || [], [data]);
  const entries = useMemo(() => data?.entries?.items || [], [data]);
  const applications = useMemo(() => data?.applications?.items || [], [data]);
  const certificates = useMemo(() => data?.certificates?.certificates || [], [data]);
  const notifications = useMemo(() => data?.notifications?.notifications || [], [data]);
  const tasks = useMemo(() => data?.tasks?.tasks || [], [data]);
  const points = data?.points || null;

  const stats = useMemo(() => {
    const active = registrations.filter((item) => ["pending", "approved"].includes(item.status) && item.event);
    const attended = registrations.filter((item) => item.status === "attended" || item.attendance === "present");
    const openApps = applications.filter((item) => !["accepted", "rejected", "withdrawn"].includes(item.status));
    const openTasks = tasks.filter((item) => ["pending", "in_progress"].includes(item.status));
    return { active, attended, openApps, openTasks };
  }, [registrations, applications, tasks]);

  const nextUp = useMemo(() => {
    const now = Date.now();
    return registrations
      .filter((item) => item.event && ["pending", "approved"].includes(item.status))
      .filter((item) => new Date(item.event.startAt).getTime() > now)
      .sort((a, b) => new Date(a.event.startAt) - new Date(b.event.startAt))[0];
  }, [registrations]);

  const recentApplications = useMemo(
    () =>
      [...applications]
        .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
        .slice(0, 4),
    [applications]
  );
  const activeTasks = useMemo(
    () => tasks.filter((item) => item.status !== "cancelled").slice(0, 5),
    [tasks]
  );
  const activeEntries = useMemo(
    () => entries.filter((item) => ["pending", "approved"].includes(item.status)).slice(0, 3),
    [entries]
  );

  if (loading && !data) return <OverviewSkeleton />;
  if (!user) {
    return (
      <Panel>
        <ErrorState message={error} onRetry={load} />
      </Panel>
    );
  }

  const firstName = user.name?.split(" ")[0] || "there";
  const verification = user.verificationStatus || "pending";

  return (
    <>
      <ConsoleHeading
        eyebrow="Student workspace"
        title={`Welcome back, ${firstName}.`}
        description="Your registrations, applications, tasks and certificates — all in one place."
        actions={
          <>
            <Link href="/events" className="btn btn-secondary btn-sm">
              <CalendarDays size={14} /> Browse events
            </Link>
            <Link href="/competitions" className="btn btn-primary btn-sm">
              <Trophy size={14} /> Competitions
            </Link>
          </>
        }
      />

      {verification !== "verified" ? (
        <div className="mb-5">
          <Alert tone={verification === "rejected" ? "error" : "warning"}>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {verification === "rejected"
                  ? `Your verification was rejected.${user.verificationNote ? ` ${user.verificationNote}` : " Update your academic details and contact the activities office."}`
                  : verification === "pending"
                    ? "Your student verification is pending. Complete your academic record so the activities office can approve it."
                    : "Verify your student account to register for events and apply to societies."}
              </span>
              <Link href="/dashboard/profile" className="btn btn-ghost btn-sm">
                Complete profile <ArrowRight size={13} />
              </Link>
            </div>
          </Alert>
        </div>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        <StatTile label="Participation points" value={points?.total ?? user.points ?? 0} icon="analytics" tone="purple" hint="Earned across campus activity" />
        <StatTile label="Events registered" value={registrations.filter((item) => item.status !== "cancelled").length} icon="events" tone="blue" hint={`${stats.active.length} upcoming or pending`} />
        <StatTile label="Events attended" value={stats.attended.length} icon="registrations" tone="emerald" hint="Marked present at the venue" />
        <StatTile label="Certificates" value={certificates.length} icon="certificates" tone="amber" hint="Ready to download and verify" />
        <StatTile label="Open applications" value={stats.openApps.length} icon="applications" tone="blue" hint="Awaiting a decision" />
        <StatTile label="Pending tasks" value={stats.openTasks.length} icon="files" tone="rose" hint="Assigned by your societies" />
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <Panel
            title="Next up"
            description="The soonest event on your calendar."
            actions={<Link href="/dashboard/events" className="text-[0.74rem] font-medium text-purple hover:text-blue">All registrations</Link>}
          >
            {nextUp ? (
              <Link href={`/events/${nextUp.event.slug}`} className="group flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
                <span className="relative h-28 w-full shrink-0 overflow-hidden rounded-2xl bg-lavender sm:h-20 sm:w-28">
                  {nextUp.event.poster ? (
                    <img src={nextUp.event.poster} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <span className="grid h-full w-full place-items-center text-purple">
                      <CalendarDays size={24} />
                    </span>
                  )}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-display text-[1.02rem] font-semibold text-ink">{nextUp.event.title}</span>
                    <StatusBadge status={nextUp.status} kind="registration" />
                  </span>
                  <span className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.76rem] text-mist">
                    <span className="inline-flex items-center gap-1.5">
                      <CalendarDays size={13} className="text-purple" /> {formatDateRange(nextUp.event.startAt, nextUp.event.endAt)}
                    </span>
                    <span className="inline-flex items-center gap-1.5">
                      <MapPin size={13} className="text-blue" /> {nextUp.event.venue || "Venue to be announced"}
                    </span>
                  </span>
                  <span className="mt-1 block font-mono text-[0.68rem] text-mist">{nextUp.registrationId}</span>
                </span>
                <span className="inline-flex items-center gap-1.5 self-start rounded-full bg-lilac px-3 py-1.5 text-[0.72rem] font-semibold text-purple sm:self-center">
                  View event <ChevronRight size={13} className="transition group-hover:translate-x-0.5" />
                </span>
              </Link>
            ) : (
              <EmptyState
                icon={Sparkles}
                title="Your calendar is clear"
                description="Register for an upcoming event and it will appear here."
                action={<Link href="/events" className="btn btn-secondary btn-sm">Explore events</Link>}
              />
            )}
          </Panel>

          <Panel
            title="Recent applications"
            description="Society recruitment drives you have applied to."
            actions={<Link href="/dashboard/applications" className="text-[0.74rem] font-medium text-purple hover:text-blue">View all</Link>}
          >
            {recentApplications.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No applications yet"
                description="When a society opens recruitment you can apply and track every stage here."
                action={<Link href="/recruitment" className="btn btn-secondary btn-sm">Find recruitment</Link>}
              />
            ) : (
              <ul className="divide-y divide-line">
                {recentApplications.map((item) => (
                  <li key={item.id}>
                    <Link href={`/dashboard/applications/${item.id}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-lavender/50">
                      <SocietyAvatar society={item.society} size="sm" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.84rem] font-medium text-ink">{item.recruitment?.title || "Recruitment"}</span>
                        <span className="mt-0.5 block text-[0.7rem] text-mist">
                          {item.society?.name || "Society"} · applied {formatDate(item.submittedAt || item.createdAt)}
                        </span>
                      </span>
                      <StatusBadge status={item.status} kind="application" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel
            title="Assigned tasks"
            description="Work assigned to you by your societies."
            actions={<Link href="/dashboard/tasks" className="text-[0.74rem] font-medium text-purple hover:text-blue">Task board</Link>}
          >
            {activeTasks.length === 0 ? (
              <EmptyState icon={ListChecks} title="No tasks assigned" description="Society tasks assigned to you will show up here." />
            ) : (
              <ul className="divide-y divide-line">
                {activeTasks.map((task) => (
                  <li key={task.id} className="flex items-start gap-3 px-5 py-3.5">
                    <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-lavender text-purple">
                      <ListChecks size={15} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-2">
                        <span className="truncate text-[0.84rem] font-medium text-ink">{task.title}</span>
                        <StatusBadge status={task.status} kind="task" />
                        <StatusBadge status={task.priority} kind="priority" />
                      </span>
                      <span className="mt-0.5 flex flex-wrap items-center gap-x-3 text-[0.7rem] text-mist">
                        <span>{task.society?.name || "Society"}</span>
                        <span className="inline-flex items-center gap-1">
                          <Clock size={11} /> {task.dueDate ? `Due ${formatDate(task.dueDate)}` : "No due date"}
                        </span>
                      </span>
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {activeEntries.length ? (
            <Panel title="Active competition entries" actions={<Link href="/dashboard/competitions" className="text-[0.74rem] font-medium text-purple hover:text-blue">View all</Link>}>
              <ul className="divide-y divide-line">
                {activeEntries.map((entry) => (
                  <li key={entry.id}>
                    <Link href={`/competitions/${entry.competition.slug}`} className="flex items-center gap-3 px-5 py-3.5 transition hover:bg-lavender/50">
                      <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-blue-50 text-blue-600">
                        <Trophy size={15} />
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[0.84rem] font-medium text-ink">{entry.competition.title}</span>
                        <span className="mt-0.5 block text-[0.7rem] text-mist">
                          {entry.teamName ? `Team ${entry.teamName} · ` : ""}
                          {entry.entryId} · {formatDate(entry.competition.startAt)}
                        </span>
                      </span>
                      <span className="badge badge-slate">{entry.status}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          ) : null}
        </div>

        <div className="space-y-6">
          <Panel
            title="Notifications"
            description={data?.notifications?.unread ? `${data.notifications.unread} unread` : "You are all caught up"}
            actions={<Link href="/dashboard/notifications" className="text-[0.74rem] font-medium text-purple hover:text-blue">View all</Link>}
          >
            {notifications.length === 0 ? (
              <EmptyState icon={Bell} title="No notifications" description="Updates about registrations, applications and certificates land here." />
            ) : (
              <ul className="divide-y divide-line">
                {notifications.map((item) => (
                  <li key={item.id}>
                    <Link href={item.link || "/dashboard/notifications"} className="block px-5 py-3 transition hover:bg-lavender/50">
                      <span className="flex items-center gap-2">
                        {!item.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple" /> : null}
                        <span className={`truncate text-[0.8rem] ${item.read ? "font-medium text-ink-2" : "font-semibold text-ink"}`}>{item.title}</span>
                      </span>
                      <span className="mt-0.5 line-clamp-1 pl-3.5 text-[0.7rem] text-mist">{item.message}</span>
                      <span className="mt-0.5 block pl-3.5 text-[0.64rem] text-mist/80">{timeAgo(item.createdAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          <Panel title="Quick links">
            <div className="grid grid-cols-2 gap-2 p-4">
              {QUICK_LINKS.map((link) => {
                const Icon = link.icon;
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className="group flex flex-col gap-2 rounded-xl border border-line bg-white px-3 py-3 transition hover:border-violet-200 hover:bg-lavender/40"
                  >
                    <Icon size={16} className="text-purple" />
                    <span className="text-[0.74rem] font-medium text-ink-2 group-hover:text-purple">{link.label}</span>
                  </Link>
                );
              })}
            </div>
          </Panel>

          <Panel title="Verification">
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.78rem] text-mist">Account status</span>
                <StatusBadge status={verification} kind="verification" />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.78rem] text-mist">Participation points</span>
                <span className="text-[0.82rem] font-semibold text-purple">{points?.total ?? user.points ?? 0}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.78rem] text-mist">Certificates</span>
                <span className="inline-flex items-center gap-1 text-[0.82rem] font-semibold text-emerald-600">
                  <CheckCircle2 size={13} /> {certificates.length}
                </span>
              </div>
              <Link href="/dashboard/activity" className="btn btn-ghost btn-sm w-full">
                View activity ledger <ArrowRight size={13} />
              </Link>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
