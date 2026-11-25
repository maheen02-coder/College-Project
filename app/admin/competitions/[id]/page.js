"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Award,
  Check,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Loader2,
  Pencil,
  RefreshCw,
  Trophy,
  Users,
  X,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
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
import { formatDateRange, formatDateTime, initials } from "@/lib/utils";

const POSITION_RANK = { winner: 0, runner_up: 1, second_runner_up: 2, participant: 3, none: 4 };
const WINNER_POSITIONS = ["winner", "runner_up", "second_runner_up"];

const ENTRY_STATUS_OPTIONS = [
  { value: "approved", label: "Approved" },
  { value: "pending", label: "Pending" },
  { value: "rejected", label: "Rejected" },
  { value: "disqualified", label: "Disqualified" },
];

function EntryStatus({ status }) {
  const tone =
    status === "approved" ? "emerald" : status === "pending" ? "amber" : status === "disqualified" || status === "rejected" ? "rose" : "slate";
  return <span className={`badge badge-${tone}`}>{String(status || "—").replace(/_/g, " ")}</span>;
}

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

export default function CompetitionConsolePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { toast } = useToast();
  const competitionApi = useApi(id ? `/api/competitions/${id}` : null);
  const entriesApi = useApi(id ? `/api/competitions/${id}/entries` : null);
  const [editing, setEditing] = useState(null);
  const [resultForm, setResultForm] = useState({ score: "", position: "none", status: "approved", remarks: "" });
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState("");
  const [publishConfirm, setPublishConfirm] = useState(null);
  const [publishing, setPublishing] = useState(false);

  const item = competitionApi.data?.item;
  const entries = entriesApi.data?.items || [];
  const canManage = entriesApi.data?.canManage !== false;

  const sorted = useMemo(() => {
    return entries
      .slice()
      .sort(
        (a, b) =>
          (POSITION_RANK[a.position] ?? 4) - (POSITION_RANK[b.position] ?? 4) ||
          (Number(b.score) || 0) - (Number(a.score) || 0) ||
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
      );
  }, [entries]);

  const stats = useMemo(() => {
    const approved = entries.filter((row) => row.status === "approved").length;
    const pending = entries.filter((row) => row.status === "pending").length;
    const winners = entries.filter((row) => WINNER_POSITIONS.includes(row.position)).length;
    return { approved, pending, winners };
  }, [entries]);

  const refresh = async () => {
    await Promise.all([competitionApi.reload(), entriesApi.reload()]);
  };

  function openEditor(entry) {
    setEditing(entry);
    setResultForm({
      score: entry.score === null || entry.score === undefined ? "" : String(entry.score),
      position: entry.position || "none",
      status: ENTRY_STATUS_OPTIONS.some((option) => option.value === entry.status) ? entry.status : "approved",
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
          score: resultForm.score === "" ? null : Number(resultForm.score),
          position: resultForm.position,
          status: resultForm.status,
          remarks: resultForm.remarks,
        }),
      });
      toast("Result saved. Entrants are notified of position changes.", "success", "Entry updated");
      setEditing(null);
      await refresh();
    } catch (err) {
      toast(err.message, "error", "Could not save result");
    } finally {
      setSaving(false);
    }
  }

  async function quickStatus(entry, status) {
    setBusyId(entry.id);
    try {
      await fetchJson(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      toast(`Entry ${status}.`, "success");
      await refresh();
    } catch (err) {
      toast(err.message, "error", "Update failed");
    } finally {
      setBusyId("");
    }
  }

  async function toggleLeaderboard(publish) {
    setPublishing(true);
    try {
      await fetchJson(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leaderboardPublished: publish }),
      });
      toast(
        publish
          ? "Leaderboard published. Points awarded and entrants notified."
          : "Leaderboard hidden from students.",
        "success",
        publish ? "Results published" : "Results unpublished"
      );
      setPublishConfirm(null);
      await refresh();
    } catch (err) {
      toast(err.message, "error", "Could not update leaderboard");
    } finally {
      setPublishing(false);
    }
  }

  function exportCsv() {
    const rows = [
      ["Entry ID", "Team", "Members", "Captain", "Roll number", "Status", "Score", "Position", "Remarks", "Submitted"],
      ...sorted.map((row) => [
        row.entryId,
        row.teamName || "Individual",
        row.members?.length || 1,
        row.user?.name || "",
        row.user?.rollNumber || "",
        row.status,
        row.score ?? "",
        POSITION_META[row.position]?.label || row.position,
        row.remarks || "",
        row.createdAt ? formatDateTime(row.createdAt) : "",
      ]),
    ];
    downloadCsv(`competition-${item?.slug || id}-entries.csv`, rows);
    toast(`${sorted.length} entry(s) exported.`, "info", "CSV ready");
  }

  const columns = [
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
      key: "members",
      label: "Members",
      render: (row) => (
        <div>
          <p className="inline-flex items-center gap-1.5 text-[0.78rem] text-ink-2">
            <Users size={13} className="text-purple" /> {row.members?.length || 1}
          </p>
          <p className="max-w-[14rem] truncate text-[0.66rem] text-mist">
            {(row.members || []).map((member) => member.name).join(", ") || row.user?.name}
          </p>
        </div>
      ),
    },
    {
      key: "captain",
      label: "Captain / entrant",
      render: (row) => (
        <div className="flex items-center gap-2">
          {row.user?.avatar ? (
            <img src={row.user.avatar} alt="" className="h-7 w-7 rounded-full object-cover" />
          ) : (
            <span className="grid h-7 w-7 place-items-center rounded-full bg-lilac text-[0.62rem] font-semibold text-purple">
              {initials(row.user?.name || "?")}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.78rem] font-medium text-ink">{row.user?.name || "Unknown"}</p>
            <p className="text-[0.66rem] text-mist">{row.user?.rollNumber || row.user?.department || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (row) => <EntryStatus status={row.status} /> },
    {
      key: "score",
      label: "Score",
      render: (row) => (
        <span className="text-[0.8rem] font-semibold text-ink">{row.score === null || row.score === undefined ? "—" : row.score}</span>
      ),
    },
    { key: "position", label: "Position", render: (row) => <StatusBadge kind="position" status={row.position || "none"} /> },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "pending" ? (
            <>
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2"
                title="Approve entry"
                disabled={busyId === row.id}
                onClick={() => quickStatus(row, "approved")}
              >
                <Check size={13} className="text-emerald-600" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2"
                title="Reject entry"
                disabled={busyId === row.id}
                onClick={() => quickStatus(row, "rejected")}
              >
                <X size={13} className="text-rose-600" />
              </button>
            </>
          ) : null}
          {row.submissionLink ? (
            <a href={row.submissionLink} target="_blank" rel="noreferrer" className="btn btn-ghost btn-sm !px-2" title="Open submission">
              <ExternalLink size={13} />
            </a>
          ) : null}
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => openEditor(row)} disabled={!canManage}>
            <Pencil size={13} /> Result
          </button>
        </div>
      ),
    },
  ];

  if (competitionApi.loading && !item) {
    return (
      <>
        <ConsoleHeading eyebrow="Competition console" title="Loading competition…" />
        <Skeleton className="h-40" />
        <Skeleton className="mt-5 h-[420px]" />
      </>
    );
  }

  if (competitionApi.error || !item) {
    return (
      <>
        <ConsoleHeading eyebrow="Competition console" title="Competition unavailable" />
        <Alert tone="error">{competitionApi.error || "Competition not found."}</Alert>
        <Link href="/admin/competitions" className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft size={14} /> Back to competitions
        </Link>
      </>
    );
  }

  return (
    <>
      <ConsoleHeading
        eyebrow="Competition console"
        title={item.title}
        description={`${item.type} · ${item.category}${item.society ? ` · ${item.society.name}` : ""}`}
        actions={
          <>
            <Link href="/admin/competitions" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Competitions
            </Link>
            {item.slug ? (
              <Link href={`/competitions/${item.slug}`} target="_blank" className="btn btn-ghost btn-sm">
                <ExternalLink size={14} /> Public page
              </Link>
            ) : null}
            <Link href={`/admin/competitions/${id}/edit`} className="btn btn-ghost btn-sm">
              <Pencil size={14} /> Edit
            </Link>
            <Link href={`/admin/certificates?competitionId=${id}`} className="btn btn-primary btn-sm">
              <Award size={14} /> Certificates for winners
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="competitions" label="Approved entries" value={stats.approved} hint={`${item.totalEntries ?? entries.length} total entries`} />
        <StatTile icon="applications" label="Pending review" value={stats.pending} tone="amber" hint="Awaiting approval" />
        <StatTile icon="certificates" label="On the podium" value={stats.winners} tone="emerald" hint="Winner & runner-up places" />
        <StatTile icon="students" label="Capacity" value={item.capacity || 0} tone="blue" hint={`${item.seatsLeft} slot(s) left`} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
        <div className="space-y-5">
          <Panel bodyClassName="p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="h-36 w-full rounded-2xl border border-line object-cover sm:w-56" />
              ) : (
                <div className="grid h-36 w-full place-items-center rounded-2xl bg-lavender text-purple sm:w-56">
                  <Trophy size={30} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="competition" status={item.status} dot />
                  <span className="badge badge-violet">{item.mode === "team" ? `Team · ${item.teamSize?.min}–${item.teamSize?.max}` : "Individual"}</span>
                  {item.leaderboardPublished ? <span className="badge badge-emerald">Leaderboard live</span> : <span className="badge badge-slate">Results draft</span>}
                </div>
                <p className="mt-3 text-[0.8rem] text-ink-2">{formatDateRange(item.startAt, item.endAt)}</p>
                <p className="mt-1 text-[0.78rem] text-mist">Venue · {item.venue}</p>
                <p className="mt-1 text-[0.78rem] text-mist">
                  Entries close {formatDateTime(item.registrationDeadline)}
                  {item.submissionDeadline ? ` · Submissions due ${formatDateTime(item.submissionDeadline)}` : ""}
                </p>
                <p className="mt-3 line-clamp-3 text-[0.78rem] leading-relaxed text-mist">{item.description}</p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Entries & results"
            description="Score entries, assign positions and review submissions."
            actions={
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!sorted.length}>
                  <Download size={13} /> CSV
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={entriesApi.loading}>
                  <RefreshCw size={13} className={entriesApi.loading ? "animate-spin" : ""} /> Refresh
                </button>
              </>
            }
          >
            <Toolbar>
              <span className="text-[0.72rem] text-mist">
                {entries.length} entr{entries.length === 1 ? "y" : "ies"} · sorted by position then score
              </span>
              {!canManage ? <span className="badge badge-amber">Read only — missing manage_competitions</span> : null}
            </Toolbar>
            <DataTable
              columns={columns}
              rows={sorted}
              loading={entriesApi.loading}
              error={entriesApi.error}
              rowKey={(row) => row.id}
              emptyMessage="No entries yet. Students will appear here once they enter."
              footer={<span>Publish the leaderboard from the panel on the right when scoring is complete.</span>}
            />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Results publishing" bodyClassName="p-5">
            <div className="space-y-3">
              <div className="flex items-center justify-between rounded-xl border border-line bg-ivory px-3.5 py-3">
                <div>
                  <p className="text-[0.8rem] font-semibold text-ink">Leaderboard</p>
                  <p className="text-[0.68rem] text-mist">{item.leaderboardPublished ? "Visible to all students" : "Hidden until published"}</p>
                </div>
                {item.leaderboardPublished ? <span className="badge badge-emerald">Live</span> : <span className="badge badge-slate">Draft</span>}
              </div>
              {item.leaderboardPublished ? (
                <button type="button" className="btn btn-ghost btn-sm w-full" onClick={() => setPublishConfirm({ publish: false })}>
                  <EyeOff size={13} /> Unpublish leaderboard
                </button>
              ) : (
                <button type="button" className="btn btn-primary btn-sm w-full" onClick={() => setPublishConfirm({ publish: true })}>
                  <Eye size={13} /> Publish leaderboard
                </button>
              )}
              <p className="text-[0.68rem] leading-relaxed text-mist">
                Publishing notifies every approved entrant and awards participation or win points. Set positions and scores first.
              </p>
            </div>
          </Panel>

          <Panel title="Prize & rules" bodyClassName="p-5">
            <p className="text-[0.78rem] leading-relaxed text-ink-2">{item.prizeDetails || "No prize details added."}</p>
            {item.rules?.length ? (
              <ul className="mt-3 list-disc space-y-1 pl-4 text-[0.74rem] text-mist">
                {item.rules.map((rule) => (
                  <li key={rule}>{rule}</li>
                ))}
              </ul>
            ) : null}
            <div className="mt-4 flex flex-wrap gap-2">
              {WINNER_POSITIONS.map((position) => {
                const count = entries.filter((row) => row.position === position).length;
                return (
                  <span key={position} className={`badge badge-${POSITION_META[position].tone}`}>
                    {POSITION_META[position].label} · {count}
                  </span>
                );
              })}
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={Boolean(editing)}
        onClose={() => (saving ? null : setEditing(null))}
        title="Edit entry result"
        description={editing ? `${editing.entryId} · ${editing.teamName || editing.user?.name}` : ""}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setEditing(null)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="result-form" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={13} className="animate-spin" /> : null} Save result
            </button>
          </>
        }
      >
        <form id="result-form" onSubmit={saveResult} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-3">
            <FormField label="Score" hint="0–1000, blank for none.">
              <input
                type="number"
                min={0}
                max={1000}
                step="0.5"
                value={resultForm.score}
                onChange={(e) => setResultForm((current) => ({ ...current, score: e.target.value }))}
                className="field"
                placeholder="—"
              />
            </FormField>
            <FormField label="Position">
              <select
                value={resultForm.position}
                onChange={(e) => setResultForm((current) => ({ ...current, position: e.target.value }))}
                className="field"
              >
                {Object.entries(POSITION_META).map(([value, meta]) => (
                  <option key={value} value={value}>
                    {meta.label}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Entry status">
              <select
                value={resultForm.status}
                onChange={(e) => setResultForm((current) => ({ ...current, status: e.target.value }))}
                className="field"
              >
                {ENTRY_STATUS_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </FormField>
          </div>
          <FormField label="Remarks" hint="Visible to the entrant with their result (max 500 characters).">
            <textarea
              value={resultForm.remarks}
              onChange={(e) => setResultForm((current) => ({ ...current, remarks: e.target.value }))}
              maxLength={500}
              rows={3}
              className="field resize-y"
              placeholder="Judges' feedback, tie-break notes…"
            />
          </FormField>
          {editing?.submissionLink ? (
            <div className="rounded-xl border border-line bg-ivory px-3.5 py-3">
              <p className="text-[0.7rem] font-semibold uppercase tracking-wide text-mist">Submission</p>
              <a href={editing.submissionLink} target="_blank" rel="noreferrer" className="mt-1 inline-flex items-center gap-1.5 break-all text-[0.76rem] text-blue hover:underline">
                <ExternalLink size={12} /> {editing.submissionLink}
              </a>
            </div>
          ) : null}
          <Alert tone="info">Position changes notify the entrant immediately, even before the leaderboard is published.</Alert>
        </form>
      </Modal>

      <Modal
        open={Boolean(publishConfirm)}
        onClose={() => (publishing ? null : setPublishConfirm(null))}
        title={publishConfirm?.publish ? "Publish leaderboard?" : "Unpublish leaderboard?"}
        description={item.title}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setPublishConfirm(null)} disabled={publishing}>
              Cancel
            </button>
            <button
              type="button"
              className={publishConfirm?.publish ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"}
              onClick={() => toggleLeaderboard(Boolean(publishConfirm?.publish))}
              disabled={publishing}
            >
              {publishing ? "Working…" : publishConfirm?.publish ? "Publish results" : "Hide leaderboard"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          {publishConfirm?.publish
            ? "Scores and positions become visible on the public competition page. Every approved entrant is notified and points are awarded once."
            : "Students will no longer see the leaderboard. Points already awarded are not reversed."}
        </p>
      </Modal>
    </>
  );
}
