"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  CalendarDays,
  Check,
  ClipboardList,
  Download,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import {
  ConsoleHeading,
  DataTable,
  FilterSelect,
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
import { REGISTRATION_STATUSES, REGISTRATION_STATUS_META } from "@/lib/constants";
import { formatDate, formatDateTime, initials } from "@/lib/utils";

const STATUS_OPTIONS = REGISTRATION_STATUSES.map((value) => ({
  value,
  label: REGISTRATION_STATUS_META[value]?.label || value,
}));

const ATTENDANCE_OPTIONS = [
  { value: "present", label: "Present" },
  { value: "absent", label: "Absent" },
  { value: "unmarked", label: "Unmarked" },
];

function AttendancePill({ value }) {
  const map = { present: ["Present", "emerald"], absent: ["Absent", "rose"], unmarked: ["Unmarked", "slate"] };
  const [label, tone] = map[value] || map.unmarked;
  return <span className={`badge badge-${tone}`}>{label}</span>;
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

export default function AdminRegistrationsPage() {
  const toast = useToast();
  const [eventId, setEventId] = useState("");
  const [status, setStatus] = useState("");
  const [attendance, setAttendance] = useState("");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState("");
  const debounced = useDebounced(search, 300);

  const eventsApi = useApi("/api/events?scope=all&limit=120");

  const url = useMemo(() => {
    const params = new URLSearchParams({ limit: "300" });
    if (eventId) params.set("eventId", eventId);
    if (status) params.set("status", status);
    if (attendance) params.set("attendance", attendance);
    if (debounced.trim()) params.set("q", debounced.trim());
    return `/api/registrations?${params.toString()}`;
  }, [eventId, status, attendance, debounced]);

  const { data, loading, error, reload } = useApi(url);
  const registrations = data?.items || [];
  const events = eventsApi.data?.items || [];
  const selectedEvent = events.find((event) => event.id === eventId);

  const tiles = useMemo(() => {
    const pending = registrations.filter((row) => row.status === "pending").length;
    const present = registrations.filter((row) => row.attendance === "present").length;
    const approved = registrations.filter((row) => ["approved", "attended"].includes(row.status)).length;
    return { pending, present, approved };
  }, [registrations]);

  async function patchRegistration(registration, payload, message) {
    setBusy(registration.id);
    try {
      await fetchJson(`/api/registrations/${registration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast(message, "success");
      await reload();
    } catch (err) {
      toast(err.message, "error", "Update failed");
    } finally {
      setBusy("");
    }
  }

  async function bulkAction(kind) {
    if (!selected.length) return;
    setBusy(kind);
    let done = 0;
    try {
      for (const registrationId of selected) {
        try {
          await fetchJson(`/api/registrations/${registrationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(kind === "attended" ? { status: "attended" } : { status: "approved" }),
          });
          done += 1;
        } catch {
          /* reported via count */
        }
      }
      toast(`${done} of ${selected.length} registration(s) updated.`, done ? "success" : "error");
      setSelected([]);
      await reload();
    } finally {
      setBusy("");
    }
  }

  function exportCsv() {
    const rows = [
      ["Student", "Roll", "Email", "Event", "Registration ID", "Status", "Attendance", "Registered at"],
      ...registrations.map((row) => [
        row.user?.name || "",
        row.user?.matricRollNumber || row.user?.rollNumber || "",
        row.user?.email || "",
        row.event?.title || "",
        row.registrationId,
        row.status,
        row.attendance,
        row.registeredAt ? formatDateTime(row.registeredAt) : "",
      ]),
    ];
    downloadCsv("registrations.csv", rows);
    toast(`${registrations.length} row(s) exported.`, "info", "CSV ready");
  }

  const columns = [
    {
      key: "select",
      width: "2.5rem",
      label: (
        <input
          type="checkbox"
          aria-label="Select all registrations"
          checked={registrations.length > 0 && selected.length === registrations.length}
          onChange={(e) => setSelected(e.target.checked ? registrations.map((row) => row.id) : [])}
          className="h-3.5 w-3.5 accent-violet-600"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.user?.name || "registration"}`}
          checked={selected.includes(row.id)}
          onChange={(e) =>
            setSelected((current) => (e.target.checked ? [...current, row.id] : current.filter((value) => value !== row.id)))
          }
          className="h-3.5 w-3.5 accent-violet-600"
        />
      ),
    },
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          {row.user?.avatar ? (
            <img src={row.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
          ) : (
            <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lilac text-[0.66rem] font-semibold text-purple">
              {initials(row.user?.name || "?")}
            </span>
          )}
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-ink">{row.user?.name || "Unknown student"}</p>
            <p className="text-[0.68rem] text-mist">
              {row.user?.matricRollNumber || row.user?.rollNumber || "No roll"} · {row.user?.classYear || row.user?.department || "—"}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "event",
      label: "Event",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[16rem] truncate text-[0.78rem] text-ink-2">{row.event?.title || "—"}</p>
          <p className="text-[0.66rem] text-mist">{row.event?.startAt ? formatDate(row.event.startAt) : "—"}</p>
        </div>
      ),
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge kind="registration" status={row.status} /> },
    { key: "attendance", label: "Attendance", render: (row) => <AttendancePill value={row.attendance} /> },
    {
      key: "registeredAt",
      label: "Registered",
      className: "whitespace-nowrap",
      render: (row) => <span className="text-[0.74rem] text-mist">{formatDateTime(row.registeredAt)}</span>,
    },
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
                title="Approve"
                disabled={Boolean(busy)}
                onClick={() => patchRegistration(row, { status: "approved" }, "Registration approved.")}
              >
                <Check size={13} className="text-emerald-600" />
              </button>
              <button
                type="button"
                className="btn btn-ghost btn-sm !px-2"
                title="Reject"
                disabled={Boolean(busy)}
                onClick={() => patchRegistration(row, { status: "rejected" }, "Registration rejected.")}
              >
                <X size={13} className="text-rose-600" />
              </button>
            </>
          ) : null}
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            title="Mark attended"
            disabled={Boolean(busy) || row.status === "attended"}
            onClick={() => patchRegistration(row, { status: "attended" }, "Marked attended.")}
          >
            <UserCheck size={13} className="text-blue" />
          </button>
          <a href={`/admin/events/${row.event?.id || ""}`} className="btn btn-ghost btn-sm !px-2" title="Open event console">
            <CalendarDays size={13} />
          </a>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Participation desk"
        title="Registrations"
        description="Every event registration across campus. Filter by event or approval state, then confirm or reject requests."
        actions={
          <>
            <button type="button" onClick={exportCsv} className="btn btn-ghost btn-sm" disabled={!registrations.length}>
              <Download size={14} /> Export CSV
            </button>
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm" disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="registrations" label="Registrations listed" value={registrations.length} hint={selectedEvent ? selectedEvent.title : "All events"} />
        <StatTile icon="students" label="Confirmed" value={tiles.approved} tone="emerald" hint="Approved or attended" />
        <StatTile icon="applications" label="Pending" value={tiles.pending} tone="amber" hint="Awaiting a decision" />
        <StatTile icon="certificates" label="Present" value={tiles.present} tone="blue" hint="Attendance marked present" />
      </div>

      <Panel>
        <Toolbar>
          <FilterSelect
            value={eventId}
            onChange={(value) => {
              setEventId(value);
              setSelected([]);
            }}
            options={events.map((event) => ({
              value: event.id,
              label: `${event.title} · ${formatDate(event.startAt)}`,
            }))}
            placeholder={eventsApi.loading ? "Loading events…" : "All events"}
            className="!max-w-[18rem]"
          />
          <FilterSelect value={status} onChange={setStatus} options={STATUS_OPTIONS} placeholder="All statuses" />
          <FilterSelect value={attendance} onChange={setAttendance} options={ATTENDANCE_OPTIONS} placeholder="All attendance" />
          <SearchBox value={search} onChange={setSearch} placeholder="Search student name, roll, email…" />
          <span className="ml-auto hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
            <ClipboardList size={13} /> {registrations.length} shown
          </span>
        </Toolbar>

        {selected.length ? (
          <div className="flex flex-wrap items-center gap-2 border-b border-line bg-lilac/50 px-4 py-2.5">
            <span className="text-[0.74rem] font-medium text-purple">{selected.length} selected</span>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => bulkAction("approved")} disabled={Boolean(busy)}>
              <Check size={13} /> Approve selected
            </button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => bulkAction("attended")} disabled={Boolean(busy)}>
              <UserCheck size={13} /> Mark attended
            </button>
            <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setSelected([])}>
              Clear
            </button>
          </div>
        ) : null}

        <DataTable
          columns={columns}
          rows={registrations}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage="No registrations match these filters."
          footer={<span>Approving a registration notifies the student. The registrations list shows the latest 300 records.</span>}
        />
      </Panel>

      {eventsApi.error ? (
        <p className="mt-3 text-[0.72rem] text-rose-600">Event filter unavailable: {eventsApi.error}</p>
      ) : null}

      <p className="mt-4 text-[0.72rem] text-mist">
        Looking for a per-student view?{" "}
        <Link href="/admin/participants" className="font-medium text-purple hover:underline">
          Open participants
        </Link>
        .
      </p>
    </>
  );
}
