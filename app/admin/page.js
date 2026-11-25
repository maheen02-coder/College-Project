import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  CalendarDays,
  ClipboardList,
  Megaphone,
  Plus,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserCheck,
  Users,
} from "lucide-react";
import { getSessionUser, hasAdminPermission } from "@/lib/auth";
import { connectDB } from "@/lib/db";
import { formatDateRange, timeAgo } from "@/lib/utils";
import Application, { APPLICATION_STATUSES } from "@/lib/models/Application";
import Certificate from "@/lib/models/Certificate";
import Competition from "@/lib/models/Competition";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";
import UploadedFile from "@/lib/models/UploadedFile";
import StatusBadge from "@/components/ui/StatusBadge";

export const dynamic = "force-dynamic";

const ACTIVE = ["pending", "approved", "attended", "absent"];

export default async function AdminOverviewPage() {
  const user = await getSessionUser();
  if (!user) return null;
  await connectDB();
  const institute = user.instituteId;
  const now = new Date();

  const [
    students,
    verified,
    pendingVerification,
    societies,
    activeSocieties,
    memberships,
    events,
    registrations,
    attended,
    pendingRegs,
    competitions,
    certificates,
    pendingApps,
    pendingFiles,
    recentEvents,
    upcomingEvents,
    topStudents,
    pendingStudents,
    recentApps,
    announcements,
  ] = await Promise.all([
    User.countDocuments({ institute, role: "student" }),
    User.countDocuments({ institute, role: "student", verificationStatus: "verified" }),
    User.countDocuments({ institute, role: "student", verificationStatus: "pending" }),
    Society.countDocuments({ institute }),
    Society.countDocuments({ institute, isActive: true }),
    SocietyMember.countDocuments({ institute, status: "active" }),
    Event.countDocuments({ institute }),
    Registration.countDocuments({ institute, status: { $in: ACTIVE } }),
    Registration.countDocuments({ institute, attendance: "present" }),
    Registration.countDocuments({ institute, status: "pending" }),
    Competition.countDocuments({ institute }),
    Certificate.countDocuments({ institute, status: "valid" }),
    Application.countDocuments({ institute, status: { $in: ["submitted", "pending_review", "under_review"] } }),
    UploadedFile.countDocuments({ institute, status: "pending_review" }),
    Event.find({ institute }).sort({ startAt: -1 }).limit(6).select("title slug category startAt endAt status venue capacity").lean(),
    Event.find({ institute, endAt: { $gte: now }, status: { $ne: "cancelled" } }).sort({ startAt: 1 }).limit(3).select("title slug startAt venue").lean(),
    User.find({ institute, role: "student" }).sort({ points: -1 }).limit(5).select("name matricRollNumber points classYear").lean(),
    User.find({ institute, role: "student", verificationStatus: "pending" }).sort({ createdAt: 1 }).limit(4).select("name email matricRollNumber matricPercentage createdAt").lean(),
    Application.find({ institute, status: { $in: ["submitted", "pending_review", "under_review"] } })
      .sort({ createdAt: -1 })
      .limit(4)
      .populate("user", "name")
      .populate("society", "name color")
      .select("status createdAt")
      .lean(),
    MegaphoneList(institute),
  ]);

  const recentIds = recentEvents.map((event) => event._id);
  const [regCounts, appCounts] = await Promise.all([
    recentIds.length
      ? Registration.aggregate([
          { $match: { event: { $in: recentIds }, status: { $in: ACTIVE } } },
          { $group: { _id: "$event", count: { $sum: 1 } } },
        ])
      : [],
    Application.aggregate([{ $match: { institute: user.instituteId } }, { $group: { _id: "$status", count: { $sum: 1 } } }]),
  ]);
  const regMap = Object.fromEntries(regCounts.map((row) => [String(row._id), row.count]));
  const appMap = Object.fromEntries(appCounts.map((row) => [row._id, row.count]));
  const appTotal = Object.values(appMap).reduce((sum, value) => sum + value, 0);

  const attendanceRate = registrations ? Math.round((attended / registrations) * 100) : 0;
  const can = (permission) => hasAdminPermission(user, permission);

  const tiles = [
    { label: "Students", value: students, hint: `${verified} verified · ${pendingVerification} pending`, icon: Users, href: can("manage_students") ? "/admin/students" : null, tone: "bg-lilac text-purple" },
    { label: "Events", value: events, hint: `${upcomingEvents.length ? "Live calendar" : "No upcoming"}`, icon: CalendarDays, href: can("manage_events") ? "/admin/events" : null, tone: "bg-blue-50 text-blue-600" },
    { label: "Registrations", value: registrations, hint: `${attendanceRate}% attendance · ${pendingRegs} pending`, icon: ClipboardList, href: can("manage_registrations") ? "/admin/registrations" : null, tone: "bg-emerald-50 text-emerald-600" },
    { label: "Applications", value: appTotal, hint: `${pendingApps} awaiting review`, icon: UserCheck, href: can("review_applications") ? "/admin/applications" : null, tone: "bg-amber-50 text-amber-600" },
    { label: "Certificates", value: certificates, hint: "Valid on ledger", icon: Award, href: can("manage_certificates") ? "/admin/certificates" : null, tone: "bg-rose-50 text-rose-600" },
    { label: "Societies", value: societies, hint: `${activeSocieties} active · ${memberships} members`, icon: Sparkles, href: can("manage_societies") ? "/admin/societies" : null, tone: "bg-violet-50 text-violet-600" },
  ];

  const quickActions = [
    can("manage_events") && { href: "/admin/events/new", label: "Create event", icon: Plus },
    can("manage_competitions") && { href: "/admin/competitions/new", label: "New competition", icon: Trophy },
    can("review_applications") && { href: "/admin/applications", label: "Review applications", icon: UserCheck },
    can("manage_certificates") && { href: "/admin/certificates", label: "Issue certificate", icon: Award },
    can("manage_announcements") && { href: "/admin/announcements", label: "Post update", icon: Megaphone },
    can("verify_students") && { href: "/admin/students?verificationStatus=pending", label: "Verify students", icon: ShieldCheck },
  ].filter(Boolean);

  return (
    <div className="space-y-6">
      <div className="card relative overflow-hidden p-6 sm:p-7">
        <div className="pointer-events-none absolute -right-16 -top-24 h-64 w-64 rounded-full bg-violet-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 right-24 h-56 w-56 rounded-full bg-blue-200/30 blur-3xl" />
        <div className="relative flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="eyebrow">Command center</p>
            <h1 className="mt-2 font-display text-[1.6rem] font-bold tracking-tight text-ink sm:text-[1.9rem]">
              Welcome back, {user.name.split(" ")[0]}.
            </h1>
            <p className="mt-1.5 max-w-xl text-[0.84rem] leading-relaxed text-mist">
              {pendingVerification > 0 || pendingApps > 0
                ? `${pendingVerification} student${pendingVerification === 1 ? "" : "s"} awaiting verification and ${pendingApps} application${pendingApps === 1 ? "" : "s"} in the recruitment queue.`
                : "Everything is reviewed. Here is how the campus is moving today."}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {quickActions.slice(0, 3).map((action) => (
              <Link key={action.href} href={action.href} className="btn btn-secondary btn-sm">
                <action.icon size={14} /> {action.label}
              </Link>
            ))}
            {can("manage_settings") ? (
              <Link href="/admin/settings" className="btn btn-primary btn-sm">
                Settings <ArrowUpRight size={14} />
              </Link>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {tiles.map((tile) => {
          const body = (
            <>
              <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tile.tone}`}>
                <tile.icon size={18} />
              </span>
              <div className="min-w-0">
                <p className="text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-mist">{tile.label}</p>
                <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-ink">{tile.value.toLocaleString()}</p>
                <p className="mt-0.5 truncate text-[0.68rem] text-mist">{tile.hint}</p>
              </div>
            </>
          );
          return tile.href ? (
            <Link key={tile.label} href={tile.href} className="stat-card flex items-start gap-3 transition hover:-translate-y-0.5 hover:border-violet-200">
              {body}
            </Link>
          ) : (
            <div key={tile.label} className="stat-card flex items-start gap-3">
              {body}
            </div>
          );
        })}
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="text-[0.95rem] font-semibold text-ink">Recent events</h3>
              <p className="mt-0.5 text-[0.74rem] text-mist">Latest activities on the campus calendar.</p>
            </div>
            {can("manage_events") ? (
              <Link href="/admin/events" className="text-[0.74rem] font-semibold text-purple hover:underline">
                Manage all
              </Link>
            ) : null}
          </div>
          <div className="overflow-x-auto">
            <table className="table-console">
              <thead>
                <tr>
                  <th>Event</th>
                  <th>Schedule</th>
                  <th>Status</th>
                  <th className="text-right">Registered</th>
                </tr>
              </thead>
              <tbody>
                {recentEvents.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="!py-10 text-center text-mist">No events yet. Create the first one.</td>
                  </tr>
                ) : (
                  recentEvents.map((event) => (
                    <tr key={String(event._id)}>
                      <td>
                        <p className="font-semibold text-ink">{event.title}</p>
                        <p className="text-[0.7rem] text-mist">{event.category} · {event.venue}</p>
                      </td>
                      <td className="whitespace-nowrap text-[0.74rem]">{formatDateRange(event.startAt, event.endAt)}</td>
                      <td><StatusBadge status={event.status} kind="event" /></td>
                      <td className="text-right font-semibold text-ink">{regMap[String(event._id)] || 0}<span className="ml-1 text-[0.68rem] font-normal text-mist">/ {event.capacity}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.95rem] font-semibold text-ink">Upcoming next</h3>
              <CalendarDays size={16} className="text-mist" />
            </div>
            <div className="mt-3 space-y-2.5">
              {upcomingEvents.length === 0 ? (
                <p className="rounded-xl border border-dashed border-line px-3 py-6 text-center text-[0.76rem] text-mist">Nothing scheduled.</p>
              ) : (
                upcomingEvents.map((event) => (
                  <div key={String(event._id)} className="rounded-xl border border-line bg-ivory/60 px-3 py-2.5">
                    <p className="truncate text-[0.8rem] font-semibold text-ink">{event.title}</p>
                    <p className="mt-0.5 text-[0.68rem] text-mist">
                      {new Intl.DateTimeFormat("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" }).format(new Date(event.startAt))} · {event.venue}
                    </p>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.95rem] font-semibold text-ink">Recruitment funnel</h3>
              <UserCheck size={16} className="text-mist" />
            </div>
            <div className="mt-3 space-y-2">
              {APPLICATION_STATUSES.filter((status) => !["draft", "withdrawn"].includes(status)).map((status) => {
                const count = appMap[status] || 0;
                const width = appTotal ? Math.max(3, Math.round((count / appTotal) * 100)) : 0;
                return (
                  <div key={status}>
                    <div className="flex items-center justify-between text-[0.7rem] text-mist">
                      <StatusBadge status={status} kind="application" />
                      <span className="font-semibold text-ink">{count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lavender">
                      <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500" style={{ width: `${width}%` }} />
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-3">
        <section className="card overflow-hidden xl:col-span-2">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <div>
              <h3 className="text-[0.95rem] font-semibold text-ink">Applications needing attention</h3>
              <p className="mt-0.5 text-[0.74rem] text-mist">Submitted and under-review entries, newest first.</p>
            </div>
            {can("review_applications") ? (
              <Link href="/admin/applications" className="text-[0.74rem] font-semibold text-purple hover:underline">Open review desk</Link>
            ) : null}
          </div>
          <div className="divide-y divide-line">
            {recentApps.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.8rem] text-mist">No applications waiting. Great job.</p>
            ) : (
              recentApps.map((application) => (
                <div key={String(application._id)} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-semibold text-ink">{application.user?.name || "Applicant"}</p>
                    <p className="truncate text-[0.7rem] text-mist">
                      {application.society?.name || "Society"} · {timeAgo(application.createdAt)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={application.status} kind="application" />
                    <Link href={`/admin/applications/${String(application._id)}`} className="btn btn-ghost btn-sm">
                      Review <ArrowUpRight size={12} />
                    </Link>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        <div className="space-y-5">
          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.95rem] font-semibold text-ink">Top students</h3>
              <Trophy size={16} className="text-amber-500" />
            </div>
            <div className="mt-3 space-y-2">
              {topStudents.length === 0 ? (
                <p className="text-[0.76rem] text-mist">No points awarded yet.</p>
              ) : (
                topStudents.map((student, index) => (
                  <div key={String(student._id)} className="flex items-center gap-2.5">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lavender text-[0.66rem] font-bold text-purple">{index + 1}</span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.78rem] font-medium text-ink">{student.name}</p>
                      <p className="text-[0.66rem] text-mist">{student.classYear || "—"} · {student.matricRollNumber || "—"}</p>
                    </div>
                    <span className="text-[0.76rem] font-bold text-purple">{student.points}</span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="card p-5">
            <div className="flex items-center justify-between">
              <h3 className="text-[0.95rem] font-semibold text-ink">Verification queue</h3>
              <ShieldCheck size={16} className="text-emerald-600" />
            </div>
            <div className="mt-3 space-y-2">
              {pendingStudents.length === 0 ? (
                <p className="text-[0.76rem] text-mist">No pending students.</p>
              ) : (
                pendingStudents.map((student) => (
                  <div key={String(student._id)} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-[0.78rem] font-medium text-ink">{student.name}</p>
                      <p className="text-[0.66rem] text-mist">{student.matricRollNumber || student.email}</p>
                    </div>
                    <span className="badge badge-amber">{student.matricPercentage != null ? `${student.matricPercentage}%` : "Review"}</span>
                  </div>
                ))
              )}
            </div>
            {can("verify_students") ? (
              <Link href="/admin/students?verificationStatus=pending" className="btn btn-secondary btn-sm mt-3 w-full justify-center">
                Verify students <ArrowUpRight size={13} />
              </Link>
            ) : null}
          </section>
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-line px-5 py-4">
            <h3 className="text-[0.95rem] font-semibold text-ink">Latest announcements</h3>
            {can("manage_announcements") ? (
              <Link href="/admin/announcements" className="text-[0.74rem] font-semibold text-purple hover:underline">Manage</Link>
            ) : null}
          </div>
          <div className="divide-y divide-line">
            {announcements.length === 0 ? (
              <p className="px-5 py-8 text-center text-[0.8rem] text-mist">No announcements yet.</p>
            ) : (
              announcements.map((item) => (
                <div key={item.id} className="px-5 py-3">
                  <p className="text-[0.8rem] font-semibold text-ink">{item.title}</p>
                  <p className="mt-0.5 line-clamp-2 text-[0.72rem] text-mist">{item.body}</p>
                  <p className="mt-1 text-[0.64rem] text-mist/80">{timeAgo(item.createdAt)} · {item.publishedByName || "Admin"}</p>
                </div>
              ))
            )}
          </div>
        </section>

        <section className="card p-5">
          <h3 className="text-[0.95rem] font-semibold text-ink">Operational pulse</h3>
          <div className="mt-4 grid gap-3 sm:grid-cols-2">
            <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Attendance rate</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{attendanceRate}%</p>
              <p className="text-[0.66rem] text-mist">{attended} present of {registrations}</p>
            </div>
            <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Pending files</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{pendingFiles}</p>
              <p className="text-[0.66rem] text-mist">Awaiting document review</p>
            </div>
            <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Competitions</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{competitions}</p>
              <p className="text-[0.66rem] text-mist">Across all societies</p>
            </div>
            <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Verification pending</p>
              <p className="mt-1 font-display text-xl font-bold text-ink">{pendingVerification}</p>
              <p className="text-[0.66rem] text-mist">Student accounts</p>
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {quickActions.slice(3).map((action) => (
              <Link key={action.href} href={action.href} className="btn btn-ghost btn-sm">
                <action.icon size={14} /> {action.label}
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

async function MegaphoneList(institute) {
  const Announcement = (await import("@/lib/models/Announcement")).default;
  const rows = await Announcement.find({ institute, isActive: true }).sort({ pinned: -1, createdAt: -1 }).limit(4).lean();
  return rows.map((row) => ({
    id: String(row._id),
    title: row.title,
    body: row.body,
    publishedByName: row.publishedByName,
    createdAt: new Date(row.createdAt).toISOString(),
  }));
}
