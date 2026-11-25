"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, Flag, Medal, Sparkles, Star, Trophy } from "lucide-react";
import { ChipTabs, ConsoleHeading, Panel, Skeleton, Toolbar, useApi } from "@/components/layout/ui";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { formatDate } from "@/lib/utils";

const TYPE_META = {
  badge: { label: "Badge", icon: Award, tone: "violet", accent: "from-violet-500/15 to-blue-500/5 text-purple" },
  award: { label: "Award", icon: Trophy, tone: "amber", accent: "from-amber-400/20 to-amber-100/30 text-amber-600" },
  recognition: { label: "Recognition", icon: Star, tone: "blue", accent: "from-blue-500/15 to-sky-100/40 text-blue-600" },
  milestone: { label: "Milestone", icon: Flag, tone: "emerald", accent: "from-emerald-500/15 to-emerald-100/30 text-emerald-600" },
};

export default function AchievementsPage() {
  const { data, loading, error, reload } = useApi("/api/achievements");
  const [type, setType] = useState("all");

  const items = useMemo(() => data?.items || [], [data]);
  const counts = useMemo(() => {
    const map = { all: items.length };
    for (const item of items) map[item.type] = (map[item.type] || 0) + 1;
    return map;
  }, [items]);

  const tabs = [
    { value: "all", label: `All (${counts.all || 0})` },
    ...Object.keys(counts)
      .filter((key) => key !== "all" && counts[key])
      .map((key) => ({ value: key, label: `${TYPE_META[key]?.label || key} (${counts[key]})` })),
  ];

  const filtered = type === "all" ? items : items.filter((item) => item.type === type);
  const totalPoints = items.reduce((sum, item) => sum + (item.points || 0), 0);

  return (
    <>
      <ConsoleHeading
        eyebrow="Recognition"
        title="Achievements"
        description="Badges, awards and milestones awarded to you for outstanding campus involvement."
        actions={
          <Link href="/dashboard/certificates" className="btn btn-secondary btn-sm">
            <Medal size={14} /> Certificates
          </Link>
        }
      />

      <Panel bodyClassName="p-0">
        <Toolbar>
          <span className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink">
            <Sparkles size={15} className="text-purple" /> {items.length} unlocked
            {totalPoints > 0 ? <span className="chip">{totalPoints} points from achievements</span> : null}
          </span>
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs} value={type} onChange={setType} />
          </div>
        </Toolbar>

        {loading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-48" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Award}
            title={items.length === 0 ? "No achievements yet" : "No achievements of this type"}
            description={
              items.length === 0
                ? "Get involved with societies, events and competitions — achievements appear as you contribute."
                : "Try another category filter."
            }
            action={<Link href="/societies" className="btn btn-secondary btn-sm">Explore societies</Link>}
          />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((item) => {
              const meta = TYPE_META[item.type] || TYPE_META.badge;
              const Icon = meta.icon;
              return (
                <article key={item.id} className={`card relative overflow-hidden bg-gradient-to-br p-4 ${meta.accent}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-11 w-11 place-items-center rounded-xl bg-white/80 shadow-sm">
                      <Icon size={19} />
                    </span>
                    <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                  </div>
                  <h2 className="mt-4 font-display text-[0.98rem] font-semibold leading-snug text-ink">{item.title}</h2>
                  {item.description ? (
                    <p className="mt-1.5 line-clamp-3 text-[0.76rem] leading-relaxed text-ink-2">{item.description}</p>
                  ) : null}
                  <div className="mt-4 flex items-center justify-between gap-2 border-t border-line/80 pt-3 text-[0.68rem] text-mist">
                    <span>{formatDate(item.awardedAt || item.createdAt)}</span>
                    {item.points > 0 ? <span className="font-bold text-purple">+{item.points} pts</span> : <span>Recognition</span>}
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>
    </>
  );
}
