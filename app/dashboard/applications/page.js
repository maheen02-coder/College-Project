"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowRight, ClipboardList, FileText, Search } from "lucide-react";
import {
  ChipTabs,
  ConsoleHeading,
  Panel,
  SearchBox,
  Skeleton,
  StatTile,
  Toolbar,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, SocietyAvatar } from "@/components/dashboard/common";
import { formatDate } from "@/lib/utils";
import { APPLICATION_STATUS_META } from "@/lib/constants";

export default function ApplicationsPage() {
  const { data, loading, error, reload } = useApi("/api/applications");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => data?.items || [], [data]);
  const counts = data?.counts || {};

  const tabs = useMemo(() => {
    const keys = Object.keys(counts).filter((key) => key !== "draft" && counts[key] > 0);
    return [
      { value: "all", label: `All (${items.length})` },
      ...keys.map((key) => ({
        value: key,
        label: `${APPLICATION_STATUS_META[key]?.label || key} (${counts[key]})`,
      })),
    ];
  }, [counts, items.length]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!query) return true;
      return [item.recruitment?.title, item.society?.name, item.roundKey]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, status, search]);

  const accepted = items.filter((item) => item.status === "accepted").length;
  const inReview = items.filter((item) => ["submitted", "pending_review", "under_review", "shortlisted", "interview_scheduled"].includes(item.status)).length;

  return (
    <>
      <ConsoleHeading
        eyebrow="Society recruitment"
        title="My applications"
        description="Track every recruitment application from submission through interviews to the final decision."
        actions={
          <Link href="/recruitment" className="btn btn-primary btn-sm">
            <ClipboardList size={14} /> Find recruitment
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Applications" value={items.length} icon="applications" tone="purple" hint="Across all societies" />
        <StatTile label="In review" value={inReview} icon="analytics" tone="blue" hint="Awaiting a decision" />
        <StatTile label="Accepted" value={accepted} icon="certificates" tone="emerald" hint="Membership offers" />
      </div>

      <Panel bodyClassName="p-0">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search society or recruitment…" />
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs.length ? tabs : [{ value: "all", label: "All (0)" }]} value={status} onChange={setStatus} />
          </div>
        </Toolbar>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 4 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={status === "all" ? ClipboardList : Search}
            title={status === "all" ? "No applications yet" : "Nothing in this view"}
            description={
              status === "all"
                ? "When a society opens recruitment, apply and follow every stage of the process here."
                : "Try another status filter or clear your search."
            }
            action={
              status === "all" ? (
                <Link href="/recruitment" className="btn btn-primary btn-sm">Browse recruitment</Link>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStatus("all"); setSearch(""); }}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => (
              <li key={item.id}>
                <Link href={`/dashboard/applications/${item.id}`} className="flex flex-col gap-3 px-4 py-4 transition hover:bg-lavender/30 sm:flex-row sm:items-center sm:px-5">
                  <SocietyAvatar society={item.society} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[0.9rem] font-semibold text-ink">{item.recruitment?.title || "Recruitment"}</p>
                      <StatusBadge status={item.status} kind="application" />
                    </div>
                    <p className="mt-1 text-[0.72rem] text-mist">
                      {item.society?.name || "Society"} · applied {formatDate(item.submittedAt || item.createdAt)}
                      {item.roundKey ? ` · ${item.roundKey}` : ""}
                    </p>
                  </div>
                  {item.fileCount > 0 ? (
                    <span className="chip self-start sm:self-center">
                      <FileText size={12} /> {item.fileCount} file{item.fileCount === 1 ? "" : "s"}
                    </span>
                  ) : null}
                  <span className="inline-flex items-center gap-1 self-start text-[0.74rem] font-semibold text-purple sm:self-center">
                    View <ArrowRight size={13} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  );
}
