"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Award,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  RefreshCw,
  Trophy,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  FormField,
  Modal,
  Panel,
  Skeleton,
  StatTile,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { POSITION_META } from "@/lib/constants";
import { formatDate, formatDateTime } from "@/lib/utils";

const POSITION_RANK = { winner: 0, runner_up: 1, second_runner_up: 2, participant: 3, none: 4 };
const WINNER_POSITIONS = ["winner", "runner_up", "second_runner_up"];

function downloadCsv(filename, rows) {
  const content = rows
    .map((cells) => cells.map((cell) => `"${String(cell ?? "").replace(/"/g, '""')}"`).join(","))
    .join("\r\n");
  const blob = new Blob([`\uFEFF${content}`], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

export default function AdminResultsPage() {
  const toast = useToast();
  const [competitionId, setCompetitionId] = useState("");
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ score: "", position: "none", status: "approved", remarks: "" });
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(null);
  const [publishing, setPublishing] = useState(false);
  const [filter, setFilter] = useState("all");

  const competitionsApi = useApi("/api/competitions?scope=all&limit=60");
  const competitionApi = useApi(competitionId ? `/api/competitions/${competitionId}` : null);
  const entriesApi = useApi(competitionId ? `/api/competitions/${competitionId}/entries` : null);

  const competitions = competitionsApi.data?.items || [];
  const competition = competitionApi.data?.item;
  const entries = entriesApi.data?.items || [];

  const sorted = useMemo(() => {
    return entries
      .slice()
      .sort(
        (a, b) =>
          (POSITION_RANK[a.position] ?? 4) - (POSITION_RANK[b.position] ?? 4) ||
          (Number(b.score) || 0) - (Number(a.score) || 0)
      );
  }, [entries]);

  const visible = useMemo(() => {
    if (filter === "all") return sorted;
    if (filter === "winners") return sorted.filter((row) => WINNER_POSITIONS.includes(row.position));
    if (filter === "scored") return sorted.filter((row) => row.score !== null && row.score !== undefined);
    return sorted.filter((row) => row.position === filter);
  }, [sorted, filter]);

  const stats = useMemo(() => {
    const scored = entries.filter((row) => row.score !== null && row.score !== undefined).length;
    const winners = entries.filter((row) => WINNER_POSITIONS.includes(row.position)).length;
    return { scored, winners };
  }, [entries]);

  function openEditor(entry) {
    setEditing(entry);
    setForm({
      score: entry.score === null || entry.score === undefined ? "" : String(entry.score),
      position: entry.position || "none",
      status: ["approved", "pending", "rejected", "disqualified"].includes(entry.status) ? entry.status : "approved",
      remarks: entry.remarks || "",
    });
  }

  async function saveResult(event) {
    event.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await fetchJson(`/api/entries/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: form.score === "" ? null : Number(form.score),
          position: form.position,
          status: form.status,
          remarks: form.remarks,
        }),
      });
      toast("Result saved and the entrant notified.", "success", "Entry updated");
      setEditing(null);
      await Promise.all([entriesApi.reload(), competitionApi.reload()]);
    } catch (err) {
      toast(err.message, "error", "Could not save result");
    } finally {
      setSaving(false);
    }
  }

  async function toggleLeaderboard(publish) {
    setPublishing(true);
    try {
      await fetchJson(`/api/competitions/${competitionId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardPublished: publish }),
      });
      toast(publish ? "Leaderboard published to students." : "Leaderboard hidden.", "success");
      setConfirming(null);
      await Promise.all([competitionApi.reload(), entriesApi.reload()]);
    } catch (err) {
      toast(err.message, "error", "Could not update leaderboard");
    } finally {
      setPublishing(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["Entry ID", "Team", "Captain", "Roll", "Status", "Score", "Position", "Remarks"],
      ...visible.map((row) => [
        row.entryId,
        row.teamName || "Individual",
        row.user?.name || "",
        row.user?.rollNumber || "",
        row.status,
        row.score ?? "",
        POSITION_META[row.position]?.label || row.position,
        row.remarks || "",
      ]),
    ];
    downloadCsv(`results-${competition?.slug || competitionId}.csv`, rows);
    toast(`${visible.length} row(s) exported.`, "info", "CSV ready");
  }

  const columns = [
    {
      key: "rank",
      label: "#",
      width: "2.5rem",
      render: (row) => {
        const index = sorted.findIndex((entry) => entry.id === row.id);
        return <span className="font-display text-[0.85rem] font-bold text-purple">{index + 1}</span>;
      },
    },
    {
      key: "entry",
      label: "Entry",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate text-[0.82rem] font-semibold text-ink">{row.teamName || row.user?.name || "Individual entry"}</p>
          <p className="mt-0.5 font-mono text-[0.66rem] text-mist">{row.entryId}</p>
        </div>
      ),
    },
    {
      key: "captain",
      label: "Captain",
      render: (row) => (
        <div>
          <p className="text-[0.78rem] text-ink-2">{row.user?.name || "Unknown"}</p>
          <p className="text-[0.66rem] text-mist">{row.user?.rollNumber || row.user?.department || "—"}</p>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span
          className={`badge badge-${
            row.status === "approved" ? "emerald" : row.status === "pending" ? "amber" : row.status === "rejected" || row.status === "disqualified" ? "rose" : "slate"
          }`}
        >
          {String(row.status || "—").replace(/_/g, " ")}
        </span>
      ),
    },
    {
      key: "score",
      label: "Score",
      render: (row) => (
        <span className="text-[0.82rem] font-semibold text-ink">{row.score === null || row.score === undefined ? "—" : row.score}</span>
      ),
    },
    { key: "position", label: "Position", render: (row) => <StatusBadge kind="position" status={row.position || "none"} /> },
    {
      key: "remarks",
      label: "Remarks",
      render: (row) => <span className="block max-w-[16rem] truncate text-[0.72rem] text-mist">{row.remarks || "—"}</span>,
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.submissionLink ? (
            <a href={row.submissionLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm !px-2" title="Open submission">
              <ExternalLink size={13} />
            </a>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditor(row)}>
            <Pencil size={13} /> Edit
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Competitions & results"
        title="Results"
        description="Score entries, assign positions and publish the leaderboard. Positions are ranked winner → runner-up → second runner-up."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => entriesApi.reload()} disabled={!competitionId || entriesApi.loading}>
            <RefreshCw size={14} className={entriesApi.loading ? "animate-spin" : ""} /> Refresh entries
          </button>
        }
      />

      <Panel className="mb-5">
        <Toolbar className="!border-b-0">
          <FilterSelect
            value={competitionId}
            onChange={(value) => {
              setCompetitionId(value);
              setFilter("all");
            }}
            options={competitions.map((row) => ({ value: row.id, label: `${row.title} · ${formatDate(row.startAt)}` }))}
            placeholder={competitionsApi.loading ? "Loading competitions…" : "Select a competition"}
            className="!max-w-[24rem]"
          />
          {competition ? (
            <Link href={`/admin/competitions/${competition.id}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={13} /> Competition console
            </Link>
          ) : (
            <span className="text-[0.72rem] text-mist">Choose a competition to load its entries and results.</span>
          )}
          {competition ? (
            <span className={`badge ${competition.leaderboardPublished ? "badge-emerald" : "badge-slate"}`}>
              {competition.leaderboardPublished ? "Leaderboard live" : "Leaderboard draft"}
            </span>
          ) : null}
        </Toolbar>
      </Panel>

      {competitionsApi.error ? (
        <div className="mb-4">
          <Alert tone="error">{competitionsApi.error}</Alert>
        </div>
      ) : null}

      {!competitionId ? (
        <Panel bodyClassName="px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-purple">
            <Trophy size={24} />
          </span>
          <h3 className="mt-3 text-[0.95rem] font-semibold text-ink">No competition selected</h3>
          <p className="mx-auto mt-1 max-w-md text-[0.8rem] leading-relaxed text-mist">
            Pick a competition above to edit scores, change positions and control whether results are visible to students.
          </p>
        </Panel>
      ) : entriesApi.loading && !entries.length ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-[420px]" />
        </div>
      ) : entriesApi.error ? (
        <Alert tone="error">{entriesApi.error}</Alert>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="competitions" label="Entries" value={entries.length} hint={competition?.title || ""} />
            <StatTile icon="analytics" label="Scored" value={stats.scored} tone="blue" hint={`${entries.length - stats.scored} awaiting a score`} />
            <StatTile icon="certificates" label="Podium places" value={stats.winners} tone="amber" hint="Winner & runners-up" />
            <StatTile icon="events" label="Capacity" value={competition?.capacity || 0} tone="emerald" hint="Maximum entries" />
          </div>

          <Panel
            title="Leaderboard editor"
            description="Changes notify entrants immediately. Publish once the order is final."
            actions={
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!visible.length}>
                  <Download size={13} /> CSV
                </button>
                {competition?.leaderboardPublished ? (
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming({ publish: false })}>
                    <EyeOff size={13} /> Unpublish
                  </button>
                ) : (
                  <button type="button" className="btn btn-primary btn-sm" onClick={() => setConfirming({ publish: true })}>
                    <Eye size={13} /> Publish leaderboard
                  </button>
                )}
              </>
            }
          >
            <Toolbar>
              <FilterSelect
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All entries" },
                  { value: "winners", label: "Podium only" },
                  { value: "scored", label: "Scored entries" },
                  { value: "participant", label: "Participants" },
                  { value: "none", label: "Unplaced" },
                ]}
              />
              <span className="text-[0.72rem] text-mist">
                {visible.length} of {sorted.length} entries
              </span>
              {competition?.leaderboardPublished ? (
                <Link href={`/admin/certificates?competitionId=${competitionId}`} className="btn btn-ghost btn-sm ml-auto">
                  <Award size={13} /> Issue winner certificates
                </Link>
              ) : null}
            </Toolbar>
            <DataTable
              columns={columns}
              rows={visible}
              loading={entriesApi.loading}
              error={entriesApi.error}
              rowKey={(row) => row.id}
              emptyMessage="No entries to score yet."
              footer={<span>Sorted by position, then score. Publishing awards points once per entrant.</span>}
            />
          </Panel>
        </>
      )}

      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? null : setEditing(null))}
        title="Edit result"
        description={editing ? `${editing.entryId} · ${editing.teamName || editing.user?.name}` : ""}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="inline-result-form" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : null} Save result
            </button>
          </>
        }
      >
        <form id="inline-result-form" onSubmit={saveResult} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Score" hint="0–1000, blank clears the score.">
              <input
                type="number"
                min={0}
                max={1000}
                step="0.5"
                value={form.score}
                onChange={(e) => setForm((current) => ({ ...current, score: e.target.value }))}
                className="field"
                placeholder="—"
              />
            </FormField>
            <FormField label="Position">
              <select value={form.position} onChange={(e) => setForm((current) => ({ ...current, position: e.target.value }))} className="field">
                {Object.entries(POSITION_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Entry status">
              <select value={form.status} onChange={(e) => setForm((current) => ({ ...current, status: e.target.value }))} className="field">
                <option value="approved">Approved</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="disqualified">Disqualified</option>
              </select>
            </FormField>
          </div>
          <FormField label="Remarks" hint="Shared with the entrant (max 500 characters).">
            <textarea
              value={form.remarks}
              onChange={(e) => setForm((current) => ({ ...current, remarks: e.target.value }))}
              maxLength={500}
              rows={3}
              className="field resize-y"
            />
          </FormField>
          {editing?.createdAt ? (
            <p className="text-[0.7rem] text-mist">Entered {formatDateTime(editing.createdAt)}</p>
          ) : null}
        </form>
      </Modal>

      <Modal
        open={Boolean(confirming)}
        onClose={() => (publishing ? null : setConfirming(null))}
        title={confirming?.publish ? "Publish leaderboard?" : "Unpublish leaderboard?"}
        description={competition?.title || ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setConfirming(null)} disabled={publishing}>
              Cancel
            </button>
            <button
              type="button"
              className={confirming?.publish ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"}
              onClick={() => toggleLeaderboard(Boolean(confirming?.publish))}
              disabled={publishing}
            >
              {publishing ? "Working…" : confirming?.publish ? "Publish results" : "Hide leaderboard"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          {confirming?.publish
            ? "Scores and positions become public. All approved entrants are notified and participation or win points are awarded."
            : "The leaderboard will be hidden from students. Points already awarded stay on their profiles."}
        </p>
      </Modal>
    </>
  );
}
