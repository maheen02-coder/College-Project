"use client";

import { useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  Loader2,
  QrCode,
  RefreshCw,
  ScanLine,
  Users,
  X,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  Panel,
  SearchBox,
  Skeleton,
  StatTile,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDate, formatDateTime, initials } from "@/lib/utils";

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

export default function AdminAttendancePage() {
  const toast = useToast();
  const [eventId, setEventId] = useState("");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState([]);
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);

  const eventsApi = useApi("/api/events?scope=all&limit=120");
  const rosterApi = useApi(eventId ? `/api/events/${eventId}/attendance` : null);
  const events = eventsApi.data?.items || [];
  const item = rosterApi.data?.item;
  const stats = rosterApi.data?.stats;
  const roster = rosterApi.data?.items || [];

  const visible = useMemo(() => {
    const query = search.trim().toLowerCase();
    return roster.filter((row) => {
      if (filter !== "all" && (row.attendance || "unmarked") !== filter) return false;
      if (!query) return true;
      return [row.user?.name, row.user?.matricRollNumber, row.user?.rollNumber, row.user?.email]
        .join(" ")
        .toLowerCase()
        .includes(query);
    });
  }, [roster, filter, search]);

  function changeEvent(value) {
    setEventId(value);
    setSelected([]);
    setQr(null);
    setFilter("all");
    setSearch("");
  }

  async function mark(ids, action) {
    if (!ids.length) return;
    setBusy(action);
    try {
      const json = await fetchJson(`/api/events/${eventId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: ids, action }),
      });
      toast(
        `${json.updated} student(s) marked ${action}.${json.awarded ? ` ${json.awarded} point award(s) granted.` : ""}`,
        "success",
        "Attendance saved"
      );
      setSelected([]);
      await rosterApi.reload();
    } catch (err) {
      toast(err.message, "error", "Attendance failed");
    } finally {
      setBusy("");
    }
  }

  async function generateQr() {
    if (!eventId) return;
    setQrBusy(true);
    try {
      const json = await fetchJson(`/api/events/${eventId}/qr`);
      setQr(json);
      toast("Check-in QR generated — valid for 48 hours.", "success");
    } catch (err) {
      toast(err.message, "error", "Could not generate QR");
    } finally {
      setQrBusy(false);
    }
  }

  async function copyLink() {
    if (!qr?.url) return;
    try {
      await navigator.clipboard.writeText(qr.url);
      toast("Check-in link copied.", "success");
    } catch {
      toast("Copy failed — select the link manually.", "error");
    }
  }

  function exportCsv() {
    const rows = [
      ["Student", "Roll", "Email", "Registration ID", "Status", "Attendance", "Marked via", "Registered at"],
      ...visible.map((row) => [
        row.user?.name || "",
        row.user?.matricRollNumber || row.user?.rollNumber || "",
        row.user?.email || "",
        row.registrationId,
        row.status,
        row.attendance,
        row.markedVia,
        row.registeredAt ? formatDateTime(row.registeredAt) : "",
      ]),
    ];
    downloadCsv(`attendance-${item?.slug || eventId}.csv`, rows);
    toast(`${visible.length} row(s) exported.`, "info", "CSV ready");
  }

  const columns = [
    {
      key: "select",
      width: "2.5rem",
      label: (
        <input
          type="checkbox"
          aria-label="Select all students"
          checked={visible.length > 0 && selected.length === visible.length}
          onChange={(e) => setSelected(e.target.checked ? visible.map((row) => row.id) : [])}
          className="h-3.5 w-3.5 accent-violet-600"
        />
      ),
      render: (row) => (
        <input
          type="checkbox"
          aria-label={`Select ${row.user?.name || "student"}`}
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
            <img loading="lazy" decoding="async" src={row.user.avatar} alt="" className="h-8 w-8 rounded-full object-cover" />
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
    { key: "registrationId", label: "Reg. ID", render: (row) => <span className="font-mono text-[0.7rem] text-mist">{row.registrationId}</span> },
    { key: "status", label: "Registration", render: (row) => <StatusBadge kind="registration" status={row.status} /> },
    { key: "attendance", label: "Attendance", render: (row) => <AttendancePill value={row.attendance} /> },
    {
      key: "marked",
      label: "Marked",
      className: "whitespace-nowrap",
      render: (row) => (
        <div>
          <p className="text-[0.72rem] text-ink-2 capitalize">{row.markedVia}</p>
          <p className="text-[0.66rem] text-mist">{row.attendedAt ? formatDateTime(row.attendedAt) : "—"}</p>
        </div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            title="Mark present"
            disabled={Boolean(busy) || row.attendance === "present"}
            onClick={() => mark([row.id], "present")}
          >
            <Check size={13} className="text-emerald-600" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            title="Mark absent"
            disabled={Boolean(busy) || row.attendance === "absent"}
            onClick={() => mark([row.id], "absent")}
          >
            <X size={13} className="text-rose-600" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            title="Clear attendance"
            disabled={Boolean(busy) || row.attendance === "unmarked"}
            onClick={() => mark([row.id], "unmarked")}
          >
            <RefreshCw size={12} className="text-mist" />
          </button>
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Attendance desk"
        title="Attendance & QR"
        description="Take the register for any event, mark students present in bulk, or let them check in with the signed QR code."
        actions={
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => rosterApi.reload()} disabled={!eventId || rosterApi.loading}>
            <RefreshCw size={14} className={rosterApi.loading ? "animate-spin" : ""} /> Refresh roster
          </button>
        }
      />

      <Panel className="mb-5">
        <Toolbar className="!border-b-0">
          <FilterSelect
            value={eventId}
            onChange={changeEvent}
            options={events.map((event) => ({
              value: event.id,
              label: `${event.title} · ${formatDate(event.startAt)}`,
            }))}
            placeholder={eventsApi.loading ? "Loading events…" : "Select an event"}
            className="!max-w-[22rem]"
          />
          {item ? (
            <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
              <Users size={13} /> {item.venue} · {formatDate(item.startAt)}
            </span>
          ) : (
            <span className="text-[0.72rem] text-mist">Choose an event to load its roster and check-in code.</span>
          )}
        </Toolbar>
      </Panel>

      {eventsApi.error ? (
        <div className="mb-4">
          <Alert tone="error">{eventsApi.error}</Alert>
        </div>
      ) : null}

      {!eventId ? (
        <Panel bodyClassName="px-6 py-14 text-center">
          <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-purple">
            <ScanLine size={24} />
          </span>
          <h3 className="mt-3 text-[0.95rem] font-semibold text-ink">Select an event to start</h3>
          <p className="mx-auto mt-1 max-w-md text-[0.8rem] leading-relaxed text-mist">
            The register lists every active registration with its attendance state. You can also generate a QR code so
            students check themselves in.
          </p>
        </Panel>
      ) : rosterApi.loading && !item ? (
        <div className="space-y-4">
          <Skeleton className="h-24" />
          <Skeleton className="h-[420px]" />
        </div>
      ) : rosterApi.error ? (
        <Alert tone="error">{rosterApi.error}</Alert>
      ) : (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="students" label="On the register" value={stats?.total || 0} hint={`${stats?.approved || 0} approved`} />
            <StatTile icon="certificates" label="Present" value={stats?.present || 0} tone="emerald" hint={`${stats?.absent || 0} absent`} />
            <StatTile icon="applications" label="Unmarked" value={stats?.unmarked || 0} tone="amber" hint={`${stats?.pending || 0} pending approval`} />
            <StatTile icon="analytics" label="Attendance rate" value={`${stats?.rate || 0}%`} tone="blue" hint="Present ÷ marked" />
          </div>

          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,21rem)]">
            <Panel
              title="Register"
              description="Mark present, absent or clear the mark. Presence awards points the first time."
              actions={
                <>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!visible.length}>
                    <Download size={13} /> CSV
                  </button>
                </>
              }
            >
              <Toolbar>
                <FilterSelect
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: "all", label: "All students" },
                    { value: "present", label: "Present" },
                    { value: "absent", label: "Absent" },
                    { value: "unmarked", label: "Unmarked" },
                  ]}
                />
                <SearchBox value={search} onChange={setSearch} placeholder="Search student or roll…" />
                <span className="ml-auto text-[0.72rem] text-mist">{visible.length} shown</span>
              </Toolbar>

              {selected.length ? (
                <div className="flex flex-wrap items-center gap-2 border-b border-line bg-lilac/50 px-4 py-2.5">
                  <span className="text-[0.74rem] font-medium text-purple">{selected.length} selected</span>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => mark(selected, "present")} disabled={Boolean(busy)}>
                    <Check size={13} /> Present
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => mark(selected, "absent")} disabled={Boolean(busy)}>
                    <X size={13} /> Absent
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm" onClick={() => mark(selected, "unmarked")} disabled={Boolean(busy)}>
                    <RefreshCw size={12} /> Clear
                  </button>
                  <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setSelected([])}>
                    Deselect
                  </button>
                </div>
              ) : null}

              <DataTable
                columns={columns}
                rows={visible}
                loading={rosterApi.loading}
                error={rosterApi.error}
                rowKey={(row) => row.id}
                emptyMessage="No students match this filter."
                footer={<span>Only active registrations (pending, approved, attended, absent) appear on the register.</span>}
              />
            </Panel>

            <div className="space-y-5">
              <Panel title="Self check-in" description="Students scan to mark themselves present." bodyClassName="p-5">
                {qr ? (
                  <div className="space-y-3">
                    <div className="mx-auto w-full max-w-[14rem] rounded-2xl border border-line bg-white p-3">
                      <img loading="lazy" decoding="async" src={qr.qr} alt="Event check-in QR code" className="h-auto w-full" />
                    </div>
                    <p className="break-all rounded-lg bg-lavender px-2.5 py-2 font-mono text-[0.64rem] leading-relaxed text-ink-2">{qr.url}</p>
                    <div className="flex gap-2">
                      <button type="button" className="btn btn-secondary btn-sm flex-1" onClick={copyLink}>
                        <Copy size={13} /> Copy link
                      </button>
                      <button type="button" className="btn btn-ghost btn-sm" onClick={generateQr} disabled={qrBusy}>
                        <RefreshCw size={13} className={qrBusy ? "animate-spin" : ""} />
                      </button>
                    </div>
                    <p className="text-[0.68rem] leading-relaxed text-mist">
                      The signed link expires <strong>48 hours</strong> after generation. Anyone with the link can check in
                      students while it is valid.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3 text-center">
                    <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-purple">
                      <QrCode size={22} />
                    </span>
                    <p className="text-[0.78rem] leading-relaxed text-mist">
                      Generate a single QR for this event. Students scan it from their phones at the entrance.
                    </p>
                    <button type="button" className="btn btn-primary btn-sm w-full" onClick={generateQr} disabled={qrBusy}>
                      {qrBusy ? <Loader2 size={14} className="animate-spin" /> : <QrCode size={14} />}
                      {qrBusy ? "Generating…" : "Generate check-in QR"}
                    </button>
                  </div>
                )}
              </Panel>

              {item ? (
                <Panel title="Event" bodyClassName="p-5">
                  <p className="text-[0.85rem] font-semibold text-ink">{item.title}</p>
                  <p className="mt-1 text-[0.74rem] text-mist">{formatDateTime(item.startAt)}</p>
                  <p className="text-[0.74rem] text-mist">{item.venue}</p>
                  <div className="mt-3">
                    <StatusBadge kind="event" status={item.status} dot />
                  </div>
                </Panel>
              ) : null}
            </div>
          </div>
        </>
      )}
    </>
  );
}
