"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  LayoutDashboard,
  Pencil,
  Plus,
  RefreshCw,
  Trophy,
  Trash2,
  Users,
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
  fetchJson,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { COMPETITION_CATEGORIES, COMPETITION_TYPES } from "@/lib/constants";
import { formatDateRange, pct } from "@/lib/utils";

function Poster({ src }) {
  if (src) {
    return <img src={src} alt="" loading="lazy" className="h-11 w-16 shrink-0 rounded-lg border border-line object-cover" />;
  }
  return (
    <span className="grid h-11 w-16 shrink-0 place-items-center rounded-lg border border-line bg-lavender text-purple">
      <Trophy size={17} />
    </span>
  );
}

export default function AdminCompetitionsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [category, setCategory] = useState("");
  const [confirming, setConfirming] = useState(null);
  const [busy, setBusy] = useState(false);
  const debounced = useDebounced(search, 300);

  const url = useMemo(() => {
    const params = new URLSearchParams({ scope: "all", limit: "60" });
    if (type) params.set("type", type);
    if (category) params.set("category", category);
    if (debounced.trim()) params.set("q", debounced.trim());
    return `/api/competitions?${params.toString()}`;
  }, [type, category, debounced]);

  const { data, loading, error, reload } = useApi(url);
  const competitions = data?.items || [];

  const tiles = useMemo(() => {
    const open = competitions.filter((row) => row.status === "registration_open").length;
    const entries = competitions.reduce((sum, row) => sum + (row.entryCount || 0), 0);
    const published = competitions.filter((row) => row.leaderboardPublished).length;
    return { open, entries, published };
  }, [competitions]);

  async function cancelCompetition() {
    if (!confirming) return;
    setBusy(true);
    try {
      await fetchJson(`/api/competitions/${confirming.id}`, { method: "DELETE" });
      toast("Competition cancelled and entrants notified.", "success", "Competition cancelled");
      setConfirming(null);
      await reload();
    } catch (err) {
      toast(err.message, "error", "Could not cancel competition");
    } finally {
      setBusy(false);
    }
  }

  const columns = [
    {
      key: "competition",
      label: "Competition",
      render: (row) => (
        <div className="flex items-center gap-3">
          <Poster src={row.poster} />
          <div className="min-w-0">
            <p className="truncate text-[0.83rem] font-semibold text-ink">{row.title}</p>
            <p className="mt-0.5 text-[0.72rem] text-mist">
              {row.type} · {row.category}
            </p>
            {row.society ? <p className="text-[0.68rem] text-purple">{row.society.name}</p> : null}
          </div>
        </div>
      ),
    },
    {
      key: "mode",
      label: "Format",
      render: (row) => (
        <div className="flex flex-col items-start gap-1">
          <span className={`badge ${row.mode === "team" ? "badge-violet" : "badge-blue"}`}>
            {row.mode === "team" ? "Team" : "Solo"}
          </span>
          <span className="text-[0.68rem] text-mist">
            {row.mode === "team" ? `${row.teamSize?.min}–${row.teamSize?.max} members` : "1 participant"}
          </span>
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
            Entries close {row.registrationDeadline ? new Date(row.registrationDeadline).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) : "—"}
          </p>
        </div>
      ),
    },
    {
      key: "entries",
      label: "Entries",
      render: (row) => {
        const width = pct(row.entryCount || 0, row.capacity || 1);
        return (
          <div className="w-28">
            <div className="flex items-baseline justify-between">
              <span className="text-[0.78rem] font-semibold text-ink">{(row.entryCount || 0).toLocaleString()}</span>
              <span className="text-[0.68rem] text-mist">/ {(row.capacity || 0).toLocaleString()}</span>
            </div>
            <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-lavender">
              <div className="h-full rounded-full bg-gradient-to-r from-violet-600 to-blue-600" style={{ width: `${width}%` }} />
            </div>
            {row.pendingCount ? <p className="mt-1 text-[0.66rem] text-amber-700">{row.pendingCount} pending</p> : null}
          </div>
        );
      },
    },
    {
      key: "leaderboard",
      label: "Leaderboard",
      render: (row) =>
        row.leaderboardPublished ? (
          <span className="badge badge-emerald">Published</span>
        ) : (
          <span className="badge badge-slate">Draft</span>
        ),
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge kind="competition" status={row.status} dot /> },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1.5">
          <Link href={`/admin/competitions/${row.id}`} className="btn btn-ghost btn-sm">
            <LayoutDashboard size={13} /> Console
          </Link>
          <Link href={`/admin/competitions/${row.id}/edit`} className="btn btn-ghost btn-sm" title="Edit competition">
            <Pencil size={13} />
          </Link>
          <button type="button" onClick={() => setConfirming(row)} className="btn btn-danger btn-sm" title="Cancel competition">
            <Trash2 size={13} />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Competitions & results"
        title="Competitions"
        description="Manage quiz, debate, sports and creative competitions. Review entries, score results and publish leaderboards."
        actions={
          <>
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <Link href="/admin/competitions/new" className="btn btn-primary btn-sm">
              <Plus size={14} /> Create competition
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="competitions" label="Competitions" value={competitions.length} hint={`${data?.total ?? 0} total in scope`} />
        <StatTile icon="events" label="Registration open" value={tiles.open} tone="emerald" hint="Accepting entries" />
        <StatTile icon="students" label="Approved entries" value={tiles.entries} tone="blue" hint="Across listed competitions" />
        <StatTile icon="analytics" label="Leaderboards live" value={tiles.published} tone="amber" hint="Results visible to students" />
      </div>

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search title, prize, venue…" />
          <FilterSelect
            value={type}
            onChange={setType}
            options={COMPETITION_TYPES.map((item) => ({ value: item, label: item }))}
            placeholder="All types"
          />
          <FilterSelect
            value={category}
            onChange={setCategory}
            options={COMPETITION_CATEGORIES.map((item) => ({ value: item, label: item }))}
            placeholder="All categories"
          />
          <span className="ml-auto hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
            <Users size={13} /> {competitions.length} listed
          </span>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={competitions}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage="No competitions match these filters. Create one to get started."
          footer={
            <span className="inline-flex items-center gap-1.5">
              <ArrowUpRight size={12} /> Publishing a leaderboard awards points and notifies every entrant.
            </span>
          }
        />
      </Panel>

      <Modal
        open={Boolean(confirming)}
        onClose={() => (busy ? null : setConfirming(null))}
        title="Cancel this competition?"
        description={confirming ? confirming.title : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)} disabled={busy}>
              Keep competition
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={cancelCompetition} disabled={busy}>
              {busy ? "Cancelling…" : "Cancel competition"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          The competition is marked <strong>cancelled</strong> and all pending and approved entrants are notified. Results and
          entries are retained for your records.
        </p>
      </Modal>
    </>
  );
}
