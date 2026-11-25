"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Download,
  ExternalLink,
  FileText,
  Loader2,
  Plus,
  RefreshCw,
  Save,
  Trash2,
} from "lucide-react";
import {
  Alert,
  ChipTabs,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  FormField,
  Modal,
  Panel,
  SearchBox,
  Skeleton,
  StatTile,
  Toolbar,
  Toggle,
  fetchJson,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { CERTIFICATE_TYPES, CERTIFICATE_TYPE_META } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

const TYPE_OPTIONS = CERTIFICATE_TYPES.map((value) => ({ value, label: CERTIFICATE_TYPE_META[value]?.label || value }));
const ACTIVITY_KINDS = ["Event", "Competition", "Society", "Achievement"];

const emptyIssueForm = () => ({
  type: "participation",
  templateId: "",
  activityKind: "Event",
  activityId: "",
  activityTitle: "",
  reason: "",
  mode: "students",
});

export default function AdminCertificatesPage() {
  const toast = useToast();
  const [tab, setTab] = useState("issued");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const debounced = useDebounced(search, 300);

  const [issueOpen, setIssueOpen] = useState(false);
  const [issue, setIssue] = useState(() => emptyIssueForm());
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [selectedEntries, setSelectedEntries] = useState([]);
  const [studentSearch, setStudentSearch] = useState("");
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState("");
  const [result, setResult] = useState(null);
  const [revoking, setRevoking] = useState(null);
  const [revokeBusy, setRevokeBusy] = useState(false);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ scope: "all" });
    if (type) params.set("type", type);
    if (status) params.set("status", status);
    if (debounced.trim()) params.set("q", debounced.trim());
    return `/api/certificates?${params.toString()}`;
  }, [type, status, debounced]);

  const { data, loading, error, reload } = useApi(listUrl);
  const certificates = data?.certificates || [];

  const studentsApi = useApi("/api/users?role=student&limit=100");
  const eventsApi = useApi("/api/events?scope=all&limit=120");
  const competitionsApi = useApi("/api/competitions?scope=all&limit=60");
  const societiesApi = useApi("/api/societies");
  const templatesApi = useApi("/api/certificates/templates");

  const entriesApi = useApi(
    issue.mode === "entries" && issue.activityKind === "Competition" && issue.activityId
      ? `/api/competitions/${issue.activityId}/entries`
      : null
  );
  const attendancePreviewApi = useApi(
    issue.mode === "attendance" && issue.activityKind === "Event" && issue.activityId
      ? `/api/registrations?eventId=${issue.activityId}&limit=300`
      : null
  );

  const students = studentsApi.data?.users || [];
  const events = eventsApi.data?.items || [];
  const competitions = competitionsApi.data?.items || [];
  const societies = societiesApi.data?.items || [];
  const templates = templatesApi.data?.templates || [];
  const entries = entriesApi.data?.items || [];
  const presentCount = (attendancePreviewApi.data?.items || []).filter(
    (row) => row.attendance === "present" || row.status === "attended"
  ).length;

  const tiles = useMemo(() => {
    const valid = certificates.filter((row) => row.status === "valid").length;
    const revoked = certificates.filter((row) => row.status === "revoked").length;
    const winners = certificates.filter((row) => ["winner", "runner_up"].includes(row.type)).length;
    return { valid, revoked, winners };
  }, [certificates]);

  const activityOptions = useMemo(() => {
    if (issue.activityKind === "Event") return events.map((row) => ({ value: row.id, label: `${row.title} · ${formatDate(row.startAt)}` }));
    if (issue.activityKind === "Competition") return competitions.map((row) => ({ value: row.id, label: row.title }));
    if (issue.activityKind === "Society") return societies.map((row) => ({ value: row.id, label: row.name }));
    return [];
  }, [issue.activityKind, events, competitions, societies]);

  const filteredStudents = useMemo(() => {
    const query = studentSearch.trim().toLowerCase();
    if (!query) return students;
    return students.filter((student) =>
      [student.name, student.email, student.matricRollNumber, student.classYear].join(" ").toLowerCase().includes(query)
    );
  }, [students, studentSearch]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const competitionId = params.get("competitionId");
    const eventId = params.get("eventId");
    if (competitionId) {
      setIssue({ ...emptyIssueForm(), mode: "entries", activityKind: "Competition", activityId: competitionId, type: "winner" });
      setIssueOpen(true);
    } else if (eventId) {
      setIssue({ ...emptyIssueForm(), mode: "attendance", activityKind: "Event", activityId: eventId });
      setIssueOpen(true);
    }
  }, []);

  useEffect(() => {
    if (issue.activityKind === "Achievement") return;
    const options =
      issue.activityKind === "Event" ? events : issue.activityKind === "Competition" ? competitions : societies;
    const match = options.find((row) => row.id === issue.activityId);
    if (match) {
      setIssue((current) => ({ ...current, activityTitle: current.activityTitle || match.title || match.name }));
    }
  }, [issue.activityId, issue.activityKind, events, competitions, societies]);

  useEffect(() => {
    if (issue.mode !== "entries" || !entries.length) return;
    setSelectedEntries((current) => {
      if (current.length) return current;
      const podium = entries.filter((row) => ["winner", "runner_up", "second_runner_up"].includes(row.position));
      return podium.length ? podium.map((row) => row.id) : entries.filter((row) => row.status === "approved").map((row) => row.id);
    });
  }, [entries, issue.mode]);

  function openIssue() {
    setIssue(emptyIssueForm());
    setSelectedUsers([]);
    setSelectedEntries([]);
    setStudentSearch("");
    setIssueError("");
    setResult(null);
    setIssueOpen(true);
  }

  function changeMode(mode) {
    setIssue((current) => ({
      ...current,
      mode,
      type: mode === "entries" && current.type === "participation" ? "" : current.type || "participation",
      activityKind: mode === "attendance" ? "Event" : mode === "entries" ? "Competition" : current.activityKind,
      activityId: "",
      activityTitle: "",
    }));
    setSelectedUsers([]);
    setSelectedEntries([]);
  }

  async function submitIssue(event) {
    event.preventDefault();
    setIssueError("");
    if (issue.mode === "students" && !selectedUsers.length) {
      setIssueError("Select at least one student.");
      return;
    }
    if (issue.mode === "attendance" && !issue.activityId) {
      setIssueError("Choose the event whose present attendees receive certificates.");
      return;
    }
    if (issue.mode === "entries" && !selectedEntries.length) {
      setIssueError("Select at least one competition entry.");
      return;
    }
    if (!issue.activityTitle.trim() && issue.mode === "students") {
      setIssueError("Provide the activity title these certificates are for.");
      return;
    }

    const payload = {
      type: issue.type || undefined,
      templateId: issue.templateId || undefined,
      activityKind: issue.activityKind,
      activityTitle: issue.activityTitle.trim() || undefined,
      eventId: issue.activityKind === "Event" ? issue.activityId || undefined : undefined,
      competitionId: issue.activityKind === "Competition" ? issue.activityId || undefined : undefined,
      societyId: issue.activityKind === "Society" ? issue.activityId || undefined : undefined,
      reason: issue.reason,
    };
    if (issue.mode === "students") payload.recipients = selectedUsers.map((userId) => ({ userId }));
    if (issue.mode === "attendance") payload.fromAttendance = true;
    if (issue.mode === "entries") payload.entryIds = selectedEntries;

    setIssuing(true);
    try {
      const json = await fetchJson("/api/certificates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setResult(json);
      if (json.created) toast(`${json.created} certificate(s) issued.`, "success", "Certificates created");
      else toast("No certificates were created — see the skipped list.", "error", "Nothing issued");
      await reload();
    } catch (err) {
      setIssueError(err.message);
      toast(err.message, "error", "Could not issue certificates");
    } finally {
      setIssuing(false);
    }
  }

  async function revokeCertificate() {
    if (!revoking) return;
    setRevokeBusy(true);
    try {
      await fetchJson(`/api/certificates/${revoking.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "revoked" }),
      });
      toast("Certificate revoked — verification will now show it as invalid.", "success", "Certificate revoked");
      setRevoking(null);
      await reload();
    } catch (err) {
      toast(err.message, "error", "Could not revoke certificate");
    } finally {
      setRevokeBusy(false);
    }
  }

  const columns = [
    {
      key: "certificate",
      label: "Certificate",
      render: (row) => <p className="font-mono text-[0.72rem] font-semibold text-ink">{row.certificateId}</p>,
    },
    {
      key: "recipient",
      label: "Recipient",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lilac text-[0.62rem] font-semibold text-purple">
            {initials(row.user?.name || row.recipientName || "?")}
          </span>
          <div className="min-w-0">
            <p className="truncate text-[0.8rem] font-medium text-ink">{row.user?.name || row.recipientName}</p>
            <p className="text-[0.66rem] text-mist">{row.user?.matricRollNumber || row.user?.email || "—"}</p>
          </div>
        </div>
      ),
    },
    { key: "type", label: "Type", render: (row) => <StatusBadge kind="certificate" status={row.type} /> },
    {
      key: "activity",
      label: "Activity",
      render: (row) => (
        <div className="min-w-0">
          <p className="max-w-[16rem] truncate text-[0.78rem] text-ink-2">{row.activityTitle}</p>
          <p className="text-[0.66rem] text-mist">{row.activityKind}</p>
        </div>
      ),
    },
    {
      key: "issuedAt",
      label: "Issued",
      className: "whitespace-nowrap",
      render: (row) => <span className="text-[0.74rem] text-mist">{formatDate(row.issuedAt)}</span>,
    },
    {
      key: "status",
      label: "Status",
      render: (row) => (
        <span className={`badge ${row.status === "valid" ? "badge-emerald" : "badge-rose"}`}>
          {row.status === "valid" ? "Valid" : "Revoked"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      className: "text-right whitespace-nowrap",
      render: (row) => (
        <div className="flex items-center justify-end gap-1">
          {row.status === "valid" ? (
            <a href={`/api/certificates/${row.id}/download`} className="btn btn-ghost btn-sm !px-2" title="Download PDF">
              <Download size={13} />
            </a>
          ) : null}
          <Link href={`/verify/${row.certificateId}`} target="_blank" className="btn btn-ghost btn-sm !px-2" title="Open verification page">
            <ExternalLink size={13} />
          </Link>
          {row.status === "valid" ? (
            <button type="button" className="btn btn-danger btn-sm" onClick={() => setRevoking(row)}>
              Revoke
            </button>
          ) : null}
        </div>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Recognition"
        title="Certificates"
        description="Issue verified certificates in bulk, manage revocation and control the layouts used for official documents."
        actions={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={reload} disabled={loading}>
              <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openIssue}>
              <Plus size={14} /> Issue certificates
            </button>
          </>
        }
      />

      <div className="mb-5">
        <ChipTabs
          tabs={[
            { value: "issued", label: "Issued certificates" },
            { value: "templates", label: "Templates" },
          ]}
          value={tab}
          onChange={setTab}
        />
      </div>

      {tab === "issued" ? (
        <>
          <div className="mb-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <StatTile icon="certificates" label="Certificates" value={certificates.length} hint={`${templates.length} template(s) available`} />
            <StatTile icon="applications" label="Valid" value={tiles.valid} tone="emerald" hint="Verifiable on the public site" />
            <StatTile icon="events" label="Revoked" value={tiles.revoked} tone="rose" hint="Failed verification by design" />
            <StatTile icon="competitions" label="Winner awards" value={tiles.winners} tone="amber" hint="Winner & runner-up certificates" />
          </div>

          <Panel>
            <Toolbar>
              <SearchBox value={search} onChange={setSearch} placeholder="Search ID, recipient, activity…" />
              <FilterSelect value={type} onChange={setType} options={TYPE_OPTIONS} placeholder="All types" />
              <FilterSelect
                value={status}
                onChange={setStatus}
                options={[
                  { value: "valid", label: "Valid" },
                  { value: "revoked", label: "Revoked" },
                ]}
                placeholder="All statuses"
              />
              <span className="ml-auto hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
                <Award size={13} /> {certificates.length} shown
              </span>
            </Toolbar>
            <DataTable
              columns={columns}
              rows={certificates}
              loading={loading}
              error={error}
              rowKey={(row) => row.id}
              emptyMessage="No certificates match these filters. Issue a batch to get started."
              footer={<span>Downloaded PDFs embed a verification QR that points to the public certificate page.</span>}
            />
          </Panel>
        </>
      ) : (
        <TemplatesTab templates={templates} loading={templatesApi.loading} error={templatesApi.error} onChanged={templatesApi.reload} />
      )}

      <Modal
        open={issueOpen}
        onClose={() => (issuing ? null : setIssueOpen(false))}
        title={result ? "Issuing summary" : "Issue certificates"}
        description={result ? undefined : "Bulk-issue for selected students, event attendees or competition entries."}
        wide
        footer={
          result ? (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setResult(null)}>
                Issue more
              </button>
              <button type="button" className="btn btn-primary btn-sm" onClick={() => setIssueOpen(false)}>
                Done
              </button>
            </>
          ) : (
            <>
              <button type="button" className="btn btn-ghost btn-sm" onClick={() => setIssueOpen(false)} disabled={issuing}>
                Cancel
              </button>
              <button type="submit" form="issue-form" className="btn btn-primary btn-sm" disabled={issuing}>
                {issuing ? <Loader2 size={13} className="animate-spin" /> : <Award size={13} />}
                {issuing ? "Issuing…" : "Issue certificates"}
              </button>
            </>
          )
        }
      >
        {result ? (
          <div className="space-y-4">
            <Alert tone={result.created ? "success" : "warning"}>
              <strong>{result.created || 0}</strong> certificate(s) created
              {result.skipped?.length ? ` · ${result.skipped.length} skipped` : ""}.
            </Alert>
            {result.certificates?.length ? (
              <div className="max-h-52 overflow-y-auto rounded-xl border border-line">
                <table className="table-console">
                  <thead>
                    <tr>
                      <th>Certificate ID</th>
                      <th>Type</th>
                      <th>Activity</th>
                    </tr>
                  </thead>
                  <tbody>
                    {result.certificates.map((row) => (
                      <tr key={row.id}>
                        <td className="font-mono text-[0.7rem]">{row.certificateId}</td>
                        <td>
                          <StatusBadge kind="certificate" status={row.type} />
                        </td>
                        <td className="text-[0.74rem]">{row.activityTitle}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
            {result.skipped?.length ? (
              <div>
                <p className="label">Skipped</p>
                <ul className="max-h-40 space-y-1 overflow-y-auto rounded-xl border border-line bg-ivory p-3 text-[0.72rem] text-ink-2">
                  {result.skipped.map((row, index) => (
                    <li key={`${row.userId || row.entryId}-${index}`} className="flex items-start justify-between gap-3">
                      <span className="truncate font-mono text-[0.66rem] text-mist">{row.userId || row.entryId}</span>
                      <span className="shrink-0 text-right">{row.reason}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        ) : (
          <form id="issue-form" onSubmit={submitIssue} className="space-y-4">
            {issueError ? <Alert tone="error">{issueError}</Alert> : null}

            <div className="grid gap-3 sm:grid-cols-3">
              {[
                { value: "students", label: "Selected students", hint: "Pick recipients manually" },
                { value: "attendance", label: "Event attendees", hint: "Everyone marked present" },
                { value: "entries", label: "Competition entries", hint: "Auto-type by position" },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => changeMode(option.value)}
                  className={`rounded-xl border px-3 py-2.5 text-left transition ${
                    issue.mode === option.value ? "border-violet-300 bg-lilac" : "border-line bg-white hover:border-violet-200"
                  }`}
                >
                  <span className="block text-[0.78rem] font-semibold text-ink">{option.label}</span>
                  <span className="mt-0.5 block text-[0.66rem] text-mist">{option.hint}</span>
                </button>
              ))}
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField label="Certificate type" hint={issue.mode === "entries" ? "Choose a fixed type, or let positions decide." : "Tone and wording come from this type."}>
                <select value={issue.type} onChange={(e) => setIssue((current) => ({ ...current, type: e.target.value }))} className="field">
                  {issue.mode === "entries" ? <option value="">Auto by position</option> : null}
                  {TYPE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Template" hint="Optional — recorded with the issue action.">
                <select value={issue.templateId} onChange={(e) => setIssue((current) => ({ ...current, templateId: e.target.value }))} className="field">
                  <option value="">Default layout</option>
                  {templates.map((template) => (
                    <option key={template.id} value={template.id}>
                      {template.name}
                      {template.isDefault ? " (default)" : ""}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <FormField
                label="Activity kind"
                hint={issue.mode === "attendance" ? "Attendance mode always uses an event." : issue.mode === "entries" ? "Entry mode always uses a competition." : undefined}
              >
                <select
                  value={issue.activityKind}
                  onChange={(e) =>
                    setIssue((current) => ({ ...current, activityKind: e.target.value, activityId: "", activityTitle: "" }))
                  }
                  className="field"
                  disabled={issue.mode !== "students"}
                >
                  {ACTIVITY_KINDS.map((kind) => (
                    <option key={kind} value={kind}>
                      {kind}
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label={`${issue.activityKind} record`} hint={issue.mode === "attendance" ? "Required — present attendees are issued certificates." : "Optional but recommended."}>
                <select
                  value={issue.activityId}
                  onChange={(e) => {
                    setIssue((current) => ({ ...current, activityId: e.target.value, activityTitle: "" }));
                    setSelectedEntries([]);
                  }}
                  className="field"
                  disabled={!activityOptions.length}
                >
                  <option value="">{activityOptions.length ? `Select ${issue.activityKind.toLowerCase()}` : `No ${issue.activityKind.toLowerCase()} records`}</option>
                  {activityOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </FormField>
            </div>

            <FormField label="Activity title" hint="Printed on the certificate. Auto-filled from the selected record.">
              <input
                value={issue.activityTitle}
                onChange={(e) => setIssue((current) => ({ ...current, activityTitle: e.target.value }))}
                className="field"
                maxLength={160}
                placeholder="e.g. KIPS Annual Science Gala"
              />
            </FormField>

            <FormField label="Reason / citation" hint="Optional — defaults to a standard citation for the type.">
              <textarea
                value={issue.reason}
                onChange={(e) => setIssue((current) => ({ ...current, reason: e.target.value }))}
                rows={2}
                maxLength={300}
                className="field resize-y"
                placeholder="In recognition of outstanding contribution…"
              />
            </FormField>

            {issue.mode === "students" ? (
              <div className="rounded-xl border border-line">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                  <span className="text-[0.76rem] font-semibold text-ink">Recipients</span>
                  <span className="badge badge-violet">{selectedUsers.length} selected</span>
                  <div className="ml-auto w-full sm:w-56">
                    <SearchBox value={studentSearch} onChange={setStudentSearch} placeholder="Search students…" />
                  </div>
                </div>
                {studentsApi.error ? (
                  <p className="px-3 py-4 text-[0.74rem] text-rose-600">
                    Student directory unavailable: {studentsApi.error}. Use attendees or entries mode instead.
                  </p>
                ) : studentsApi.loading ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                ) : (
                  <div className="max-h-52 divide-y divide-line overflow-y-auto">
                    {filteredStudents.map((student) => {
                      const checked = selectedUsers.includes(student.id);
                      return (
                        <label key={student.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[0.78rem] hover:bg-ivory">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedUsers((current) => (e.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id)))
                            }
                            className="h-3.5 w-3.5 accent-violet-600"
                          />
                          <span className="grid h-7 w-7 place-items-center rounded-full bg-lilac text-[0.6rem] font-semibold text-purple">
                            {initials(student.name)}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink">{student.name}</span>
                            <span className="block truncate text-[0.66rem] text-mist">
                              {student.matricRollNumber || student.email} · {student.classYear || "—"}
                            </span>
                          </span>
                        </label>
                      );
                    })}
                    {!filteredStudents.length ? <p className="px-3 py-4 text-[0.74rem] text-mist">No students match this search.</p> : null}
                  </div>
                )}
              </div>
            ) : null}

            {issue.mode === "attendance" ? (
              <div className="rounded-xl border border-line bg-ivory px-3.5 py-3 text-[0.76rem] text-ink-2">
                {attendancePreviewApi.loading ? (
                  "Counting present attendees…"
                ) : issue.activityId ? (
                  <>
                    <strong>{presentCount}</strong> attendee(s) marked present or attended will receive a{" "}
                    <strong>{CERTIFICATE_TYPE_META[issue.type]?.label || "participation"}</strong> certificate.
                  </>
                ) : (
                  "Choose an event to preview the recipients."
                )}
              </div>
            ) : null}

            {issue.mode === "entries" ? (
              <div className="rounded-xl border border-line">
                <div className="flex flex-wrap items-center gap-2 border-b border-line px-3 py-2.5">
                  <span className="text-[0.76rem] font-semibold text-ink">Entries</span>
                  <span className="badge badge-violet">{selectedEntries.length} selected</span>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm ml-auto"
                    onClick={() => setSelectedEntries(entries.filter((row) => ["winner", "runner_up", "second_runner_up"].includes(row.position)).map((row) => row.id))}
                    disabled={!entries.length}
                  >
                    Podium
                  </button>
                  <button
                    type="button"
                    className="btn btn-ghost btn-sm"
                    onClick={() => setSelectedEntries(entries.filter((row) => row.status === "approved").map((row) => row.id))}
                    disabled={!entries.length}
                  >
                    All approved
                  </button>
                </div>
                {!issue.activityId ? (
                  <p className="px-3 py-4 text-[0.74rem] text-mist">Select a competition to load its entries.</p>
                ) : entriesApi.error ? (
                  <p className="px-3 py-4 text-[0.74rem] text-rose-600">{entriesApi.error}</p>
                ) : entriesApi.loading ? (
                  <div className="space-y-2 p-3">
                    <Skeleton className="h-9" />
                    <Skeleton className="h-9" />
                  </div>
                ) : !entries.length ? (
                  <p className="px-3 py-4 text-[0.74rem] text-mist">This competition has no entries yet.</p>
                ) : (
                  <div className="max-h-52 divide-y divide-line overflow-y-auto">
                    {entries.map((entry) => {
                      const checked = selectedEntries.includes(entry.id);
                      return (
                        <label key={entry.id} className="flex cursor-pointer items-center gap-3 px-3 py-2 text-[0.78rem] hover:bg-ivory">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) =>
                              setSelectedEntries((current) => (e.target.checked ? [...current, entry.id] : current.filter((id) => id !== entry.id)))
                            }
                            className="h-3.5 w-3.5 accent-violet-600"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate font-medium text-ink">{entry.teamName || entry.user?.name}</span>
                            <span className="block truncate text-[0.66rem] text-mist">
                              {entry.entryId} · {entry.status}
                            </span>
                          </span>
                          <StatusBadge kind="position" status={entry.position || "none"} />
                        </label>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : null}

            <p className="text-[0.68rem] leading-relaxed text-mist">
              Duplicate certificates for the same student, type and activity are skipped automatically. Every issued
              certificate is verifiable at <span className="font-mono">/verify/&lt;certificateId&gt;</span>.
            </p>
          </form>
        )}
      </Modal>

      <Modal
        open={Boolean(revoking)}
        onClose={() => (revokeBusy ? null : setRevoking(null))}
        title="Revoke this certificate?"
        description={revoking ? `${revoking.certificateId} · ${revoking.recipientName}` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRevoking(null)} disabled={revokeBusy}>
              Keep certificate
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={revokeCertificate} disabled={revokeBusy}>
              {revokeBusy ? "Revoking…" : "Revoke certificate"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          The public verification page will report this certificate as revoked and the PDF download is disabled. Re-issuing
          later creates a new certificate ID.
        </p>
      </Modal>
    </>
  );
}

function TemplatesTab({ templates, loading, error, onChanged }) {
  const toast = useToast();
  const [selectedId, setSelectedId] = useState("");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [creating, setCreating] = useState(false);
  const [createForm, setCreateForm] = useState({ name: "", title: "", body: "", signatory: "", primaryColor: "#6d28d9", accentColor: "#2563eb", isDefault: false });
  const [createBusy, setCreateBusy] = useState(false);
  const [createError, setCreateError] = useState("");
  const [deleting, setDeleting] = useState(null);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    if (!templates.length) {
      setSelectedId("");
      setForm(null);
      return;
    }
    if (!templates.some((template) => template.id === selectedId)) {
      setSelectedId(templates[0].id);
    }
  }, [templates, selectedId]);

  useEffect(() => {
    const template = templates.find((row) => row.id === selectedId);
    if (!template) return;
    setForm({
      name: template.name,
      title: template.title,
      body: template.body,
      signatory: template.signatory,
      primaryColor: template.primaryColor,
      accentColor: template.accentColor,
      isDefault: template.isDefault,
    });
    setFormError("");
  }, [selectedId, templates]);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  async function save(event) {
    event.preventDefault();
    if (!form) return;
    if (form.name.trim().length < 2) {
      setFormError("Template name needs at least 2 characters.");
      return;
    }
    setSaving(true);
    setFormError("");
    try {
      await fetchJson(`/api/certificates/templates/${selectedId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name.trim(),
          title: form.title,
          body: form.body,
          signatory: form.signatory,
          primaryColor: form.primaryColor,
          accentColor: form.accentColor,
          isDefault: form.isDefault,
        }),
      });
      toast("Template saved.", "success", "Template updated");
      await onChanged();
    } catch (err) {
      setFormError(err.message);
      toast(err.message, "error", "Could not save template");
    } finally {
      setSaving(false);
    }
  }

  async function create(event) {
    event.preventDefault();
    if (createForm.name.trim().length < 2) {
      setCreateError("Give the template a name.");
      return;
    }
    setCreateBusy(true);
    setCreateError("");
    try {
      const json = await fetchJson("/api/certificates/templates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      toast("Template created.", "success");
      setCreating(false);
      setCreateForm({ name: "", title: "", body: "", signatory: "", primaryColor: "#6d28d9", accentColor: "#2563eb", isDefault: false });
      await onChanged();
      setSelectedId(json.template.id);
    } catch (err) {
      setCreateError(err.message);
    } finally {
      setCreateBusy(false);
    }
  }

  async function removeTemplate() {
    if (!deleting) return;
    setDeleteBusy(true);
    try {
      await fetchJson(`/api/certificates/templates/${deleting.id}`, { method: "DELETE" });
      toast("Template deleted.", "success");
      setDeleting(null);
      await onChanged();
    } catch (err) {
      toast(err.message, "error", "Could not delete template");
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <>
      <Panel
        title="Certificate templates"
        description="Layout text and brand colours used for official documents. The default template is used for new issues."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={() => setCreating(true)}>
            <Plus size={13} /> New template
          </button>
        }
      >
        {loading ? (
          <div className="space-y-3 p-5">
            <Skeleton className="h-10" />
            <Skeleton className="h-40" />
          </div>
        ) : error ? (
          <div className="p-5">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : !templates.length ? (
          <div className="px-6 py-12 text-center">
            <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-lilac text-purple">
              <FileText size={22} />
            </span>
            <h3 className="mt-3 text-[0.95rem] font-semibold text-ink">No templates yet</h3>
            <p className="mx-auto mt-1 max-w-sm text-[0.8rem] leading-relaxed text-mist">
              Create your first template to control the title, citation line and signatures used on certificate documents.
            </p>
          </div>
        ) : (
          <div className="grid gap-0 lg:grid-cols-[16rem_minmax(0,1fr)]">
            <aside className="border-b border-line p-3 lg:border-b-0 lg:border-r">
              <div className="space-y-1">
                {templates.map((template) => (
                  <button
                    key={template.id}
                    type="button"
                    onClick={() => setSelectedId(template.id)}
                    className={`flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-[0.78rem] transition ${
                      selectedId === template.id ? "bg-lilac font-semibold text-purple" : "text-ink-2 hover:bg-ivory"
                    }`}
                  >
                    <span className="h-2.5 w-2.5 rounded-full" style={{ background: template.primaryColor }} />
                    <span className="min-w-0 flex-1 truncate">{template.name}</span>
                    {template.isDefault ? <span className="badge badge-emerald">Default</span> : null}
                  </button>
                ))}
              </div>
            </aside>

            <div className="grid gap-5 p-5 xl:grid-cols-[minmax(0,1fr)_18rem]">
              {form ? (
                <form onSubmit={save} className="space-y-4">
                  {formError ? <Alert tone="error">{formError}</Alert> : null}
                  <FormField label="Template name">
                    <input value={form.name} onChange={(e) => update("name", e.target.value)} className="field" maxLength={80} />
                  </FormField>
                  <FormField label="Document title" hint="e.g. Certificate of Participation">
                    <input value={form.title} onChange={(e) => update("title", e.target.value)} className="field" maxLength={160} />
                  </FormField>
                  <FormField label="Body text" hint="Citation shown under the recipient name. Max 2000 characters.">
                    <textarea value={form.body} onChange={(e) => update("body", e.target.value)} rows={4} maxLength={2000} className="field resize-y" />
                  </FormField>
                  <FormField label="Signatory" hint="Name and title printed with the signature.">
                    <input value={form.signatory} onChange={(e) => update("signatory", e.target.value)} className="field" maxLength={120} />
                  </FormField>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <FormField label="Primary colour">
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-0.5" />
                        <input value={form.primaryColor} onChange={(e) => update("primaryColor", e.target.value)} className="field font-mono text-[0.76rem]" />
                      </div>
                    </FormField>
                    <FormField label="Accent colour">
                      <div className="flex items-center gap-2">
                        <input type="color" value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-0.5" />
                        <input value={form.accentColor} onChange={(e) => update("accentColor", e.target.value)} className="field font-mono text-[0.76rem]" />
                      </div>
                    </FormField>
                  </div>
                  <Toggle checked={form.isDefault} onChange={(value) => update("isDefault", value)} label="Default template" description="Used automatically when issuing new certificates." />
                  <div className="flex flex-wrap items-center gap-2">
                    <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                      {saving ? <Loader2 size={13} className="animate-spin" /> : <Save size={13} />} Save template
                    </button>
                    {!form.isDefault ? (
                      <button type="button" className="btn btn-danger btn-sm ml-auto" onClick={() => setDeleting(templates.find((row) => row.id === selectedId))}>
                        <Trash2 size={13} /> Delete
                      </button>
                    ) : (
                      <span className="ml-auto text-[0.68rem] text-mist">Default templates cannot be deleted.</span>
                    )}
                  </div>
                </form>
              ) : null}

              <div>
                <p className="label">Live preview</p>
                <div
                  className="overflow-hidden rounded-2xl border-2 bg-white p-5 text-center shadow-sm"
                  style={{ borderColor: form?.primaryColor || "#6d28d9" }}
                >
                  <p className="text-[0.58rem] font-semibold uppercase tracking-[0.24em]" style={{ color: form?.accentColor || "#2563eb" }}>
                    KIPS College
                  </p>
                  <p className="mt-2 font-display text-[1rem] font-bold leading-snug" style={{ color: form?.primaryColor || "#6d28d9" }}>
                    {form?.title || "Certificate of Participation"}
                  </p>
                  <div className="mx-auto mt-2 h-0.5 w-12 rounded-full" style={{ background: form?.accentColor || "#2563eb" }} />
                  <p className="mt-3 text-[0.6rem] uppercase tracking-[0.16em] text-mist">Presented to</p>
                  <p className="mt-1 font-display text-[1.05rem] font-semibold text-ink">Ayesha Khan</p>
                  <p className="mt-2 text-[0.66rem] leading-relaxed text-mist">
                    {form?.body || "for active participation in the KIPS Annual Science Gala, held at the main campus."}
                  </p>
                  <div className="mt-6 flex items-end justify-between text-[0.58rem] text-mist">
                    <span>{new Date().getFullYear()}</span>
                    <span className="border-t border-line pt-1 text-[0.62rem] font-medium text-ink-2">{form?.signatory || "Principal"}</span>
                  </div>
                </div>
                <p className="mt-2 text-[0.66rem] leading-relaxed text-mist">
                  Preview only — PDF generation embeds the certificate type, recipient details and a verification QR.
                </p>
              </div>
            </div>
          </div>
        )}
      </Panel>

      <Modal
        open={creating}
        onClose={() => (createBusy ? null : setCreating(false))}
        title="New certificate template"
        description="Name it now; fine-tune the copy and colours next."
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreating(false)} disabled={createBusy}>
              Cancel
            </button>
            <button type="submit" form="create-template-form" className="btn btn-primary btn-sm" disabled={createBusy}>
              {createBusy ? "Creating…" : "Create template"}
            </button>
          </>
        }
      >
        <form id="create-template-form" onSubmit={create} className="space-y-4">
          {createError ? <Alert tone="error">{createError}</Alert> : null}
          <FormField label="Template name">
            <input value={createForm.name} onChange={(e) => setCreateForm((current) => ({ ...current, name: e.target.value }))} className="field" maxLength={80} placeholder="Award ceremony 2026" />
          </FormField>
          <FormField label="Document title">
            <input value={createForm.title} onChange={(e) => setCreateForm((current) => ({ ...current, title: e.target.value }))} className="field" maxLength={160} placeholder="Certificate of Achievement" />
          </FormField>
          <FormField label="Signatory">
            <input value={createForm.signatory} onChange={(e) => setCreateForm((current) => ({ ...current, signatory: e.target.value }))} className="field" maxLength={120} placeholder="Principal, KIPS College" />
          </FormField>
          <div className="grid gap-4 sm:grid-cols-2">
            <FormField label="Primary colour">
              <input type="color" value={createForm.primaryColor} onChange={(e) => setCreateForm((current) => ({ ...current, primaryColor: e.target.value }))} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
            </FormField>
            <FormField label="Accent colour">
              <input type="color" value={createForm.accentColor} onChange={(e) => setCreateForm((current) => ({ ...current, accentColor: e.target.value }))} className="h-10 w-full cursor-pointer rounded-lg border border-line bg-white p-1" />
            </FormField>
          </div>
          <Toggle checked={createForm.isDefault} onChange={(value) => setCreateForm((current) => ({ ...current, isDefault: value }))} label="Make default" description="Existing defaults will be unset." />
        </form>
      </Modal>

      <Modal
        open={Boolean(deleting)}
        onClose={() => (deleteBusy ? null : setDeleting(null))}
        title="Delete this template?"
        description={deleting?.name || ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setDeleting(null)} disabled={deleteBusy}>
              Keep template
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={removeTemplate} disabled={deleteBusy}>
              {deleteBusy ? "Deleting…" : "Delete template"}
            </button>
          </>
        }
      >
        <p className="text-[0.82rem] leading-relaxed text-ink-2">
          The layout is removed permanently. Certificates already issued keep their stored details.
        </p>
      </Modal>
    </>
  );
}
