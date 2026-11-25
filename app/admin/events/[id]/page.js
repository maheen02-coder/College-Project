"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  Check,
  Clock,
  Copy,
  Download,
  ExternalLink,
  MapPin,
  Pencil,
  QrCode,
  RefreshCw,
  Users,
  X,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  Panel,
  Skeleton,
  StatTile,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { formatDateRange, formatDateTime, initials } from "@/lib/utils";

function AttendancePill({ value }) {
  const map = {
    present: { label: "Present", tone: "emerald" },
    absent: { label: "Absent", tone: "rose" },
    unmarked: { label: "Unmarked", tone: "slate" },
  };
  const meta = map[value] || map.unmarked;
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
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

export default function EventConsolePage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const { toast } = useToast();
  const eventApi = useApi(id ? `/api/events/${id}` : null);
  const regApi = useApi(id ? `/api/registrations?eventId=${id}&limit=300` : null);
  const rosterApi = useApi(id ? `/api/events/${id}/attendance` : null);
  const [selected, setSelected] = useState([]);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState("");
  const [qr, setQr] = useState(null);
  const [qrBusy, setQrBusy] = useState(false);

  const item = eventApi.data?.item;
  const registrations = regApi.data?.items || rosterApi.data?.items || [];
  const rosterLoading = !registrations.length && (regApi.loading || rosterApi.loading);
  const rosterError = regApi.error && rosterApi.error ? regApi.error : "";
  const canModerate = Boolean(regApi.data);

  const stats = useMemo(() => {
    const present = registrations.filter((row) => row.attendance === "present").length;
    return { present };
  }, [registrations]);

  const visible = useMemo(() => {
    if (filter === "all") return registrations;
    if (filter === "present" || filter === "absent" || filter === "unmarked") {
      return registrations.filter((row) => (row.attendance || "unmarked") === filter);
    }
    return registrations.filter((row) => row.status === filter);
  }, [registrations, filter]);

  const refresh = async () => {
    await Promise.all([eventApi.reload(), regApi.reload(), rosterApi.reload()]);
  };

  async function patchRegistration(registration, payload, message) {
    setBusy(registration.id);
    try {
      await fetchJson(`/api/registrations/${registration.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast(message, "success");
      setSelected([]);
      await refresh();
    } catch (err) {
      toast(err.message, "error", "Update failed");
    } finally {
      setBusy("");
    }
  }

  async function markAttendance(ids, action) {
    if (!ids.length) return;
    setBusy(`attendance-${action}`);
    try {
      const json = await fetchJson(`/api/events/${id}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ registrationIds: ids, action }),
      });
      toast(
        `${json.updated} registration(s) marked ${action}.${json.awarded ? ` ${json.awarded} point award(s) granted.` : ""}`,
        "success",
        "Attendance saved"
      );
      setSelected([]);
      await refresh();
    } catch (err) {
      toast(err.message, "error", "Attendance failed");
    } finally {
      setBusy("");
    }
  }

  async function bulkApprove() {
    if (!selected.length) return;
    setBusy("approve");
    let done = 0;
    try {
      for (const registrationId of selected) {
        try {
          await fetchJson(`/api/registrations/${registrationId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ status: "approved" }),
          });
          done += 1;
        } catch {
          /* keep going, report count at end */
        }
      }
      toast(`${done} of ${selected.length} registration(s) approved.`, done ? "success" : "error");
      setSelected([]);
      await refresh();
    } finally {
      setBusy("");
    }
  }

  async function generateQr() {
    setQrBusy(true);
    try {
      const json = await fetchJson(`/api/events/${id}/qr`);
      setQr(json);
      toast("Check-in QR generated. It stays valid for 48 hours.", "success");
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
      toast("Check-in link copied to clipboard.", "success");
    } catch {
      toast("Copy failed — select the link manually.", "error");
    }
  }

  function exportCsv() {
    const rows = [
      ["Student", "Roll number", "Email", "Status", "Attendance", "Registered at", "Marked via"],
      ...visible.map((row) => [
        row.user?.name || "",
        row.user?.matricRollNumber || row.user?.rollNumber || "",
        row.user?.email || "",
        row.status,
        row.attendance,
        row.registeredAt ? formatDateTime(row.registeredAt) : "",
        row.markedVia,
      ]),
    ];
    downloadCsv(`event-${item?.slug || id}-registrations.csv`, rows);
    toast(`${visible.length} row(s) exported.`, "info", "CSV ready");
  }

  const toggleAll = (checked) => setSelected(checked ? visible.map((row) => row.id) : []);

  const columns = [
    {
      key: "select",
      width: "2.5rem",
      label: (
        <input
          type="checkbox"
          aria-label="Select all registrations"
          checked={visible.length > 0 && selected.length === visible.length}
          onChange={(e) => toggleAll(e.target.checked)}
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
              {row.user?.matricRollNumber || row.user?.rollNumber || "No roll"} · {row.user?.department || "—"}
            </p>
          </div>
        </div>
      ),
    },
    { key: "registrationId", label: "Reg. ID", render: (row) => <span className="font-mono text-[0.7rem] text-mist">{row.registrationId}</span> },
    { key: "status", label: "Status", render: (row) => <StatusBadge kind="registration" status={row.status} /> },
    { key: "attendance", label: "Attendance", render: (row) => <AttendancePill value={row.attendance} /> },
    {
      key: "registeredAt",
      label: "Registered",
      className: "whitespace-nowrap",
      render: (row) => <span className="text-[0.75rem] text-mist">{formatDateTime(row.registeredAt)}</span>,
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "pending" && canModerate ? (
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
            title="Mark present"
            disabled={Boolean(busy) || row.attendance === "present"}
            onClick={() => markAttendance([row.id], "present")}
          >
            <Check size={13} className="text-emerald-600" />
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm !px-2"
            title="Mark absent"
            disabled={Boolean(busy) || row.attendance === "absent"}
            onClick={() => markAttendance([row.id], "absent")}
          >
            <X size={13} className="text-rose-600" />
          </button>
        </div>
      ),
    },
  ];

  if (eventApi.loading && !item) {
    return (
      <>
        <ConsoleHeading eyebrow="Event console" title="Loading event…" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[0, 1, 2, 3].map((key) => (
            <Skeleton key={key} className="h-24" />
          ))}
        </div>
        <Skeleton className="mt-5 h-[420px]" />
      </>
    );
  }

  if (eventApi.error || !item) {
    return (
      <>
        <ConsoleHeading eyebrow="Event console" title="Event unavailable" />
        <Alert tone="error">{eventApi.error || "Event not found."}</Alert>
        <Link href="/admin/events" className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft size={14} /> Back to events
        </Link>
      </>
    );
  }

  return (
    <>
      <ConsoleHeading
        eyebrow="Event console"
        title={item.title}
        description={`${item.category} · ${item.type}${item.society ? ` · ${item.society.name}` : ""}`}
        actions={
          <>
            <Link href="/admin/events" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Events
            </Link>
            {item.slug ? (
              <Link href={`/events/${item.slug}`} target="_blank" className="btn btn-ghost btn-sm">
                <ExternalLink size={14} /> Public page
              </Link>
            ) : null}
            <Link href={`/admin/events/${id}/edit`} className="btn btn-primary btn-sm">
              <Pencil size={14} /> Edit event
            </Link>
          </>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile icon="students" label="Registered" value={item.registeredCount || 0} hint={`${item.seatsLeft} seat(s) left`} />
        <StatTile icon="certificates" label="Present" value={stats.present} tone="emerald" hint="Marked at check-in" />
        <StatTile icon="applications" label="Pending approval" value={item.pendingCount || 0} tone="amber" hint="Awaiting review" />
        <StatTile icon="events" label="Capacity" value={item.capacity || 0} tone="blue" hint="Total seats" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,22rem)]">
        <div className="space-y-5">
          <Panel bodyClassName="p-5">
            <div className="flex flex-col gap-4 sm:flex-row">
              {item.poster ? (
                <img src={item.poster} alt={item.title} className="h-36 w-full rounded-2xl border border-line object-cover sm:w-56" />
              ) : (
                <div className="grid h-36 w-full place-items-center rounded-2xl bg-lavender text-purple sm:w-56">
                  <CalendarDays size={30} />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge kind="event" status={item.status} dot />
                  {item.featured ? <span className="badge badge-amber">Featured</span> : null}
                  <span className="badge badge-slate">{item.registrationType === "approval" ? "Approval required" : "Open entry"}</span>
                </div>
                <div className="mt-3 space-y-1.5 text-[0.8rem] text-ink-2">
                  <p className="inline-flex items-center gap-2">
                    <Clock size={14} className="text-purple" /> {formatDateRange(item.startAt, item.endAt)}
                  </p>
                  <p className="inline-flex items-center gap-2">
                    <MapPin size={14} className="text-purple" /> {item.venue}
                  </p>
                  <p className="inline-flex items-center gap-2 text-mist">
                    <Users size={14} /> Registration closes {formatDateTime(item.registrationDeadline)}
                  </p>
                </div>
                <p className="mt-3 line-clamp-3 text-[0.78rem] leading-relaxed text-mist">{item.description}</p>
              </div>
            </div>
          </Panel>

          <Panel
            title="Registrations"
            description="Approve requests, mark attendance and export the roster."
            actions={
              <>
                <button type="button" className="btn btn-ghost btn-sm" onClick={exportCsv} disabled={!visible.length}>
                  <Download size={13} /> CSV
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={refresh} disabled={regApi.loading}>
                  <RefreshCw size={13} className={regApi.loading ? "animate-spin" : ""} /> Refresh
                </button>
              </>
            }
          >
            <Toolbar>
              <FilterSelect
                value={filter}
                onChange={setFilter}
                options={[
                  { value: "all", label: "All registrations" },
                  { value: "pending", label: "Pending" },
                  { value: "approved", label: "Approved" },
                  { value: "rejected", label: "Rejected" },
                  { value: "present", label: "Present" },
                  { value: "absent", label: "Absent" },
                  { value: "unmarked", label: "Unmarked" },
                ]}
              />
              <span className="text-[0.72rem] text-mist">
                {visible.length} of {registrations.length} shown
              </span>
            </Toolbar>
            {selected.length ? (
              <div className="flex flex-wrap items-center gap-2 border-b border-line bg-lilac/50 px-4 py-2.5">
                <span className="text-[0.74rem] font-medium text-purple">{selected.length} selected</span>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAttendance(selected, "present")} disabled={Boolean(busy)}>
                  <Check size={13} /> Mark present
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => markAttendance(selected, "absent")} disabled={Boolean(busy)}>
                  <X size={13} /> Mark absent
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={bulkApprove} disabled={Boolean(busy) || !canModerate}>
                  <Check size={13} /> Approve
                </button>
                <button type="button" className="btn btn-ghost btn-sm ml-auto" onClick={() => setSelected([])}>
                  Clear
                </button>
              </div>
            ) : null}
            <DataTable
              columns={columns}
              rows={visible}
              loading={rosterLoading}
              error={rosterError}
              rowKey={(row) => row.id}
              emptyMessage="No registrations for this event yet."
              footer={
                <span>
                  Attendance is written to the student record and awards participation points the first time a student is marked present.
                </span>
              }
            />
          </Panel>
        </div>

        <div className="space-y-5">
          <Panel title="Check-in QR" description="Students scan this to mark themselves present." bodyClassName="p-5">
            {qr ? (
              <div className="space-y-3">
                <div className="mx-auto w-full max-w-[15rem] rounded-2xl border border-line bg-white p-3">
                  <img src={qr.qr} alt="Event check-in QR code" className="h-auto w-full" />
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
                  The signed check-in token is valid for <strong>48 hours</strong> from generation. Regenerate it for a fresh code.
                </p>
              </div>
            ) : (
              <div className="space-y-3 text-center">
                <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-purple">
                  <QrCode size={22} />
                </span>
                <p className="text-[0.78rem] leading-relaxed text-mist">
                  Generate a signed QR code so students can check themselves in from their phones.
                </p>
                <button type="button" className="btn btn-primary btn-sm w-full" onClick={generateQr} disabled={qrBusy}>
                  <QrCode size={14} /> {qrBusy ? "Generating…" : "Generate check-in QR"}
                </button>
              </div>
            )}
          </Panel>

          <Panel title="Event snapshot" bodyClassName="p-5">
            <dl className="space-y-3 text-[0.78rem]">
              {[
                ["Category", item.category],
                ["Type", item.type],
                ["Venue", item.venue],
                ["Organiser", item.organizerName || "—"],
                ["Society", item.society?.name || "—"],
                ["Feedback", item.feedbackEnabled ? "Enabled" : "Disabled"],
                ["Stored status", item.storedStatus || "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex items-start justify-between gap-3 border-b border-line/70 pb-2 last:border-0 last:pb-0">
                  <dt className="text-mist">{label}</dt>
                  <dd className="text-right font-medium text-ink">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>
    </>
  );
}
