"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Crown, Medal, Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { POSITION_META } from "@/lib/constants";

const POSITION_ICON = { winner: Crown, runner_up: Medal, second_runner_up: Medal };

export default function ResultsTable({ competitions }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return competitions.filter((competition) => {
      if (filter === "judged" && competition.judged === 0) return false;
      if (filter === "pending" && competition.judged > 0) return false;
      if (!q) return true;
      return [competition.title, competition.type].join(" ").toLowerCase().includes(q);
    });
  }, [competitions, query, filter]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search competitions…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All competitions</option>
          <option value="judged">Results published</option>
          <option value="pending">Awaiting results</option>
        </select>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {competitions.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No competitions match this view.
        </div>
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {filtered.map((competition) => (
            <article key={competition.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate font-display text-[0.95rem] font-semibold text-white">{competition.title}</p>
                  <p className="mt-0.5 text-[0.68rem] text-mist">
                    {competition.type} · {competition.mode === "team" ? "Team" : "Individual"} · {competition.entryCount}{" "}
                    entries
                  </p>
                </div>
                <StatusBadge status={competition.status} kind="competition" />
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-1.5">
                <span className={competition.leaderboardPublished ? "badge badge-emerald" : "badge badge-slate"}>
                  {competition.leaderboardPublished ? "Leaderboard live" : "Leaderboard hidden"}
                </span>
                <span className="badge badge-violet">{competition.judged} judged</span>
              </div>

              <div className="mt-3 space-y-1.5">
                {competition.winners.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-white/10 px-3 py-3 text-center text-[0.72rem] text-mist">
                    No results recorded yet.
                  </p>
                ) : (
                  competition.winners.map((winner) => {
                    const Icon = POSITION_ICON[winner.position] || Medal;
                    return (
                      <div
                        key={winner.id}
                        className="flex items-center gap-2 rounded-xl border border-white/[0.05] bg-white/[0.015] px-3 py-2"
                      >
                        <Icon
                          size={13}
                          className={
                            winner.position === "winner"
                              ? "text-amber-300"
                              : winner.position === "runner_up"
                                ? "text-blue-300"
                                : "text-emerald-300"
                          }
                        />
                        <span className="min-w-0 flex-1 truncate text-[0.76rem] text-white">{winner.name}</span>
                        <span className={`badge badge-${POSITION_META[winner.position]?.tone || "slate"}`}>
                          {POSITION_META[winner.position]?.label || winner.position}
                        </span>
                        {winner.score !== null && winner.score !== undefined ? (
                          <span className="font-mono text-[0.68rem] text-mist">{winner.score}</span>
                        ) : null}
                      </div>
                    );
                  })
                )}
              </div>

              <div className="mt-3 flex justify-end">
                <Link href={`/admin/competitions/${competition.id}`} className="btn btn-ghost btn-sm">
                  Manage results <ArrowUpRight size={12} />
                </Link>
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
