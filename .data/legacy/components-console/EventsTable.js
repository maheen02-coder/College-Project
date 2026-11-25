"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ExternalLink, Loader2, Search, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDate, pct } from "@/lib/utils";

const STATUSES = ["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"];

export default function EventsTable({ events, basePath, showOrganizer = false }) {
  const router = useRouter();
  const { toast } = useToast();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [busy, setBusy] = useState("");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return events.filter((event) => {
      if (status !== "all" && event.status !== status) return false;
      if (!q) return true;
      return [event.title, event.category, event.type, event.venue, event.organizerName]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [events, query, status]);

  const changeStatus = async (event, value) => {
    setBusy(event.id);
    try {
      const res = await fetch(`/api/events/${event.id}`, {
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

  const remove = async (event) => {
    if (!window.confirm(`Delete "${event.title}"? Registrations and certificates for it will be removed.`)) return;
    setBusy(event.id);
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not delete event.", "error");
        return;
      }
      toast("Event deleted.", "info");
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
            placeholder="Search events…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select
          value={status}
          onChange={(event) => setStatus(event.target.value)}
          className="field w-auto py-2 text-[0.78rem]"
        >
          <option value="all">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {events.length}
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
                {showOrganizer ? <th>Organizer</th> : null}
                <th>Schedule</th>
                <th>Registrations</th>
                <th>Status</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((event) => (
                <tr key={event.id}>
                  <td>
                    <div className="flex items-center gap-3">
                      <span className="h-10 w-14 shrink-0 overflow-hidden rounded-lg bg-white/[0.04]">
                        {event.poster ? (
                          <img src={event.poster} alt="" className="h-full w-full object-cover" />
                        ) : null}
                      </span>
                      <span className="min-w-0">
                        <Link href={`${basePath}/${event.id}`} className="block max-w-[220px] truncate font-medium text-white hover:text-violet-300">
                          {event.title}
                        </Link>
                        <span className="text-[0.66rem] text-mist">{event.category} · {event.type}</span>
                      </span>
                    </div>
                  </td>
                  {showOrganizer ? (
                    <td className="text-[0.74rem] text-mist">{event.organizerName || "Unassigned"}</td>
                  ) : null}
                  <td>
                    <span className="block whitespace-nowrap text-[0.76rem]">{formatDate(event.startAt)}</span>
                    <span className="text-[0.66rem] text-mist">{event.venue}</span>
                  </td>
                  <td>
                    <span className="block font-mono text-[0.74rem] text-white/85">
                      {event.registeredCount}/{event.capacity}
                    </span>
                    <span className="mt-1 block h-1 w-20 overflow-hidden rounded-full bg-white/[0.07]">
                      <span
                        className="block h-full rounded-full bg-gradient-to-r from-violet-500 to-blue-400"
                        style={{ width: `${pct(event.registeredCount, event.capacity)}%` }}
                      />
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center gap-2">
                      <StatusBadge status={event.status} />
                      <select
                        value={event.storedStatus}
                        onChange={(e) => changeStatus(event, e.target.value)}
                        disabled={busy === event.id}
                        aria-label={`Change status for ${event.title}`}
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
                    <div className="flex items-center justify-end gap-1.5">
                      <Link href={`${basePath}/${event.id}`} className="btn btn-ghost btn-sm">
                        Manage
                      </Link>
                      <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm" aria-label="Public page">
                        <ExternalLink size={12} />
                      </Link>
                      <button
                        type="button"
                        onClick={() => remove(event)}
                        disabled={busy === event.id}
                        aria-label="Delete event"
                        className={cn("btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10")}
                      >
                        {busy === event.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
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
