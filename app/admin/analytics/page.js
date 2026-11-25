"use client";

import { useMemo } from "react";
import Link from "next/link";
import { Award, BarChart3, Download, RefreshCw, Trophy, Users } from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  Panel,
  Skeleton,
  StatTile,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { APPLICATION_STATUS_META } from "@/lib/constants";
import { pct } from "@/lib/utils";

function csvCell(value) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

function BarRow({ label, value, max, tone = "violet", suffix }) {
  const width = max ? Math.max(2, Math.round((value / max) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between gap-2 text-[0.72rem]">
        <span className="truncate text-ink-2">{label}</span>
        <span className="shrink-0 font-semibold text-ink">
          {value}
          {suffix ? <span className="ml-1 font-normal text-mist">{suffix}</span> : null}
        </span>
      </div>
      <div className="mt-1 h-2 overflow-hidden rounded-full bg-lavender">
        <div
          className={
            tone === "blue"
              ? "h-full rounded-full bg-gradient-to-r from-blue-600 to-sky-400"
              : tone === "emerald"
                ? "h-full rounded-full bg-gradient-to-r from-emerald-600 to-emerald-400"
                : "h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
          }
          style={{ width: `${width}%` }}
        />
      </div>
    </div>
  );
}

export default function AdminAnalyticsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/admin/analytics");
  const analytics = data?.analytics;

  const counts = analytics?.counts;
  const monthly = analytics?.monthly || [];
  const funnel = analytics?.applicationFunnel || [];
  const categories = analytics?.categoryBreakdown || [];
  const topSocieties = analytics?.topSocieties || [];
  const topStudents = analytics?.topStudents || [];

  const monthlyMax = useMemo(
    () => Math.max(1, ...monthly.flatMap((month) => [month.registrations || 0, month.attendance || 0])),
    [monthly]
  );
  const funnelMax = useMemo(() => Math.max(1, ...funnel.map((row) => row.count || 0)), [funnel]);
  const categoryMax = useMemo(() => Math.max(1, ...categories.map((row) => row.count || 0)), [categories]);
  const funnelTotal = useMemo(() => funnel.reduce((sum, row) => sum + (row.count || 0), 0), [funnel]);

  const downloadCsv = () => {
    if (!analytics) {
      toast("Analytics has not loaded yet.", "error");
      return;
    }
    const rows = [["section", "label", "value"]];
    const push = (section, label, value) => rows.push([section, label, value]);

    push("kpi", "Students", counts.students);
    push("kpi", "Verified students", counts.verifiedStudents);
    push("kpi", "Pending verification", counts.pendingVerification);
    push("kpi", "Events", counts.events.total);
    push("kpi", "Registrations", counts.registrations.total);
    push("kpi", "Attendance rate (%)", counts.registrations.attendanceRate);
    push("kpi", "Applications", counts.applications.total);
    push("kpi", "Certificates", counts.certificates);
    push("kpi", "Groups", counts.groups);
    push("kpi", "Average rating", counts.averageRating);
    push("kpi", "Competitions", counts.competitions);
    push("kpi", "Societies", counts.societies);

    monthly.forEach((month) => {
      push("monthly", `${month.label} · registrations`, month.registrations);
      push("monthly", `${month.label} · attendance`, month.attendance);
    });
    funnel.forEach((row) => {
      push("application_funnel", APPLICATION_STATUS_META[row.status]?.label || row.status, row.count);
    });
    categories.forEach((row) => push("event_categories", row.category, row.count));
    topSocieties.forEach((row) => push("top_societies", row.name, row.members));
    topStudents.forEach((row) => push("top_students", `${row.name} (${row.matricRollNumber || "no roll"})`, row.points));

    const csv = rows.map((row) => row.map(csvCell).join(",")).join("\n");
    const blob = new Blob([`\uFEFF${csv}`], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `campus-analytics-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
    toast("Analytics CSV downloaded.", "success");
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-16 w-72" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 9 }).map((_, index) => (
            <Skeleton key={index} className="h-[5.5rem]" />
          ))}
        </div>
        <div className="grid gap-4 xl:grid-cols-2">
          <Skeleton className="h-72" />
          <Skeleton className="h-72" />
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="space-y-5">
        <ConsoleHeading eyebrow="Insight" title="Analytics" description="Campus-wide performance across students, events and recruitment." />
        <Panel>
          <div className="px-5 py-8">
            <Alert tone="error">{error || "Analytics could not be loaded."}</Alert>
            <button type="button" onClick={reload} className="btn btn-secondary btn-sm mt-4">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Insight"
        title="Analytics"
        description="A live read of participation, recruitment and event performance. Metrics are aggregated server-side from MongoDB on each request."
        actions={
          <>
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm">
              <RefreshCw size={14} /> Refresh
            </button>
            <button type="button" onClick={downloadCsv} className="btn btn-primary btn-sm">
              <Download size={14} /> Download CSV
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        <StatTile
          label="Students"
          value={counts.students}
          icon="students"
          hint={`${counts.verifiedStudents} verified · ${counts.pendingVerification} pending`}
        />
        <StatTile label="Verified" value={counts.verifiedStudents} icon="certificates" tone="emerald" hint="Cleared for activity" />
        <StatTile label="Events" value={counts.events.total} icon="events" tone="blue" hint={`${counts.competitions} competitions`} />
        <StatTile
          label="Registrations"
          value={counts.registrations.total}
          icon="registrations"
          tone="amber"
          hint={`${counts.registrations.pending} pending approval`}
        />
        <StatTile
          label="Attendance rate"
          value={`${counts.registrations.attendanceRate}%`}
          icon="analytics"
          tone="emerald"
          hint={`${counts.registrations.attended} attended`}
        />
        <StatTile label="Applications" value={counts.applications.total} icon="applications" hint="Recruitment pipeline" />
        <StatTile label="Certificates" value={counts.certificates} icon="certificates" tone="emerald" hint="Valid on ledger" />
        <StatTile label="Groups" value={counts.groups} icon="societies" tone="blue" hint={`${counts.memberships} memberships`} />
        <StatTile
          label="Avg feedback"
          value={counts.averageRating ? `${counts.averageRating} / 5` : "—"}
          icon="competitions"
          tone="amber"
          hint={`${counts.feedbackCount} responses`}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.6fr_1fr]">
        <Panel
          title="Registrations & attendance"
          description="Last six months, grouped by month."
          actions={
            <div className="flex items-center gap-3 text-[0.68rem] text-mist">
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-violet-600 to-violet-400" /> Registrations
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="h-2 w-3 rounded-sm bg-gradient-to-b from-blue-600 to-sky-400" /> Attendance
              </span>
            </div>
          }
        >
          <div className="px-5 pb-5 pt-4">
            <div className="flex h-56 items-end gap-2 border-b border-line pb-0">
              {monthly.map((month) => (
                <div key={month.month} className="flex flex-1 flex-col items-center gap-1.5">
                  <div className="flex h-44 w-full items-end justify-center gap-1">
                    <div
                      title={`${month.label}: ${month.registrations} registrations`}
                      className="w-3 rounded-t-md bg-gradient-to-t from-violet-600 to-violet-400 transition hover:opacity-80 sm:w-4"
                      style={{ height: `${Math.max(2, Math.round((month.registrations / monthlyMax) * 100))}%` }}
                    />
                    <div
                      title={`${month.label}: ${month.attendance} attended`}
                      className="w-3 rounded-t-md bg-gradient-to-t from-blue-600 to-sky-400 transition hover:opacity-80 sm:w-4"
                      style={{ height: `${Math.max(2, Math.round((month.attendance / monthlyMax) * 100))}%` }}
                    />
                  </div>
                  <span className="whitespace-nowrap text-[0.62rem] text-mist">{month.label}</span>
                </div>
              ))}
            </div>
            <p className="mt-3 text-[0.7rem] text-mist">
              Peak month: {monthly.reduce((best, month) => (month.registrations > (best?.registrations || 0) ? month : best), null)?.label || "—"}
            </p>
          </div>
        </Panel>

        <Panel title="Application funnel" description={`${funnelTotal} applications across all stages.`}>
          <div className="space-y-3 px-5 py-5">
            {funnelTotal === 0 ? (
              <p className="py-8 text-center text-[0.8rem] text-mist">No applications recorded yet.</p>
            ) : (
              funnel.map((row) => (
                <div key={row.status}>
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={row.status} kind="application" />
                    <span className="text-[0.72rem] font-semibold text-ink">
                      {row.count}
                      <span className="ml-1 font-normal text-mist">{pct(row.count, funnelTotal)}%</span>
                    </span>
                  </div>
                  <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lavender">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-500"
                      style={{ width: `${row.count ? Math.max(2, Math.round((row.count / funnelMax) * 100)) : 0}%` }}
                    />
                  </div>
                </div>
              ))
            )}
          </div>
        </Panel>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <Panel title="Events by category" description="Distribution across the campus calendar.">
          <div className="space-y-3 px-5 py-5">
            {categories.length === 0 ? (
              <p className="py-8 text-center text-[0.8rem] text-mist">No events categorised yet.</p>
            ) : (
              categories.slice(0, 10).map((row) => (
                <BarRow key={row.category} label={row.category} value={row.count} max={categoryMax} tone="blue" />
              ))
            )}
          </div>
        </Panel>

        <Panel title="Top societies" description="Ranked by active members.">
          <div className="px-5 py-4">
            {topSocieties.length === 0 ? (
              <p className="py-8 text-center text-[0.8rem] text-mist">No memberships recorded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topSocieties.map((society, index) => (
                  <div key={society.id} className="flex items-center gap-2.5">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender text-[0.68rem] font-bold text-purple">
                      {index + 1}
                    </span>
                    <p className="min-w-0 flex-1 truncate text-[0.8rem] font-medium text-ink">{society.name}</p>
                    <span className="inline-flex items-center gap-1 text-[0.74rem] font-semibold text-purple">
                      <Users size={12} /> {society.members}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </Panel>

        <Panel title="Top students" description="Participation points leaderboard.">
          <div className="px-5 py-4">
            {topStudents.length === 0 ? (
              <p className="py-8 text-center text-[0.8rem] text-mist">No points awarded yet.</p>
            ) : (
              <div className="space-y-2.5">
                {topStudents.map((student, index) => (
                  <Link
                    key={student.id}
                    href={`/admin/students/${student.id}`}
                    className="flex items-center gap-2.5 rounded-lg px-1 py-0.5 transition hover:bg-lavender/60"
                  >
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lavender text-[0.68rem] font-bold text-purple">
                      {index + 1}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8rem] font-medium text-ink">{student.name}</p>
                      <p className="truncate text-[0.64rem] text-mist">
                        {student.matricRollNumber || "No roll"} · {student.classYear || "—"}
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1 text-[0.74rem] font-semibold text-purple">
                      <Trophy size={12} /> {student.points}
                    </span>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </Panel>
      </div>

      <Panel className="bg-lavender/40">
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 text-[0.74rem] text-mist">
          <BarChart3 size={15} className="text-purple" />
          Every number above comes from <span className="font-mono text-purple">GET /api/admin/analytics</span>. The CSV is
          assembled in the browser from this payload — no reporting endpoint is required.
          <span className="ml-auto inline-flex items-center gap-2">
            <Award size={13} /> {counts.certificates} certificates issued
          </span>
        </div>
      </Panel>
    </div>
  );
}
