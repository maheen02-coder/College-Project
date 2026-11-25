"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, pct } from "@/lib/utils";

const STATUSES = ["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"];

export default function CompetitionsTable({ competitions, basePath, showOrganizer = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return competitions.filter((competition) => {
      if (status !== "all" && competition.status !== status) return false;
      if (!q) return true;
      return [competition.title, competition.type, competition.category, competition.venue]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [competitions, query, status]);

  const changeStatus = async (competition, value) => {
    setBusy(competition.id);
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: value }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update status.", "error");
        return;
      }
      toast("Status updated.", "success");
      router.refresh();
    } finally {
      setBusy("");
    }
  };

  const toggleLeaderboard = async (competition) => {
    setBusy(competition.id);
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardPublished: !competition.leaderboardPublished }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update leaderboard.", "error");
        return;
      }
      toast(competition.leaderboardPublished ? "Leaderboard unpublished." : "Leaderboard published.", "success");
      router.refresh();
    } finally {
      setBusy("");
    }
  };

  const remove = async (competition) => {
    if (!window.confirm(`Delete "${competition.title}"? All entries and certificates will be removed.`)) return;
    setBusy(competition.id);
    try {
      const res = await fetch(`/api/competitions/${competition.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not delete competition.", "error");
        return;
      }
      toast("Competition deleted.", "info");
      router.refresh();
    } finally {
      setBusy("");
    }
  };

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
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
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
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <table className="table-console">
            <thead>
              <tr>
                <th>Competition</th>
                {showOrganizer ? <th>Organizer</th> : null}
                <th>Starts</th>
                <th>Entries</th>
                <th>Status</th>
                <th>Leaderboard</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((competition) => (
                <tr key={competition.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                        {competition.poster ? (
                          <img src={competition.poster} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <Link
                          href={`${basePath}/${competition.id}`}
                          className="block max-w-[220px] truncate font-medium text-white hover:text-blue-200"
                        >
                          {competition.title}
                        </Link>
                        <span className="text-[0.66rem] text-mist">
                          {competition.type} · {competition.mode === "team" ? "Team" : "Individual"}
                        </span>
                      </span>
                    </div>
                  </td>
                  {showOrganizer ? (
                    <td className="text-[0.74rem] text-mist">{competition.organizerName || "Unassigned"}</td>
                  ) : null}
                  <td className="whitespace-nowrap text-[0.76rem]">{formatDate(competition.startAt)}</td>
                  <td>
                    <span className="block font-mono text-[0.74rem] text-white/85">
                      {competition.entryCount}/{competition.capacity}
                    </span>
                    <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-400"
                        style={{ width: `${pct(competition.entryCount, competition.capacity)}%` }}
                      />
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={competition.status} kind="competition" />
                      <select
                        value={competition.storedStatus}
                        onChange={(e) => changeStatus(competition, e.target.value)}
                        disabled={busy === competition.id}
                        aria-label={`Change status for ${competition.title}`}
                        className="rounded-lg border border-white/10 bg-[#0a0d1c] px-1.5 py-1 text-[0.64rem] text-mist outline-none focus:border-violet-400/40"
                      >
                        {STATUSES.map((value) => (
                          <option key={value} value={value}>
                            {value.replace(/_/g, " ")}
                          </option>
                        ))}
                      </select>
                    </div>
                  </td>
                  <td>
                    <button
                      type="button"
                      onClick={() => toggleLeaderboard(competition)}
                      disabled={busy === competition.id}
                      className={competition.leaderboardPublished ? "badge badge-emerald" : "badge badge-slate"}
                    >
                      {competition.leaderboardPublished ? "Published" : "Hidden"}
                    </button>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`${basePath}/${competition.id}`} className="btn btn-ghost btn-sm">
                        Manage
                      </Link>
                      <Link href={`/competitions/${competition.slug}`} className="btn btn-ghost btn-sm" aria-label="Public page">
                        <ExternalLink size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(competition)}
                        disabled={busy === competition.id}
                        aria-label="Delete competition"
                        className="btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10"
                      >
                        {busy === competition.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                      </button>
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
