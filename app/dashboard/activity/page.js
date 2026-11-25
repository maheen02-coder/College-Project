"use client";

import { useMemo } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Award,
  CalendarCheck,
  HandHeart,
  ListChecks,
  Sparkles,
  Star,
  Trophy,
  Users,
} from "lucide-react";
import { ConsoleHeading, Panel, Skeleton, useApi } from "@/components/layout/ui";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { POINT_ACTIONS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

const ACTION_ICONS = {
  event_attendance: CalendarCheck,
  event_volunteering: HandHeart,
  competition_win: Trophy,
  competition_participation: Trophy,
  society_joined: Users,
  leadership_role: Star,
  task_completed: ListChecks,
  achievement_awarded: Award,
  manual: Sparkles,
};

export default function ActivityPage() {
  const { data, loading, error, reload } = useApi("/api/points");

  const items = useMemo(() => data?.items || [], [data]);
  const breakdown = useMemo(() => data?.breakdown || [], [data]);
  const total = data?.total || 0;
  const maxBreakdown = Math.max(1, ...breakdown.map((row) => row.points || 0));

  const labelFor = (item) => POINT_ACTIONS[item.action]?.label || item.label || item.action;

  return (
    <>
      <ConsoleHeading
        eyebrow="Participation ledger"
        title="Activity & points"
        description="Every point you have earned from attending events, competing, volunteering and completing society work."
        actions={
          <Link href="/dashboard/certificates" className="btn btn-secondary btn-sm">
            <Award size={14} /> Certificates
          </Link>
        }
      />

      {loading ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_1.4fr]">
          <Skeleton className="h-52" />
          <Skeleton className="h-72" />
        </div>
      ) : error ? (
        <Panel>
          <ErrorState message={error} onRetry={reload} />
        </Panel>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-[1fr_1.5fr]">
            <Panel className="overflow-hidden">
              <div className="relative overflow-hidden bg-gradient-to-br from-violet-600 via-violet-600 to-blue-600 p-6 text-white">
                <span className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.18em] text-white/70">Total participation points</p>
                <p className="mt-2 font-display text-5xl font-bold tracking-tight">{total.toLocaleString()}</p>
                <p className="mt-2 text-[0.76rem] text-white/75">
                  Earned across {items.length} {items.length === 1 ? "award" : "awards"} on your record.
                </p>
              </div>
              <div className="space-y-2.5 p-5">
                {breakdown.length === 0 ? (
                  <p className="text-[0.78rem] text-mist">No points activity recorded yet.</p>
                ) : (
                  breakdown.slice(0, 6).map((row) => (
                    <div key={row.action}>
                      <div className="flex items-center justify-between gap-2 text-[0.74rem]">
                        <span className="truncate text-ink-2">{POINT_ACTIONS[row.action]?.label || row.label}</span>
                        <span className="shrink-0 font-semibold text-purple">{row.points} pts</span>
                      </div>
                      <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-lavender">
                        <div
                          className="h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-500"
                          style={{ width: `${Math.max(6, Math.round(((row.points || 0) / maxBreakdown) * 100))}%` }}
                        />
                      </div>
                      <p className="mt-0.5 text-[0.62rem] text-mist">{row.count} {row.count === 1 ? "entry" : "entries"}</p>
                    </div>
                  ))
                )}
              </div>
            </Panel>

            <Panel title="Point breakdown" description="How your points add up by activity.">
              {breakdown.length === 0 ? (
                <EmptyState
                  icon={Sparkles}
                  title="No breakdown yet"
                  description="Attend an event or complete a task to start earning points."
                  action={<Link href="/events" className="btn btn-secondary btn-sm">Browse events</Link>}
                />
              ) : (
                <ul className="divide-y divide-line">
                  {breakdown.map((row) => {
                    const Icon = ACTION_ICONS[row.action] || Sparkles;
                    return (
                      <li key={row.action} className="flex items-center gap-3 px-5 py-3.5">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lilac text-purple">
                          <Icon size={15} />
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[0.82rem] font-medium text-ink">{POINT_ACTIONS[row.action]?.label || row.label}</p>
                          <p className="text-[0.68rem] text-mist">{row.count} {row.count === 1 ? "award" : "awards"}</p>
                        </div>
                        <span className="text-[0.84rem] font-bold text-purple">{row.points}</span>
                      </li>
                    );
                  })}
                </ul>
              )}
            </Panel>
          </div>

          <Panel
            className="mt-5"
            title="Activity timeline"
            description="Your most recent point awards, newest first."
          >
            {items.length === 0 ? (
              <EmptyState
                icon={Sparkles}
                title="Your ledger is empty"
                description="Points are awarded automatically for verified attendance, competition results and completed tasks."
                action={<Link href="/competitions" className="btn btn-primary btn-sm">Enter a competition</Link>}
              />
            ) : (
              <ol className="relative space-y-0 px-5 py-4">
                {items.map((item, index) => {
                  const Icon = ACTION_ICONS[item.action] || Sparkles;
                  return (
                    <li key={item.id} className="relative flex gap-3 pb-5 last:pb-0">
                      {index < items.length - 1 ? <span className="absolute left-[17px] top-9 h-[calc(100%-1.5rem)] w-0.5 bg-line" /> : null}
                      <span className="relative z-10 grid h-9 w-9 shrink-0 place-items-center rounded-full border border-violet-200 bg-lilac text-purple">
                        <Icon size={15} />
                      </span>
                      <div className="min-w-0 flex-1 pt-0.5">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <p className="text-[0.84rem] font-semibold text-ink">{labelFor(item)}</p>
                          <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[0.72rem] font-bold text-emerald-600">
                            +{item.points}
                          </span>
                        </div>
                        {item.note ? <p className="mt-0.5 text-[0.74rem] leading-relaxed text-ink-2">{item.note}</p> : null}
                        <p className="mt-0.5 text-[0.66rem] text-mist">
                          {formatDateTime(item.createdAt)}
                          {item.sourceType ? ` · ${String(item.sourceType).replace(/_/g, " ")}` : ""}
                        </p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </Panel>
        </>
      )}

      <p className="mt-5 flex items-center gap-2 text-[0.72rem] text-mist">
        <ArrowUpRight size={13} className="text-purple" />
        Points are awarded automatically and can take a moment to appear after an organiser marks attendance.
      </p>
    </>
  );
}
