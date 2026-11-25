"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  LayoutDashboard,
  Pencil,
  RefreshCw,
  Ticket,
  Trash2,
  TrendingUp,
} from "lucide-react";
import {
  ConsoleHeading,
  DataTable,
  FilterSelect,
  Modal,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  useApi,
  useDebounced,
  fetchJson,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { EVENT_STATUSES, EVENT_STATUS_META } from "@/lib/constants";
import { formatDateRange, pct } from "@/lib/utils";

const STATUS_OPTIONS = EVENT_STATUSES.map((value) => ({
  value,
  label: EVENT_STATUS_META[value]?.label || value,
}));

const SORT_OPTIONS = [
  { value: "", label: "Newest first" },
  { value: "soonest", label: "Soonest first" },
  { value: "latest", label: "Latest start" },
];

function Poster({ src, title }) {
  if (src) {
    return <img src={src} alt={title} loading="lazy" className="h-11 w-16 shrink-0 rounded-lg border border-line object-cover" />;
  }
  return (
    <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg border border-line bg-lavender text-purple">
      <CalendarDays size={17} />
    </span>
  );
}

export default function AdminEventsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(search, 300);

  const url = useMemo(() => {
    const params = new URLSearchParams({ scope: "all", limit: "120" });
    if (status) params.set("status", status);
    if (sort) params.set("sort", sort);
    if (debounced.trim()) params.set("q", debounced.trim());
    return `/api/events?${params.toString()}`;
  }, [status, sort, debounced]);

  const { data, loading, error, reload } = useApi(url);
  const events = data?.items || [];

  const tiles = useMemo(() => {
    const open = events.filter((event) => event.status === "registration_open").length;
    const registered = events.reduce((sum, event) => sum + (event.registeredCount || 0), 0);
    const capacity = events.reduce((sum, event) => sum + (event.capacity || 0), 0);
    return { open, registered, capacity };
  }, [events]);

  async function cancelEvent() {
    if (!confirming) return;
    setBusy(true);
    try {
      await fetchJson(`/api/events/${confirming.id}`, { method: "DELETE" });
      toast("Event cancelled. Registered students have been notified.", "success", "Event cancelled");
      setConfirming(null);
      await reload();
    } catch (err) {
      toast(err.message, "error", "Could not cancel event");
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: "event",
      label: "Event",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Poster src={row.poster} title={row.title} />
          <div className="min-w-0">
            <p className="truncate text-[0.83rem] font-semibold text-ink">{row.title}</p>
            <p className="mt-0.5 text-[0.72rem] text-mist">
              {row.category} · {row.type}
            </p>
            {row.society ? <p className="text-[0.68rem] text-purple">{row.society.name}</p> : null}
          </div>
        </div>
      ),
    },
    {
      key: "schedule",
      label: "Schedule",
      className: "whitespace-nowrap",
      render: (row) => (
        <div>
          <p className="text-[0.78rem] text-ink-2">{formatDateRange(row.startAt, row.endAt)}</p>
          <p className="text-[0.68rem] text-mist">
            Reg. closes {row.registrationDeadline ? new Date(row.registrationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "venue",
      label: "Venue",
      render: (row) => <span className="text-[0.78rem] text-ink-2">{row.venue || "—"}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <StatusBadge kind="event" status={row.status} dot />
          {row.featured ? <span className="badge badge-amber">Featured</span> : null}
        </div>
      ),
    },
    {
      key: "registrations",
      label: "Registered",
      render: (row) => {
        const width = pct(row.registeredCount || 0, row.capacity || 1);
        return (
          <div className="w-32">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.78rem] font-semibold text-ink">{(row.registeredCount || 0).toLocaleString()}</span>
              <span className="text-[0.68rem] text-mist">/ {(row.capacity || 0).toLocaleString()}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lavender">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600" style={{ width: `${width}%` }} />
            </div>
            <p className="mt-1 text-[0.66rem] text-mist">{row.seatsLeft} seat{row.seatsLeft === 1 ? "" : "s"} left</p>
          </div>
        );
      },
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/admin/events/${row.id}`} className="btn btn-ghost btn-sm" title="Open console">
            <LayoutDashboard size={13} /> Console
          </Link>
          <Link href={`/admin/events/${row.id}/edit`} className="btn btn-ghost btn-sm" title="Edit event">
            <Pencil size={13} />
          </Link>
          <button type="button" onClick={() => setConfirming(row)} className="btn btn-danger btn-sm" title="Cancel event">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Programme management"
        title="Events"
        description="Every campus event with live registration counts. Open the console to manage participants, attendance and the check-in QR."
        actions={
          <>
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/admin/events/new" className="btn btn-primary btn-sm">
              <CalendarPlus size={14} /> Create event
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="events" label="Events" value={events.length} hint={`${data?.total ?? 0} matching the current filters`} />
        <StatTile icon="registrations" label="Registration open" value={tiles.open} tone="emerald" hint="Accepting sign-ups now" />
        <StatTile icon="students" label="Seats filled" value={tiles.registered} tone="blue" hint={`out of ${tiles.capacity.toLocaleString()} seats`} />
        <StatTile
          icon="analytics"
          label="Average fill"
          value={`${pct(tiles.registered, tiles.capacity || 1)}%`}
          tone="amber"
          hint="Across the listed events"
        />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search title, venue, category…" />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
          <FilterSelect value={sort} onChange={setSort} options={SORT_OPTIONS} />
          <span className="ml-auto hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
            <Ticket size={13} /> {events.length} event{events.length === 1 ? "" : "s"}
          </span>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={events}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage="No events match these filters. Create one to get started."
          footer={
            <span className="inline-flex items-center gap-1.5">
              <TrendingUp size={12} /> Cancelling an event notifies registered students and frees their seats.
            </span>
          }
        />
      </Panel>

      <Modal
        open={Boolean(confirming)}
        onClose={() => (busy ? null : setConfirming(null))}
        title="Cancel this event?"
        description={confirming ? confirming.title : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)} disabled={busy}>
              Keep event
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={cancelEvent} disabled={busy}>
              {busy ? "Cancelling…" : "Cancel event"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          The event will be marked <strong>cancelled</strong> and removed from public listings. Students with approved
          registrations receive a notification. This action cannot be undone from this screen.
        </p>
      </Modal>
    </>
  );
}
