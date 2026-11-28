"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, Search, Trophy, Users2 } from "lucide-react";
import {
  ChipTabs,
  ConsoleHeading,
  Modal,
  Panel,
  SearchBox,
  Skeleton,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { formatDate } from "@/lib/utils";

const ENTRY_STATUS_META = {
  pending: { label: "Pending review", tone: "amber" },
  approved: { label: "Approved", tone: "emerald" },
  rejected: { label: "Rejected", tone: "rose" },
  withdrawn: { label: "Withdrawn", tone: "slate" },
  disqualified: { label: "Disqualified", tone: "rose" },
};

function EntryCard({ entry, onWithdraw }) {
  const competition = entry.competition;
  const meta = ENTRY_STATUS_META[entry.status] || { label: entry.status, tone: "slate" };
  const open = competition && competition.status === "registration_open";
  const canWithdraw = open && ["pending", "approved"].includes(entry.status);

  return (
    <article className="card overflow-hidden">
      <div className="relative h-32 w-full bg-gradient-to-br from-lilac via-lavender to-blue-50">
        {competition.poster ? (
          <img loading="lazy" decoding="async" src={competition.poster} alt="" className="h-full w-full object-cover" />
        ) : (
          <div className="grid h-full w-full place-items-center text-purple/70">
            <Trophy size={34} />
          </div>
        )}
        <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
          <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
          {entry.position && entry.position !== "none" ? <StatusBadge status={entry.position} kind="position" /> : null}
        </div>
      </div>

      <div className="space-y-3 p-4">
        <div>
          <Link href={`/competitions/${competition.slug}`} className="font-display text-[0.98rem] font-semibold leading-snug text-ink hover:text-purple">
            {competition.title}
          </Link>
          <p className="mt-1 text-[0.7rem] text-mist">
            <span className="font-mono">{entry.entryId}</span> · {competition.category || competition.type}
          </p>
        </div>

        <div className="grid grid-cols-2 gap-2 rounded-xl border border-line bg-lavender/40 px-3 py-2.5 text-[0.72rem]">
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Team</p>
            <p className="mt-0.5 truncate font-medium text-ink">{entry.teamName || "Solo entry"}</p>
          </div>
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Members</p>
            <p className="mt-0.5 inline-flex items-center gap-1 font-medium text-ink">
              <Users2 size={12} className="text-purple" /> {entry.members?.length || 1}
            </p>
          </div>
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Score</p>
            <p className="mt-0.5 font-medium text-ink">{entry.score === null || entry.score === undefined ? "Not published" : entry.score}</p>
          </div>
          <div>
            <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Position</p>
            <p className="mt-0.5 font-medium text-ink capitalize">{entry.position === "none" || !entry.position ? "Unplaced" : entry.position.replace(/_/g, " ")}</p>
          </div>
        </div>

        <p className="inline-flex items-center gap-1.5 text-[0.7rem] text-mist">
          <CalendarDays size={12} className="text-purple" /> {formatDate(competition.startAt)}
        </p>

        {entry.remarks ? (
          <p className="rounded-xl bg-blue-50/70 px-3 py-2 text-[0.72rem] leading-relaxed text-blue-800">{entry.remarks}</p>
        ) : null}

        <div className="flex items-center gap-2 pt-0.5">
          <Link href={`/competitions/${competition.slug}`} className="btn btn-ghost btn-sm flex-1">
            View competition <ArrowUpRight size={12} />
          </Link>
          {canWithdraw ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => onWithdraw(entry)}>
              Withdraw
            </button>
          ) : null}
        </div>
      </div>
    </article>
  );
}

export default function MyCompetitionsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/entries");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const items = useMemo(() => (data?.items || []).filter((entry) => entry.competition), [data]);
  const counts = useMemo(() => {
    const map = { all: items.length };
    for (const item of items) map[item.status] = (map[item.status] || 0) + 1;
    return map;
  }, [items]);

  const tabs = ["all", "pending", "approved", "rejected", "withdrawn", "disqualified"]
    .map((key) => ({
      value: key,
      label: key === "all" ? `All (${counts.all || 0})` : `${ENTRY_STATUS_META[key]?.label || key} (${counts[key] || 0})`,
    }))
    .filter((tab) => tab.value === "all" || counts[tab.value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((entry) => {
      if (status !== "all" && entry.status !== status) return false;
      if (!query) return true;
      return [entry.competition.title, entry.teamName, entry.entryId, entry.competition.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, status, search]);

  const withdraw = async () => {
    if (!target) return;
    setBusy(true);
    try {
      await fetchJson(`/api/entries/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "withdraw" }),
      });
      toast("Your competition entry has been withdrawn.", "success", "Entry withdrawn");
      setTarget(null);
      await reload();
    } catch (err) {
      toast(err.message || "Could not withdraw this entry.", "error");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <ConsoleHeading
        eyebrow="Competition record"
        title="My competitions"
        description="Solo and team entries, review status, published results and withdrawal windows."
        actions={
          <Link href="/competitions" className="btn btn-primary btn-sm">
            <Trophy size={14} /> Discover competitions
          </Link>
        }
      />

      <Panel bodyClassName="p-0">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search competitions or teams…" />
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs.length ? tabs : [{ value: "all", label: "All (0)" }]} value={status} onChange={setStatus} />
          </div>
        </Toolbar>

        {loading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-80" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={status === "all" ? Trophy : Search}
            title={status === "all" ? "No competition entries yet" : "Nothing in this view"}
            description={
              status === "all"
                ? "Enter a quiz, debate, coding challenge or sports fixture — solo or with a team."
                : "Try another status filter or clear your search."
            }
            action={
              status === "all" ? (
                <Link href="/competitions" className="btn btn-primary btn-sm">Browse competitions</Link>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStatus("all"); setSearch(""); }}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((entry) => (
              <EntryCard key={entry.id} entry={entry} onWithdraw={setTarget} />
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => (busy ? null : setTarget(null))}
        title="Withdraw this entry?"
        description={target?.competition?.title}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTarget(null)} disabled={busy}>
              Keep entry
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={withdraw} disabled={busy}>
              {busy ? "Withdrawing…" : "Withdraw entry"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-mist">
          Your entry <span className="font-mono text-ink-2">{target?.entryId}</span> will be marked as withdrawn. This
          cannot be undone after the registration deadline.
        </p>
      </Modal>
    </>
  );
}
