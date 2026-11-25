"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  ChevronLeft,
  ChevronRight,
  Inbox,
  RefreshCw,
  UserCheck,
  X,
} from "lucide-react";
import {
  Alert,
  ChipTabs,
  ConsoleHeading,
  DataTable,
  FilterSelect,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  useApi,
  useDebounced,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { APPLICATION_STATUS_META } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";

export default function AdminApplicationsPage() {
  const [status, setStatus] = useState("all");
  const [society, setSociety] = useState("");
  const [recruitment, setRecruitment] = useState("");
  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const debouncedQ = useDebounced(q, 300);

  const societiesApi = useApi("/api/societies");
  const societies = societiesApi.data?.items || [];

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("status") && APPLICATION_STATUS_META[params.get("status")]) setStatus(params.get("status"));
    if (params.get("society")) setSociety(params.get("society"));
    if (params.get("recruitment")) setRecruitment(params.get("recruitment"));
  }, []);

  useEffect(() => {
    setPage(1);
  }, [status, society, recruitment, debouncedQ]);

  const params = new URLSearchParams();
  if (status !== "all") params.set("status", status);
  if (society) params.set("society", society);
  if (recruitment) params.set("recruitment", recruitment);
  if (debouncedQ.trim()) params.set("q", debouncedQ.trim());
  params.set("page", String(page));

  const { data, loading, error, reload } = useApi(`/api/applications?${params.toString()}`);
  const items = data?.items || [];
  const counts = data?.counts || {};
  const total = data?.total || 0;
  const pages = data?.pages || 1;

  const statCount = (keys) => keys.reduce((sum, key) => sum + (counts[key] || 0), 0);
  const allTotal = Object.values(counts).reduce((sum, value) => sum + value, 0);

  const tabs = [
    { value: "all", label: `All ${allTotal}` },
    ...Object.keys(APPLICATION_STATUS_META).map((key) => ({
      value: key,
      label: `${APPLICATION_STATUS_META[key].label}${counts[key] ? ` ${counts[key]}` : ""}`,
    })),
  ];

  const columns = [
    {
      key: "applicant",
      label: "Applicant",
      render: (row) => (
        <div className="min-w-0">
          <Link href={`/admin/applications/${row.id}`} className="block truncate font-semibold text-ink hover:text-purple">
            {row.applicant?.name || "Applicant"}
          </Link>
          <p className="truncate text-[0.68rem] text-mist">
            {row.applicant?.matricRollNumber || row.applicant?.email || "—"}
            {row.applicant?.department ? ` · ${row.applicant.department}` : ""}
          </p>
        </div>
      ),
    },
    {
      key: "society",
      label: "Society",
      render: (row) => (
        <div className="flex items-center gap-1.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: row.society?.color || "#6d28d9" }} />
          <span className="truncate text-[0.76rem] text-ink">{row.society?.name || "—"}</span>
        </div>
      ),
    },
    {
      key: "recruitment",
      label: "Recruitment",
      render: (row) => <span className="block max-w-[190px] truncate text-[0.74rem] text-mist">{row.recruitment?.title || "—"}</span>,
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} kind="application" /> },
    {
      key: "applied",
      label: "Applied",
      render: (row) => <span className="whitespace-nowrap text-[0.73rem]">{formatDateTime(row.submittedAt || row.createdAt)}</span>,
    },
    {
      key: "interview",
      label: "Interview",
      render: (row) =>
        row.interview ? (
          <div className="space-y-1">
            <StatusBadge status={row.interview.status} kind="interview" />
            <p className="whitespace-nowrap text-[0.66rem] text-mist">{formatDateTime(row.interview.scheduledAt)}</p>
          </div>
        ) : (
          <span className="text-[0.72rem] text-mist">Not scheduled</span>
        ),
    },
    {
      key: "actions",
      label: "",
      className: "text-right",
      render: (row) => (
        <Link href={`/admin/applications/${row.id}`} className="btn btn-ghost btn-sm">
          Review <ArrowUpRight size={12} />
        </Link>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Societies & recruitment"
        title="Applications"
        description="Every submission across societies. Filter the queue, shortlist candidates and schedule interviews."
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
            <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Results" value={allTotal} icon="applications" hint="Matching current filters" />
        <StatTile
          label="Awaiting review"
          value={statCount(["submitted", "pending_review", "under_review"])}
          icon="files"
          tone="amber"
          hint="Needs a decision"
        />
        <StatTile label="Shortlisted" value={counts.shortlisted || 0} icon="students" tone="emerald" hint="Moving forward" />
        <StatTile label="Accepted" value={counts.accepted || 0} icon="certificates" tone="blue" hint="Joined the society" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search applicant name, roll or email…" />
          <FilterSelect
            value={society}
            onChange={(value) => setSociety(value)}
            placeholder="All societies"
            options={societies.map((item) => ({ value: item.id, label: item.name }))}
          />
          {recruitment ? (
            <button
              type="button"
              onClick={() => setRecruitment("")}
              className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-lilac px-2.5 py-1.5 text-[0.7rem] font-medium text-purple"
            >
              <Inbox size={12} /> {items[0]?.recruitment?.title || "Single recruitment"} <X size={12} />
            </button>
          ) : null}
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
            emptyMessage="No applications match these filters."
            footer={`${items.length} shown of ${total} · page ${page} of ${pages || 1}`}
          />
        )}

        <div className="flex items-center justify-between gap-2 border-t border-line px-4 py-3">
          <p className="text-[0.72rem] text-mist">
            {total} application{total === 1 ? "" : "s"} in this view
          </p>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.max(1, current - 1))}
              disabled={page <= 1 || loading}
            >
              <ChevronLeft size={13} /> Prev
            </button>
            <span className="px-1 text-[0.72rem] font-medium text-ink">
              {page} / {pages || 1}
            </span>
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              onClick={() => setPage((current) => Math.min(pages || 1, current + 1))}
              disabled={page >= (pages || 1) || loading}
            >
              Next <ChevronRight size={13} />
            </button>
          </div>
        </div>
      </Panel>

      <div className="flex items-center gap-2 rounded-2xl border border-line bg-white px-4 py-3">
        <UserCheck size={15} className="text-purple" />
        <p className="text-[0.75rem] text-mist">
          Accepting an application automatically adds the student to the society as a member and awards joining points.
        </p>
      </div>
    </div>
  );
}
