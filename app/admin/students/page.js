"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  Users,
  XCircle,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  Modal,
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
import { VERIFICATION_STATUS_META } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

const PAGE_SIZE = 12;

const VERIFICATION_OPTIONS = Object.entries(VERIFICATION_STATUS_META).map(([value, meta]) => ({
  value,
  label: meta.label,
}));

const ACTIVE_OPTIONS = [
  { value: "true", label: "Active accounts" },
  { value: "false", label: "Deactivated" },
];

export default function AdminStudentsPage() {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const q = useDebounced(search, 320);
  const [verificationStatus, setVerificationStatus] = useState("");
  const [active, setActive] = useState("");
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const listUrl = useMemo(() => {
    const params = new URLSearchParams({ role: "student", limit: "100" });
    if (q.trim()) params.set("q", q.trim());
    if (verificationStatus) params.set("verificationStatus", verificationStatus);
    if (active) params.set("isActive", active);
    return `/api/users?${params.toString()}`;
  }, [q, verificationStatus, active]);

  const { data, loading, error, reload } = useApi(listUrl);
  const summary = useApi("/api/users?role=student&limit=100");

  useEffect(() => {
    const initial = new URLSearchParams(window.location.search).get("verificationStatus");
    if (initial && VERIFICATION_STATUS_META[initial]) setVerificationStatus(initial);
  }, []);

  useEffect(() => {
    setPage(1);
  }, [q, verificationStatus, active]);

  const rows = data?.users || [];
  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const visible = rows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const allStudents = summary.data?.users || [];
  const verified = allStudents.filter((student) => student.verificationStatus === "verified").length;
  const awaiting = allStudents.filter((student) => student.verificationStatus === "pending").length;
  const activeCount = allStudents.filter((student) => student.isActive).length;

  const openAction = (student, mode) => {
    setNote("");
    setPending({ student, mode });
  };

  const runAction = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      await fetchJson(`/api/users/${pending.student.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: pending.mode, note: note.trim() }),
      });
      toast(
        pending.mode === "verify"
          ? `${pending.student.name} is now verified.`
          : `Verification rejected for ${pending.student.name}.`,
        pending.mode === "verify" ? "success" : "info"
      );
      setPending(null);
      setNote("");
      await Promise.all([reload(), summary.reload()]);
    } catch (err) {
      toast(err.message || "Could not update verification.", "error");
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div className="flex min-w-[13rem] items-center gap-2.5">
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.66rem] font-bold text-white">
            {initials(row.name)}
          </span>
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{row.name}</p>
            <p className="truncate text-[0.7rem] text-mist">{row.email}</p>
          </div>
        </div>
      ),
    },
    {
      key: "matricRollNumber",
      label: "Matric roll",
      render: (row) => (
        <span className="font-mono text-[0.74rem] text-ink-2">{row.matricRollNumber || "—"}</span>
      ),
    },
    {
      key: "class",
      label: "Class / dept",
      render: (row) => (
        <div className="min-w-[9rem]">
          <p className="text-[0.78rem] text-ink-2">{row.classYear || "—"}</p>
          <p className="text-[0.68rem] text-mist">
            {[row.department, row.section ? `Section ${row.section}` : ""].filter(Boolean).join(" · ") || "No department"}
          </p>
        </div>
      ),
    },
    {
      key: "verification",
      label: "Verification",
      render: (row) => <StatusBadge status={row.verificationStatus} kind="verification" />,
    },
    {
      key: "points",
      label: "Points",
      render: (row) => <span className="font-semibold text-ink">{row.points ?? 0}</span>,
    },
    {
      key: "activity",
      label: "Societies / apps",
      render: (row) => (
        <span className="text-[0.76rem] text-ink-2">
          <span className="font-semibold text-ink">{row.membershipCount ?? 0}</span> societies
          <span className="mx-1 text-line">|</span>
          <span className="font-semibold text-ink">{row.applicationCount ?? 0}</span> apps
        </span>
      ),
    },
    {
      key: "createdAt",
      label: "Joined",
      render: (row) => <span className="whitespace-nowrap text-[0.74rem] text-mist">{formatDate(row.createdAt)}</span>,
    },
    {
      key: "account",
      label: "Account",
      render: (row) => (
        <span className={`badge ${row.isActive ? "badge-emerald" : "badge-slate"}`}>
          {row.isActive ? "Active" : "Inactive"}
        </span>
      ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          {row.verificationStatus !== "verified" ? (
            <button
              type="button"
              onClick={() => openAction(row, "verify")}
              className="btn btn-ghost btn-sm !px-2.5"
              title="Verify student"
              aria-label={`Verify ${row.name}`}
            >
              <CheckCircle2 size={14} className="text-emerald-600" />
            </button>
          ) : null}
          {row.verificationStatus !== "rejected" ? (
            <button
              type="button"
              onClick={() => openAction(row, "reject")}
              className="btn btn-ghost btn-sm !px-2.5"
              title="Reject verification"
              aria-label={`Reject ${row.name}`}
            >
              <XCircle size={14} className="text-rose-600" />
            </button>
          ) : null}
          <Link href={`/admin/students/${row.id}`} className="btn btn-secondary btn-sm !px-2.5" title="Open profile">
            View
          </Link>
        </div>
      ),
    },
  ];

  const forbidden = Boolean(error && /permission|access/i.test(error));

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="People directory"
        title="Students"
        description="Every student account on the platform. Search the directory, review verification documents and open a full profile for academic records."
        actions={
          <button type="button" onClick={() => { reload(); summary.reload(); }} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Students" value={allStudents.length} icon="students" hint="Directory snapshot (latest 100)" />
        <StatTile label="Verified" value={verified} icon="certificates" tone="emerald" hint="Cleared for registrations" />
        <StatTile label="Awaiting review" value={awaiting} icon="applications" tone="amber" hint="Pending verification" />
        <StatTile label="Active accounts" value={activeCount} icon="analytics" tone="blue" hint="Can sign in today" />
      </div>

      {forbidden ? (
        <Alert tone="error">
          Your admin role does not include the <strong>Students directory</strong> permission. Ask a superadmin to grant
          <span className="font-mono"> manage_students</span>.
        </Alert>
      ) : null}

      <Panel>
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search name, email or matric roll…" />
          <FilterSelect
            value={verificationStatus}
            onChange={setVerificationStatus}
            options={VERIFICATION_OPTIONS}
            placeholder="All verification states"
          />
          <FilterSelect value={active} onChange={setActive} options={ACTIVE_OPTIONS} placeholder="All accounts" />
          <span className="ml-auto inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
            <ShieldCheck size={14} /> {rows.length} match{rows.length === 1 ? "" : "es"}
          </span>
        </Toolbar>

        <DataTable
          columns={columns}
          rows={visible}
          loading={loading}
          error={error}
          rowKey={(row) => row.id}
          emptyMessage="No students match these filters yet."
          footer={
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span>
                {rows.length === 0
                  ? "0 students"
                  : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, rows.length)} of ${rows.length}`}
              </span>
              <span className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.max(1, value - 1))}
                  disabled={currentPage <= 1}
                  className="btn btn-ghost btn-sm !px-2"
                  aria-label="Previous page"
                >
                  <ChevronLeft size={14} />
                </button>
                <span className="px-1 text-[0.72rem] text-ink-2">
                  Page {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
                  disabled={currentPage >= totalPages}
                  className="btn btn-ghost btn-sm !px-2"
                  aria-label="Next page"
                >
                  <ChevronRight size={14} />
                </button>
              </span>
            </div>
          }
        />
      </Panel>

      <Modal
        open={Boolean(pending)}
        onClose={() => (saving ? null : setPending(null))}
        title={pending?.mode === "verify" ? "Verify student" : "Reject verification"}
        description={
          pending
            ? `${pending.mode === "verify" ? "Approve" : "Reject"} the matric record for ${pending.student.name}.`
            : ""
        }
        footer={
          <>
            <button type="button" onClick={() => setPending(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={runAction}
              disabled={saving}
              className={pending?.mode === "verify" ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"}
            >
              {saving ? "Saving…" : pending?.mode === "verify" ? "Confirm verification" : "Reject verification"}
            </button>
          </>
        }
      >
        {pending ? (
          <div className="space-y-4">
            <div className="flex items-center gap-3 rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <span className="grid h-10 w-10 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.7rem] font-bold text-white">
                {initials(pending.student.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.84rem] font-semibold text-ink">{pending.student.name}</p>
                <p className="truncate text-[0.72rem] text-mist">
                  {pending.student.matricRollNumber || "No matric roll"} · {pending.student.matricPercentage != null ? `${pending.student.matricPercentage}%` : "No percentage"}
                </p>
              </div>
            </div>
            <label className="block">
              <span className="label">Note (optional)</span>
              <textarea
                value={note}
                onChange={(event) => setNote(event.target.value)}
                rows={3}
                maxLength={300}
                placeholder={pending.mode === "verify" ? "Matric record checked against the admission list." : "Explain what the student needs to correct."}
                className="field resize-none"
              />
              <span className="mt-1 block text-[0.7rem] text-mist">The note is shown to the student in their notifications.</span>
            </label>
            <Alert tone={pending.mode === "verify" ? "info" : "warning"}>
              {pending.mode === "verify"
                ? "Verifying unlocks event registration, competitions and certificates for this account."
                : "Rejecting clears the verified timestamp and notifies the student to review their details."}
            </Alert>
          </div>
        ) : null}
      </Modal>

      <Panel className="bg-lavender/40">
        <div className="flex flex-wrap items-center gap-2 px-5 py-4 text-[0.76rem] text-mist">
          <Users size={15} className="text-purple" />
          Verification quick actions call <span className="font-mono text-purple">PATCH /api/users/:id</span> with
          <span className="font-mono"> action=verify|reject</span>. Academic locks apply after verification.
          <Link href="/admin/admins" className="ml-auto inline-flex items-center gap-1 font-semibold text-purple hover:underline">
            <UserCheck size={13} /> Manage staff access
          </Link>
        </div>
      </Panel>
    </div>
  );
}
