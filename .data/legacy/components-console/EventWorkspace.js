"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Award,
  CheckCircle2,
  ClipboardCheck,
  Download,
  ExternalLink,
  Loader2,
  Search,
  Users2,
  XCircle,
} from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDate, formatDateTime } from "@/lib/utils";

const TABS = [
  { key: "participants", label: "Participants", icon: Users2 },
  { key: "attendance", label: "Attendance", icon: ClipboardCheck },
  { key: "certificates", label: "Certificates", icon: Award },
];

const CERT_TYPES = [
  ["participation", "Participation"],
  ["winner", "Winner"],
  ["runner_up", "Runner-up"],
  ["achievement", "Achievement"],
];

const ATTENDANCE_TONE = {
  present: "badge-emerald",
  absent: "badge-rose",
  unmarked: "badge-slate",
};

export default function EventWorkspace({ event, initialRegistrations, certificateMap, canManageAttendance, canIssueCertificates }) {
  const router = useRouter();
  const { toast } = useToast();
  const [tab, setTab] = useState("participants");
  const [rows, setRows] = useState(initialRegistrations);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [issued, setIssued] = useState(certificateMap);
  const [selected, setSelected] = useState([]);
  const [certType, setCertType] = useState("participation");
  const [issuing, setIssuing] = useState(false);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return rows.filter((row) => {
      if (statusFilter !== "all" && row.status !== statusFilter) return false;
      if (!q) return true;
      return [row.user.name, row.user.email, row.user.rollNumber, row.user.department, row.registrationId]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [rows, query, statusFilter]);

  const present = rows.filter((row) => row.attendance === "present").length;
  const absent = rows.filter((row) => row.attendance === "absent").length;
  const unmarked = rows.filter((row) => row.attendance === "unmarked" && ["approved", "attended", "absent"].includes(row.status)).length;
  const eligible = rows.filter((row) => ["approved", "attended"].includes(row.status));

  const patchRegistration = async (row, body, message) => {
    setBusy(row.id);
    try {
      const res = await fetch(`/api/registrations/${row.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update registration.", "error");
        return;
      }
      setRows((current) =>
        current.map((item) =>
          item.id === row.id
            ? { ...item, status: data.registration.status, attendance: data.registration.attendance }
            : item
        )
      );
      toast(message, "success");
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
      router.refresh();
    }
  };

  const mark = (row, attendance) =>
    patchRegistration(
      row,
      { attendance },
      attendance === "present" ? `${row.user.name} marked present.` : attendance === "absent" ? `${row.user.name} marked absent.` : "Attendance reset."
    );

  const exportCsv = () => {
    const header = ["Name", "Roll number", "Email", "Department", "Status", "Attendance", "Registration ID", "Registered at"];
    const lines = filtered.map((row) =>
      [
        row.user.name,
        row.user.rollNumber,
        row.user.email,
        row.user.department,
        row.status,
        row.attendance,
        row.registrationId,
        row.registeredAt,
      ]
        .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${event.slug}-participants.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const toggleSelected = (userId) => {
    setSelected((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId]
    );
  };

  const issue = async (recipients, type = certType) => {
    if (!recipients.length) {
      toast("Select at least one recipient.", "error");
      return;
    }
    setIssuing(true);
    try {
      const res = await fetch("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event.id,
          recipients: recipients.map((userId) => ({ userId, type })),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not issue certificates.", "error");
        return;
      }
      setIssued((current) => {
        const next = { ...current };
        for (const userId of recipients) {
          next[userId] = [...new Set([...(next[userId] || []), type])];
        }
        return next;
      });
      setSelected([]);
      toast(
        `${data.created} certificate${data.created === 1 ? "" : "s"} issued${data.skipped.length ? ` · ${data.skipped.length} skipped` : ""}.`,
        "success"
      );
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setIssuing(false);
    }
  };

  const issueAllAttended = async () => {
    const recipients = eligible
      .filter((row) => row.attendance === "present" || row.status === "attended")
      .filter((row) => !(issued[row.user.id] || []).includes("participation"))
      .map((row) => row.user.id);
    if (!recipients.length) {
      toast("No eligible participants without a participation certificate.", "info");
      return;
    }
    await issue(recipients, "participation");
  };

  return (
    <div className="space-y-5">
      <div className="panel overflow-hidden">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
          <span className="h-20 w-32 shrink-0 overflow-hidden rounded-xl bg-white/[0.04]">
            {event.poster ? <img src={event.poster} alt="" className="h-full w-full object-cover" /> : null}
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge status={event.status} dot />
              <span className="badge badge-slate">{event.category}</span>
              <span className="badge badge-slate">{event.type}</span>
            </div>
            <h2 className="mt-2 truncate font-display text-xl font-semibold text-white">{event.title}</h2>
            <p className="mt-1 text-[0.76rem] text-mist">
              {formatDateTime(event.startAt)} · {event.venue} · {rows.length}/{event.capacity} registrations
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm">
              Public page <ExternalLink size={12} />
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-2 divide-x divide-white/[0.05] border-t border-white/[0.06] sm:grid-cols-4">
          {[
            ["Registrations", rows.filter((row) => ["pending", "approved", "attended", "absent"].includes(row.status)).length],
            ["Present", present],
            ["Absent", absent],
            ["Unmarked", unmarked],
          ].map(([label, value]) => (
            <div key={label} className="px-4 py-3">
              <p className="text-[0.62rem] uppercase tracking-[0.16em] text-mist">{label}</p>
              <p className="mt-1 font-display text-lg font-semibold text-white">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="panel">
        <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] px-3 pt-3">
          {TABS.map((item) => (
            <button
              key={item.key}
              type="button"
              onClick={() => setTab(item.key)}
              className={cn(
                "flex items-center gap-1.5 rounded-t-lg px-3.5 py-2 text-[0.78rem] font-medium transition",
                tab === item.key
                  ? "bg-white/[0.05] text-white shadow-[inset_0_-2px_0_0_rgba(139,92,246,0.9)]"
                  : "text-mist hover:text-white"
              )}
            >
              <item.icon size={13} /> {item.label}
            </button>
          ))}
          <button type="button" onClick={exportCsv} className="btn btn-ghost btn-sm mb-1 ml-auto">
            <Download size={13} /> Export CSV
          </button>
        </div>

        <div className="p-4 sm:p-5">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <div className="relative w-full sm:w-72">
              <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
              <input
                value={query}
                onChange={(event_) => setQuery(event_.target.value)}
                placeholder="Search participants…"
                className="field py-2 pl-9 text-[0.78rem]"
              />
            </div>
            {tab === "participants" ? (
              <select
                value={statusFilter}
                onChange={(event_) => setStatusFilter(event_.target.value)}
                className="field w-auto py-2 text-[0.78rem]"
              >
                <option value="all">All statuses</option>
                {["pending", "approved", "rejected", "cancelled", "attended", "absent"].map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            ) : null}
            <span className="ml-auto text-[0.72rem] text-mist">{filtered.length} shown</span>
          </div>

          {tab === "certificates" ? (
            <div className="mb-4 rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
              {!canIssueCertificates ? (
                <p className="text-[0.78rem] text-mist">
                  You don't have certificate issuance permission. Contact an administrator to enable it.
                </p>
              ) : (
                <div className="flex flex-wrap items-end gap-3">
                  <div>
                    <label className="mb-1.5 block text-[0.66rem] uppercase tracking-[0.16em] text-mist">
                      Certificate type
                    </label>
                    <select value={certType} onChange={(event_) => setCertType(event_.target.value)} className="field w-auto py-2 text-[0.78rem]">
                      {CERT_TYPES.map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <button
                    type="button"
                    onClick={() => issue(selected)}
                    disabled={issuing || selected.length === 0}
                    className="btn btn-primary btn-sm disabled:opacity-50"
                  >
                    {issuing ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                    Issue to selected ({selected.length})
                  </button>
                  <button type="button" onClick={issueAllAttended} disabled={issuing} className="btn btn-secondary btn-sm">
                    Issue participation to all attended
                  </button>
                </div>
              )}
            </div>
          ) : null}

          {filtered.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
              No participants match this view.
            </div>
          ) : tab === "attendance" ? (
            <div className="space-y-2">
              {filtered
                .filter((row) => ["approved", "attended", "absent", "pending"].includes(row.status))
                .map((row) => (
                  <div key={row.id} className="flex flex-col gap-2 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3 sm:flex-row sm:items-center">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.82rem] font-medium text-white">{row.user.name}</p>
                      <p className="text-[0.68rem] text-mist">
                        {row.user.rollNumber || "No roll"} · {row.user.department || "No department"} · {row.registrationId}
                      </p>
                    </div>
                    <span className={cn("badge w-fit", ATTENDANCE_TONE[row.attendance])}>{row.attendance}</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => mark(row, "present")}
                        disabled={!canManageAttendance || busy === row.id}
                        className="btn btn-ghost btn-sm text-emerald-300 hover:bg-emerald-500/10"
                      >
                        <CheckCircle2 size={12} /> Present
                      </button>
                      <button
                        type="button"
                        onClick={() => mark(row, "absent")}
                        disabled={!canManageAttendance || busy === row.id}
                        className="btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10"
                      >
                        <XCircle size={12} /> Absent
                      </button>
                      {row.attendance !== "unmarked" ? (
                        <button
                          type="button"
                          onClick={() => mark(row, "unmarked")}
                          disabled={!canManageAttendance || busy === row.id}
                          className="btn btn-ghost btn-sm"
                        >
                          Reset
                        </button>
                      ) : null}
                    </div>
                  </div>
                ))}
            </div>
          ) : (
            <div className="overflow-x-auto rounded-xl border border-white/[0.06]">
              <table className="table-console">
                <thead>
                  <tr>
                    {tab === "certificates" ? <th className="w-8" /> : null}
                    <th>Student</th>
                    <th>Registration</th>
                    <th>Status</th>
                    <th>Attendance</th>
                    {tab === "certificates" ? <th>Certificates</th> : <th>Registered</th>}
                    {tab === "participants" ? <th className="text-right">Review</th> : null}
                  </tr>
                </thead>
                <tbody>
                  {(tab === "certificates" ? eligible : filtered).map((row) => (
                    <tr key={row.id}>
                      {tab === "certificates" ? (
                        <td>
                          <input
                            type="checkbox"
                            checked={selected.includes(row.user.id)}
                            onChange={() => toggleSelected(row.user.id)}
                            aria-label={`Select ${row.user.name}`}
                            className="h-4 w-4 accent-violet-500"
                          />
                        </td>
                      ) : null}
                      <td>
                        <p className="font-medium text-white">{row.user.name}</p>
                        <p className="text-[0.66rem] text-mist">
                          {row.user.rollNumber || "No roll"} · {row.user.email}
                        </p>
                      </td>
                      <td className="font-mono text-[0.7rem] text-mist">{row.registrationId}</td>
                      <td>
                        <StatusBadge status={row.status} kind="registration" />
                      </td>
                      <td>
                        <span className={cn("badge", ATTENDANCE_TONE[row.attendance])}>{row.attendance}</span>
                      </td>
                      {tab === "certificates" ? (
                        <td>
                          <div className="flex flex-wrap gap-1">
                            {(issued[row.user.id] || []).length ? (
                              issued[row.user.id].map((type) => (
                                <span key={type} className="badge badge-violet">
                                  {type.replace(/_/g, " ")}
                                </span>
                              ))
                            ) : (
                              <span className="text-[0.7rem] text-mist">None</span>
                            )}
                          </div>
                        </td>
                      ) : (
                        <td className="text-[0.72rem] text-mist">{formatDate(row.registeredAt)}</td>
                      )}
                      {tab === "participants" ? (
                        <td>
                          <div className="flex items-center justify-end gap-1.5">
                            {row.status === "pending" ? (
                              <button
                                type="button"
                                onClick={() => patchRegistration(row, { status: "approved" }, "Registration approved.")}
                                disabled={busy === row.id}
                                className="btn btn-ghost btn-sm text-emerald-300 hover:bg-emerald-500/10"
                              >
                                Approve
                              </button>
                            ) : null}
                            {["pending", "approved"].includes(row.status) ? (
                              <button
                                type="button"
                                onClick={() => patchRegistration(row, { status: "rejected" }, "Registration rejected.")}
                                disabled={busy === row.id}
                                className="btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10"
                              >
                                Reject
                              </button>
                            ) : null}
                          </div>
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
