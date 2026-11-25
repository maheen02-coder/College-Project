"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDate } from "@/lib/utils";

export default function AttendanceTable({ events }) {
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return events.filter((event) => {
      if (filter === "unmarked" && event.unmarked === 0) return false;
      if (filter === "complete" && (event.unmarked > 0 || event.active === 0)) return false;
      if (!q) return true;
      return [event.title, event.category, event.venue].join(" ").toLowerCase().includes(q);
    });
  }, [events, query, filter]);

  const totals = useMemo(
    () =>
      events.reduce(
        (acc, event) => ({
          active: acc.active + event.active,
          present: acc.present + event.present,
          absent: acc.absent + event.absent,
          unmarked: acc.unmarked + event.unmarked,
        }),
        { active: 0, present: 0, absent: 0, unmarked: 0 }
      ),
    [events]
  );
  const overall = totals.present + totals.absent ? Math.round((totals.present / (totals.present + totals.absent)) * 100) : 0;

  return (
    <div>
      <div className="mb-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          ["Active registrations", totals.active, "text-white"],
          ["Present", totals.present, "text-emerald-300"],
          ["Absent", totals.absent, "text-rose-300"],
          ["Unmarked", totals.unmarked, "text-amber-300"],
        ].map(([label, value, tone]) => (
          <div key={label} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <p className="text-[0.62rem] uppercase tracking-[0.16em] text-mist">{label}</p>
            <p className={cn("mt-2 font-display text-xl font-semibold", tone)}>{value}</p>
          </div>
        ))}
      </div>

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search events…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select value={filter} onChange={(event) => setFilter(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All events</option>
          <option value="unmarked">Needs marking</option>
          <option value="complete">Fully marked</option>
        </select>
        <span className="ml-auto text-[0.72rem] text-mist">
          Overall attendance <span className="font-semibold text-white">{overall}%</span>
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No events match this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <table className="table-console">
            <thead>
              <tr>
                <th>Event</th>
                <th>Date</th>
                <th>Status</th>
                <th className="text-center">Active</th>
                <th className="text-center">Present</th>
                <th className="text-center">Absent</th>
                <th className="text-center">Unmarked</th>
                <th>Attendance rate</th>
                <th className="text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id}>
                  <td>
                    <p className="max-w-[220px] truncate text-[0.8rem] font-medium text-white">{event.title}</p>
                    <p className="text-[0.64rem] text-mist">
                      {event.category} · {event.venue}
                    </p>
                  </td>
                  <td className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(event.startAt)}</td>
                  <td>
                    <StatusBadge status={event.status} />
                  </td>
                  <td className="text-center font-mono text-[0.78rem] text-white/85">{event.active}</td>
                  <td className="text-center font-mono text-[0.78rem] text-emerald-300">{event.present}</td>
                  <td className="text-center font-mono text-[0.78rem] text-rose-300">{event.absent}</td>
                  <td className="text-center font-mono text-[0.78rem] text-amber-300">{event.unmarked}</td>
                  <td>
                    <div className="flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                        <span
                          className="block h-full rounded-full bg-gradient-to-r from-emerald-500 to-blue-400"
                          style={{ width: `${event.rate}%` }}
                        />
                      </span>
                      <span className="font-mono text-[0.7rem] text-mist">{event.rate}%</span>
                    </div>
                  </td>
                  <td>
                    <div className="flex justify-end">
                      <Link href={`/admin/events/${event.id}`} className="btn btn-ghost btn-sm">
                        Mark <ArrowUpRight size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
