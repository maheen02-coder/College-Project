"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, RefreshCw, Repeat2, UserCheck, Users } from "lucide-react";
import {
  ConsoleHeading,
  DataTable,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, initials, timeAgo } from "@/lib/utils";

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

export default function AdminParticipantsPage() {
  const toast = useToast();
  const [search, setSearch] = useState("");
  const { data, loading, error, reload } = useApi("/api/registrations?limit=300");
  const registrations = data?.items || [];

  const participants = useMemo(() => {
    const map = new Map();
    for (const registration of registrations) {
      const student = registration.user;
      if (!student?.id) continue;
      const entry =
        map.get(student.id) ||
        {
          id: student.id,
          name: student.name || "Unknown student",
          email: student.email || "",
          avatar: student.avatar || "",
          roll: student.matricRollNumber || student.rollNumber || "",
          classYear: student.classYear || "",
          section: student.section || "",
          department: student.department || "",
          registrations: 0,
          attended: 0,
          pending: 0,
          lastActivity: registration.registeredAt || null,
          events: [],
        };
      entry.registrations += 1;
      if (registration.attendance === "present" || registration.status === "attended") entry.attended += 1;
      if (registration.status === "pending") entry.pending += 1;
      if (registration.registeredAt && new Date(registration.registeredAt) > new Date(entry.lastActivity || 0)) {
        entry.lastActivity = registration.registeredAt;
      }
      if (registration.event?.title && !entry.events.includes(registration.event.title)) {
        entry.events.push(registration.event.title);
      }
      map.set(student.id, entry);
    }
    return [...map.values()].sort((a, b) => new Date(b.lastActivity || 0) - new Date(a.lastActivity || 0));
  }, [registrations]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return participants;
    return participants.filter((row) =>
      [row.name, row.email, row.roll, row.department, row.classYear, row.section].join(" ").toLowerCase().includes(query)
    );
  }, [participants, search]);

  const totals = useMemo(() => {
    const attended = participants.reduce((sum, row) => sum + row.attended, 0);
    const repeat = participants.filter((row) => row.registrations > 1).length;
    return { attended, repeat };
  }, [participants]);

  function exportCsv() {
    const rows = [
      ["Name", "Roll", "Email", "Class", "Section", "Department", "Registrations", "Attended", "Pending", "Last activity", "Events"],
      ...filtered.map((row) => [
        row.name,
        row.roll,
        row.email,
        row.classYear,
        row.section,
        row.department,
        row.registrations,
        row.attended,
        row.pending,
        row.lastActivity ? formatDateTime(row.lastActivity) : "",
        row.events.join("; "),
      ]),
    ];
    downloadCsv("participants.csv", rows);
    toast(`${filtered.length} participant(s) exported.`, "info", "CSV ready");
  }

  const columns = [
    {
      key: "participant",
      label: "Participant",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.avatar ? (
            <img src={row.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lilac text-[0.66rem] font-semibold text-purple">
              {initials(row.name)}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-ink">{row.name}</p>
            <p className="truncate text-[0.68rem] text-mist">{row.email || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "roll", label: "Roll", render: (row) => <span className="font-mono text-[0.72rem] text-ink-2">{row.roll || "—"}</span> },
    {
      key: "class",
      label: "Class",
      render: (row) => (
        <div>
          <p className="text-[0.76rem] text-ink-2">{row.classYear || "—"}</p>
          <p className="text-[0.66rem] text-mist">{[row.section, row.department].filter(Boolean).join(" · ") || "—"}</p>
        </div>
      ),
    },
    {
      key: "registrations",
      label: "Registrations",
      render: (row) => (
        <div>
          <span className="text-[0.82rem] font-semibold text-ink">{row.registrations}</span>
          {row.pending ? <span className="ml-2 badge badge-amber">{row.pending} pending</span> : null}
          <p className="max-w-[18rem] truncate text-[0.66rem] text-mist">{row.events.join(" · ") || "—"}</p>
        </div>
      ),
    },
    {
      key: "attended",
      label: "Attended",
      render: (row) => <span className={`badge ${row.attended ? "badge-emerald" : "badge-slate"}`}>{row.attended}</span>,
    },
    {
      key: "lastActivity",
      label: "Last activity",
      className: "whitespace-nowrap",
      render: (row) => (
        <div>
          <p className="text-[0.74rem] text-ink-2">{timeAgo(row.lastActivity) || "—"}</p>
          <p className="text-[0.66rem] text-mist">{formatDate(row.lastActivity)}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <Link
          href={`/admin/students?q=${encodeURIComponent(row.roll || row.name)}`}
          className="btn btn-ghost btn-sm"
          title="Open student directory"
        >
          <ArrowUpRight size={13} />
        </Link>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Participation desk"
        title="Participants"
        description="Unique students derived from the latest registrations, with attendance history and engagement counts."
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!filtered.length}>
              <Download size={14} /> Export CSV
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="students" label="Unique participants" value={participants.length} hint="From the latest 300 registrations" />
        <StatTile icon="registrations" label="Registrations" value={registrations.length} tone="blue" hint="Rows in the sample" />
        <StatTile icon="certificates" label="Attended" value={totals.attended} tone="emerald" hint="Present or attended status" />
        <StatTile icon="analytics" label="Returning students" value={totals.repeat} tone="amber" hint="Two or more registrations" />
      </div>

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, roll, email, class…" />
          <span className="ml-auto hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
            <Users size={13} /> {filtered.length} participant{filtered.length === 1 ? "" : "s"}
          </span>
        </Toolbar>
        <DataTable
          columns={columns}
          rows={filtered}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage={registrations.length ? "No participants match this search." : "No registrations yet — participants appear once students sign up."}
          footer={
            <span className="inline-flex items-center gap-1.5">
              <Repeat2 size={12} /> Totals are grouped from the most recent 300 registrations returned by the API.
            </span>
          }
        />
      </Panel>

      <p className="mt-4 inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
        <UserCheck size={13} /> Student links open the directory filtered by roll number.
      </p>
    </>
  );
}
