import Link from "next/link";
import { Award, BarChart3, CalendarDays, Percent, Trophy, Users2 } from "lucide-react";
import PageHeader from "@/components/console/PageHeader";
import StatCard from "@/components/console/StatCard";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { getAnalytics } from "@/lib/dashboard";
import { getAdminStats } from "@/lib/queries";
import { formatDate, pct } from "@/lib/utils";

export const metadata = { title: "Reports · Administration" };

export default async function AdminReportsPage() {
  const user = await getSessionUser();
  const [analytics, stats] = await Promise.all([
    getAnalytics(user.instituteId),
    getAdminStats(user.instituteId),
  ]);

  const monthMax = Math.max(1, ...analytics.months.map((month) => month.count));
  const categoryMax = Math.max(1, ...analytics.categories.map((category) => category.count));
  const topMax = Math.max(1, ...analytics.topEvents.map((event) => event.registrations));
  const statusTotal = Object.values(analytics.statusCounts).reduce((sum, count) => sum + count, 0) || 1;
  const roleTotal = analytics.roleCounts.students + analytics.roleCounts.organizers || 1;

  return (
    <>
      <PageHeader
        eyebrow="Analytics"
        title="Reports"
        description="Participation, attendance and certificate performance across the whole campus."
        actions={
          <Link href="/admin/certificates" className="btn btn-secondary btn-sm">
            <Award size={14} /> Certificate registry
          </Link>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard icon={CalendarDays} label="Events" value={analytics.totals.events} hint={`${stats.completedEvents} completed`} tone="violet" />
        <StatCard icon={Percent} label="Attendance rate" value={`${analytics.totals.attendanceRate}%`} hint={`${stats.attendedCount} check-ins`} tone="emerald" />
        <StatCard icon={Trophy} label="Competition entries" value={analytics.totals.entries} hint={`${analytics.totals.competitions} competitions`} tone="blue" />
        <StatCard icon={Award} label="Certificates" value={analytics.totals.certificates} hint="Valid and verifiable" tone="amber" />
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-[1.5fr_1fr]">
        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <div className="flex flex-wrap items-end justify-between gap-2">
              <div>
                <h2 className="font-display text-base font-semibold text-white">Registrations by month</h2>
                <p className="mt-0.5 text-[0.74rem] text-mist">Six-month trend of new sign-ups.</p>
              </div>
              <span className="badge badge-violet">{analytics.totals.registrations} active now</span>
            </div>
            <div className="mt-6 flex h-48 items-end gap-2 sm:gap-4">
              {analytics.months.map((month) => (
                <div key={month.key} className="flex flex-1 flex-col items-center gap-2">
                  <span className="font-mono text-[0.66rem] text-mist">{month.count}</span>
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t-lg bg-gradient-to-t from-violet-600/70 via-violet-500/40 to-blue-400/50 shadow-[0_0_24px_-8px_rgba(139,92,246,0.8)]"
                      style={{ height: `${Math.max(6, (month.count / monthMax) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[0.62rem] uppercase tracking-[0.14em] text-mist">{month.label}</span>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold text-white">Top events by registrations</h2>
            <div className="mt-4 overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="table-console">
                <thead>
                  <tr>
                    <th>Event</th>
                    <th>Category</th>
                    <th>Date</th>
                    <th>Registrations</th>
                    <th>Fill rate</th>
                  </tr>
                </thead>
                <tbody>
                  {analytics.topEvents.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="text-center text-mist">
                        No events yet.
                      </td>
                    </tr>
                  ) : (
                    analytics.topEvents.map((event) => (
                      <tr key={event.id}>
                        <td className="font-medium text-white">{event.title}</td>
                        <td className="text-mist">{event.category}</td>
                        <td className="whitespace-nowrap text-mist">{formatDate(event.startAt)}</td>
                        <td>
                          <div className="flex items-center gap-2">
                            <span className="h-1.5 w-24 overflow-hidden rounded-full bg-white/[0.06]">
                              <span
                                className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
                                style={{ width: `${Math.max(3, (event.registrations / topMax) * 100)}%` }}
                              />
                            </span>
                            <span className="font-mono text-[0.72rem] text-mist">
                              {event.registrations}/{event.capacity}
                            </span>
                          </div>
                        </td>
                        <td className="font-mono text-[0.72rem] text-white/80">{pct(event.registrations, event.capacity)}%</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold text-white">Category distribution</h2>
            <div className="mt-4 space-y-3">
              {analytics.categories.length === 0 ? (
                <p className="text-[0.76rem] text-mist">No categories in use yet.</p>
              ) : (
                analytics.categories.map((category) => (
                  <div key={category.name}>
                    <div className="flex items-center justify-between gap-2 text-[0.74rem]">
                      <span className="text-white/80">{category.name}</span>
                      <span className="font-mono text-mist">{category.count}</span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400"
                        style={{ width: `${Math.max(3, (category.count / categoryMax) * 100)}%` }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </section>
        </div>

        <div className="space-y-6">
          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold text-white">Event status</h2>
            <div className="mt-4 space-y-2.5">
              {Object.entries(analytics.statusCounts).map(([status, count]) => (
                <div key={status}>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={status} />
                    <span className="font-mono text-[0.72rem] text-mist">{count}</span>
                  </div>
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-white/[0.06]">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
                      style={{ width: `${Math.max(3, (count / statusTotal) * 100)}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="panel p-5 sm:p-6">
            <h2 className="font-display text-base font-semibold text-white">People</h2>
            <div className="mt-4 space-y-3">
              <div>
                <div className="flex items-center justify-between text-[0.74rem]">
                  <span className="flex items-center gap-1.5 text-white/80">
                    <Users2 size={12} className="text-violet-300" /> Students
                  </span>
                  <span className="font-mono text-mist">{analytics.roleCounts.students}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
                    style={{ width: `${(analytics.roleCounts.students / roleTotal) * 100}%` }}
                  />
                </div>
              </div>
              <div>
                <div className="flex items-center justify-between text-[0.74rem]">
                  <span className="flex items-center gap-1.5 text-white/80">
                    <BarChart3 size={12} className="text-blue-300" /> Organizers
                  </span>
                  <span className="font-mono text-mist">{analytics.roleCounts.organizers}</span>
                </div>
                <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-white/[0.06]">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400"
                    style={{ width: `${(analytics.roleCounts.organizers / roleTotal) * 100}%` }}
                  />
                </div>
              </div>
            </div>
            <dl className="mt-4 space-y-2 border-t border-white/[0.06] pt-4 text-[0.74rem]">
              {[
                ["Unique participants", stats.totalParticipants],
                ["Active registrations", stats.totalRegistrations],
                ["Pending approvals", stats.pendingRegistrations],
                ["Certificates issued", stats.certificatesIssued],
              ].map(([label, value]) => (
                <div key={label} className="flex items-center justify-between gap-2">
                  <dt className="text-mist">{label}</dt>
                  <dd className="font-mono text-white/85">{value}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-5">
            <p className="text-[0.68rem] uppercase tracking-[0.16em] text-mist">Reporting note</p>
            <p className="mt-2 text-[0.76rem] leading-relaxed text-mist">
              Attendance rate uses only marked participants (present and absent); unmarked registrations are excluded
              so the percentage stays honest.
            </p>
          </section>
        </div>
      </div>
    </>
  );
}
