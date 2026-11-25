"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  Download,
  FileCheck2,
  FileText,
  RefreshCw,
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
  StatTile,
  Toolbar,
  fetchJson,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { FILE_STATUS_META } from "@/lib/constants";
import { cn, formatDateTime } from "@/lib/utils";

const STATUSES = ["pending_review", "approved", "rejected", "resubmission_required"];
const KINDS = ["application", "gallery", "avatar", "other"];

function fileSize(bytes) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

const REVIEW_CHOICES = [
  { value: "approved", label: "Approve", description: "Document looks correct.", tone: "emerald" },
  { value: "rejected", label: "Reject", description: "Not acceptable for this application.", tone: "rose" },
  { value: "resubmission_required", label: "Resubmission", description: "Ask the student for a better copy.", tone: "blue" },
];

export default function AdminFilesPage() {
  const { toast } = useToast();
  const [status, setStatus] = useState("all");
  const [kind, setKind] = useState("");
  const [q, setQ] = useState("");
  const debouncedQ = useDebounced(q, 300);

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (kind) params.set("kind", kind);
  if (debouncedQ.trim()) params.set("q", debouncedQ.trim());

  const { data, loading, error, reload } = useApi(`/api/files?${params.toString()}`);
  const items = data?.items || [];
  const counts = data?.counts || {};

  const [reviewTarget, setReviewTarget] = useState(null);
  const [reviewStatus, setReviewStatus] = useState("approved");
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewing, setReviewing] = useState(false);
  const [reviewError, setReviewError] = useState("");

  const total = useMemo(() => STATUSES.reduce((sum, key) => sum + (counts[key] || 0), 0), [counts]);

  useEffect(() => {
    if (!reviewTarget) return;
    setReviewStatus(reviewTarget.status === "pending_review" ? "approved" : reviewTarget.status);
    setReviewNotes(reviewTarget.reviewNotes || "");
    setReviewError("");
  }, [reviewTarget]);

  const submitReview = async () => {
    if (!reviewTarget || reviewing) return;
    setReviewing(true);
    setReviewError("");
    try {
      await fetchJson(`/api/files/${reviewTarget.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: reviewStatus, reviewNotes }),
      });
      toast(`${reviewTarget.name} marked ${FILE_STATUS_META[reviewStatus]?.label || reviewStatus}.`, "success");
      setReviewTarget(null);
      await reload();
    } catch (err) {
      setReviewError(err.message || "Could not review this file.");
    } finally {
      setReviewing(false);
    }
  };

  const tabs = [
    { value: "all", label: `All ${total}` },
    ...STATUSES.map((key) => ({ value: key, label: `${FILE_STATUS_META[key].label} ${counts[key] || 0}` })),
  ];

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (row) => (
        <div className="min-w-0">
          <p className="truncate font-semibold text-ink">{row.student?.name || "Unknown student"}</p>
          <p className="truncate text-[0.68rem] text-mist">{row.student?.matricRollNumber || row.student?.email || "—"}</p>
        </div>
      ),
    },
    {
      key: "name",
      label: "Document",
      render: (row) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-lavender text-purple">
            <FileText size={14} />
          </span>
          <div className="min-w-0">
            <p className="max-w-[220px] truncate text-[0.78rem] font-medium text-ink">{row.name}</p>
            <p className="text-[0.66rem] text-mist">
              {row.kind || "other"} · {fileSize(row.size)}
            </p>
          </div>
        </div>
      ),
    },
    {
      key: "context",
      label: "Context",
      render: (row) => (
        <div className="text-[0.72rem]">
          <p className="truncate text-ink">{row.society?.name || "—"}</p>
          <p className="truncate text-[0.66rem] text-mist">{row.recruitment?.title || (row.application ? "Application file" : "Unattached")}</p>
        </div>
      ),
    },
    {
      key: "uploaded",
      label: "Uploaded",
      render: (row) => <span className="whitespace-nowrap text-[0.72rem]">{formatDateTime(row.createdAt)}</span>,
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} kind="file" /> },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <div className="flex justify-end gap-1.5">
          <a
            href={`/api/files/${row.id}/download`}
            target="_blank"
            rel="noreferrer"
            className="btn btn-ghost btn-sm"
          >
            <Download size={12} /> Open
          </a>
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => setReviewTarget(row)}>
            Review
          </button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Applications & documents"
        title="Files & documents"
        description="Verify the documents students attach to applications. Approvals and rejections notify the student instantly."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Pending review" value={counts.pending_review || 0} icon="files" tone="amber" hint="Waiting for a decision" />
        <StatTile label="Approved" value={counts.approved || 0} icon="certificates" tone="emerald" hint="Accepted documents" />
        <StatTile label="Resubmission" value={counts.resubmission_required || 0} icon="applications" tone="blue" hint="Students re-uploading" />
        <StatTile label="Rejected" value={counts.rejected || 0} icon="registrations" tone="rose" hint="Not accepted" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search file or student…" />
          <FilterSelect
            value={kind}
            onChange={setKind}
            placeholder="All kinds"
            options={KINDS.map((value) => ({ value, label: value[0].toUpperCase() + value.slice(1) }))}
          />
          <ChipTabs className="w-full" tabs={tabs} value={status} onChange={setStatus} />
        </Toolbar>

        {error ? (
          <div className="p-4">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : (
          <DataTable
            columns={columns}
            rows={items}
            loading={loading}
            rowKey={(row) => row.id}
            emptyMessage="No documents match this view."
            footer={`${items.length} document${items.length === 1 ? "" : "s"} shown`}
          />
        )}
      </Panel>

      <Modal
        open={Boolean(reviewTarget)}
        onClose={() => (reviewing ? null : setReviewTarget(null))}
        title="Review document"
        description={reviewTarget?.name || ""}
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setReviewTarget(null)} disabled={reviewing}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={submitReview} disabled={reviewing}>
              <FileCheck2 size={13} /> {reviewing ? "Saving…" : `Mark ${FILE_STATUS_META[reviewStatus]?.label || reviewStatus}`}
            </button>
          </>
        }
      >
        {reviewTarget ? (
          <div className="space-y-4">
            {reviewError ? <Alert tone="error">{reviewError}</Alert> : null}
            <div className="rounded-2xl border border-line bg-ivory/60 p-3.5">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-[0.85rem] font-semibold text-ink">{reviewTarget.name}</p>
                  <p className="text-[0.7rem] text-mist">
                    {reviewTarget.student?.name || "Student"} · {reviewTarget.student?.matricRollNumber || reviewTarget.student?.email || "—"}
                  </p>
                  <p className="mt-0.5 text-[0.68rem] text-mist">
                    {reviewTarget.society?.name || "No society"} · {reviewTarget.recruitment?.title || reviewTarget.kind} · {fileSize(reviewTarget.size)}
                  </p>
                </div>
                <StatusBadge status={reviewTarget.status} kind="file" />
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                <a
                  href={`/api/files/${reviewTarget.id}/download`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn btn-secondary btn-sm"
                >
                  <Download size={12} /> Open file
                </a>
                {reviewTarget.application ? (
                  <Link href={`/admin/applications/${reviewTarget.application.id}`} className="btn btn-ghost btn-sm">
                    Application <ArrowUpRight size={12} />
                  </Link>
                ) : null}
              </div>
            </div>

            <div className="grid gap-2 sm:grid-cols-3">
              {REVIEW_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  onClick={() => setReviewStatus(choice.value)}
                  className={cn(
                    "rounded-xl border px-3 py-2.5 text-left transition",
                    reviewStatus === choice.value
                      ? "border-violet-300 bg-lilac shadow-sm"
                      : "border-line bg-white hover:border-violet-200"
                  )}
                >
                  <span className="block text-[0.78rem] font-semibold text-ink">{choice.label}</span>
                  <span className="mt-0.5 block text-[0.66rem] leading-snug text-mist">{choice.description}</span>
                </button>
              ))}
            </div>

            <FormField label="Review note" hint="Sent to the student with the decision. Keep it constructive.">
              <textarea
                className="field min-h-[80px]"
                maxLength={1000}
                value={reviewNotes}
                onChange={(event) => setReviewNotes(event.target.value)}
                placeholder={
                  reviewStatus === "resubmission_required"
                    ? "Please upload a clearer scan of the document."
                    : "Optional note for the student."
                }
              />
            </FormField>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
