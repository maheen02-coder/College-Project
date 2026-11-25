"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  ExternalLink,
  Loader2,
  Save,
  Search,
  Trophy,
  Users2,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDateTime } from "@/lib/utils";

const POSITIONS = [
  ["none", "Unplaced"],
  ["winner", "Winner"],
  ["runner_up", "Runner-up"],
  ["second_runner_up", "2nd runner-up"],
  ["participant", "Participant"],
];

const POSITION_TONE = {
  winner: "text-amber-300",
  runner_up: "text-blue-300",
  second_runner_up: "text-emerald-300",
  participant: "text-mist",
  none: "text-mist",
};

const CERT_TYPES = [
  ["participation", "Participation"],
  ["winner", "Winner"],
  ["runner_up", "Runner-up"],
  ["achievement", "Achievement"],
];

export default function CompetitionWorkspace({
  competition,
  initialEntries,
  certificateMap,
  canManageResults,
  canIssueCertificates,
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [entries, setEntries] = useState(initialEntries);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [issued, setIssued] = useState(certificateMap);
  const [selected, setSelected] = useState([]);
  const [certType, setCertType] = useState("participation");
  const [issuing, setIssuing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [drafts, setDrafts] = useState(() =>
    Object.fromEntries(
      initialEntries.map((entry) => [
        entry.id,
        { score: entry.score ?? "", position: entry.position, status: entry.status },
      ])
    )
  );

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    if (!q) return entries;
    return entries.filter((entry) =>
      [entry.user.name, entry.user.email, entry.user.rollNumber, entry.teamName, entry.entryId]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [entries, query]);

  const updateDraft = (id, key, value) =>
    setDrafts((current) => ({ ...current, [id]: { ...current[id], [key]: value } }));

  const saveEntry = async (entry) => {
    const draft = drafts[entry.id];
    setBusy(entry.id);
    try {
      const res = await fetch(`/api/entries/${entry.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          score: draft.score === "" ? null : Number(draft.score),
          position: draft.position,
          status: draft.status,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not save result.", "error");
        return;
      }
      setEntries((current) =>
        current.map((item) =>
          item.id === entry.id
            ? { ...item, score: data.entry.score, position: data.entry.position, status: data.entry.status }
            : item
        )
      );
      toast(`Result saved for ${entry.teamName || entry.user.name}.`, "success");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
    }
  };

  const toggleLeaderboard = async () => {
    setPublishing(true);
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
      toast(competition.leaderboardPublished ? "Leaderboard hidden." : "Leaderboard published.", "success");
      router.refresh();
    } finally {
      setPublishing(false);
    }
  };

  const toggleSelected = (id) =>
    setSelected((current) => (current.includes(id) ? current.filter((value) => value !== id) : [...current, id]));

  const issue = async () => {
    const recipients = entries
      .filter((entry) => selected.includes(entry.id))
      .map((entry) => ({ userId: entry.user.id, type: certType }));
    if (!recipients.length) {
      toast("Select at least one entry.", "error");
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ competitionId: competition.id, recipients }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not issue certificates.", "error");
        return;
      }
      setIssued((current) => {
        const next = { ...current };
        for (const entry of entries.filter((item) => selected.includes(item.id))) {
          next[entry.user.id] = [...new Set([...(next[entry.user.id] || []), certType])];
        }
        return next;
      });
      setSelected([]);
      toast(
        `${data.created} certificate${data.created === 1 ? "" : "s"} issued${data.skipped.length ? ` · ${data.skipped.length} skipped` : ""}.`,
        "success"
      );
      router.refresh();
    } finally {
      setIssuing(false);
    }
  };

  const issueToPosition = async (position, type) => {
    const targets = entries.filter((entry) => entry.position === position && entry.status === "approved");
    if (!targets.length) {
      toast("No entries have this position yet.", "info");
      return;
    }
    setSelected(targets.map((entry) => entry.id));
    toast(`Selected ${targets.length} ${position.replace(/_/g, " ")} entries — choose a type and issue.`, "info");
    setCertType(type);
  };

  return (
    <div className="space-y-5">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
            {competition.poster ? <img src={competition.poster} alt="" className="h-full w-full object-cover" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={competition.status} kind="competition" dot />
              <span className="badge badge-slate">{competition.type}</span>
              <span className="badge badge-slate">
                {competition.mode === "team" ? `Team ${competition.teamSize.min}–${competition.teamSize.max}` : "Individual"}
              </span>
            </div>
            <h2 className="mt-2 truncate font-display text-xl font-semibold text-white">{competition.title}</h2>
            <p className="mt-1 text-[0.76rem] text-mist">
              {formatDateTime(competition.startAt)} · {competition.venue} · {entries.length}/{competition.capacity} entries
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-2">
            <Link href={`/competitions/${competition.slug}`} className="btn btn-ghost btn-sm">
              Public page <ExternalLink size={12} />
            </Link>
            <button
              type="button"
              onClick={toggleLeaderboard}
              disabled={publishing}
              className={competition.leaderboardPublished ? "btn btn-secondary btn-sm" : "btn btn-primary btn-sm"}
            >
              {publishing ? <Loader2 size={13} className="animate-spin" /> : <Trophy size={13} />}
              {competition.leaderboardPublished ? "Hide leaderboard" : "Publish leaderboard"}
            </button>
          </div>
        </div>
      </div>

      <div className="panel p-4 sm:p-5">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <div className="relative w-full sm:w-72">
            <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Search entries or teams…"
              className="field py-2 pl-9 text-[0.78rem]"
            />
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2 text-[0.7rem] text-mist">
            <button type="button" onClick={() => issueToPosition("winner", "winner")} className="underline-offset-4 hover:text-white hover:underline">
              Winner certs
            </button>
            <span className="text-white/15">|</span>
            <button type="button" onClick={() => issueToPosition("runner_up", "runner_up")} className="underline-offset-4 hover:text-white hover:underline">
              Runner-up certs
            </button>
          </div>
        </div>

        {!canManageResults ? (
          <p className="mb-4 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 text-[0.76rem] text-mist">
            You don't have result-management permission for this competition.
          </p>
        ) : null}

        {filtered.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
            No entries yet.
          </div>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
            <table className="table-console">
              <thead>
                <tr>
                  <th className="w-8" />
                  <th>Entry</th>
                  <th>Team / members</th>
                  <th className="w-24">Score</th>
                  <th className="w-40">Position</th>
                  <th className="w-32">Status</th>
                  <th>Certificates</th>
                  <th className="text-right">Save</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((entry) => {
                  const draft = drafts[entry.id];
                  return (
                    <tr key={entry.id}>
                      <td>
                        <input
                          type="checkbox"
                          checked={selected.includes(entry.id)}
                          onChange={() => toggleSelected(entry.id)}
                          aria-label={`Select ${entry.teamName || entry.user.name}`}
                          className="h-4 w-4 accent-violet-500"
                        />
                      </td>
                      <td>
                        <p className="font-medium text-white">{entry.teamName || entry.user.name}</p>
                        <p className="text-[0.66rem] text-mist">
                          {entry.entryId} · {entry.user.rollNumber || entry.user.email}
                        </p>
                      </td>
                      <td>
                        <p className="flex items-center gap-1.5 text-[0.72rem] text-white/80">
                          <Users2 size={11} /> {entry.members.length}
                          {entry.teamName ? ` · captain ${entry.user.name}` : ""}
                        </p>
                        {entry.submissionLink ? (
                          <a href={entry.submissionLink} target="_blank" rel="noreferrer" className="text-[0.66rem] text-blue-300 hover:text-white">
                            Submission
                          </a>
                        ) : null}
                      </td>
                      <td>
                        <input
                          type="number"
                          min={0}
                          max={1000}
                          value={draft.score}
                          onChange={(event) => updateDraft(entry.id, "score", event.target.value)}
                          placeholder="—"
                          className="w-20 rounded-lg border border-white/10 bg-[#0a0d1c] px-2 py-1 text-[0.76rem] text-white outline-none focus:border-violet-400/40"
                        />
                      </td>
                      <td>
                        <select
                          value={draft.position}
                          onChange={(event) => updateDraft(entry.id, "position", event.target.value)}
                          className={cn(
                            "w-full rounded-lg border border-white/10 bg-[#0a0d1c] px-2 py-1 text-[0.72rem] outline-none focus:border-violet-400/40",
                            POSITION_TONE[draft.position]
                          )}
                        >
                          {POSITIONS.map(([value, label]) => (
                            <option key={value} value={value}>
                              {label}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <select
                          value={draft.status}
                          onChange={(event) => updateDraft(entry.id, "status", event.target.value)}
                          className="w-full rounded-lg border border-white/10 bg-[#0a0d1c] px-2 py-1 text-[0.72rem] text-mist outline-none focus:border-violet-400/40"
                        >
                          {["approved", "pending", "rejected", "disqualified"].map((value) => (
                            <option key={value} value={value}>
                              {value}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td>
                        <div className="flex flex-wrap gap-1">
                          {(issued[entry.user.id] || []).length ? (
                            issued[entry.user.id].map((type) => (
                              <span key={type} className="badge badge-violet">
                                {type.replace(/_/g, " ")}
                              </span>
                            ))
                          ) : (
                            <span className="text-[0.68rem] text-mist">—</span>
                          )}
                        </div>
                      </td>
                      <td className="text-right">
                        <button
                          type="button"
                          onClick={() => saveEntry(entry)}
                          disabled={busy === entry.id || !canManageResults}
                          className="btn btn-secondary btn-sm"
                        >
                          {busy === entry.id ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />}
                          Save
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {canIssueCertificates ? (
          <div className="mt-4 flex flex-wrap items-end gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
            <div>
              <label className="mb-1.5 block text-[0.66rem] uppercase tracking-[0.16em] text-mist">
                Certificate type
              </label>
              <select value={certType} onChange={(event) => setCertType(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
                {CERT_TYPES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <button type="button" onClick={issue} disabled={issuing || selected.length === 0} className="btn btn-primary btn-sm disabled:opacity-50">
              {issuing ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
              Issue to selected ({selected.length})
            </button>
            <p className="text-[0.7rem] text-mist">
              Winners and runners-up should have a saved position before issuing award certificates.
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
