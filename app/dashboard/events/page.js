"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, CalendarDays, CalendarX2, MapPin, Search, Ticket, X } from "lucide-react";
import {
  ChipTabs,
  ConsoleHeading,
  Modal,
  Panel,
  SearchBox,
  Skeleton,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { AttendanceBadge, EmptyState, ErrorState } from "@/components/dashboard/common";
import { formatDateRange } from "@/lib/utils";

const STATUS_TABS = ["all", "pending", "approved", "attended", "absent", "cancelled", "rejected"];

function canCancel(registration) {
  if (!registration?.event) return false;
  return (
    new Date(registration.event.endAt).getTime() > Date.now() &&
    ["pending", "approved"].includes(registration.status)
  );
}

function RegistrationSkeleton() {
  return (
    <div className="space-y-3 p-5">
      {Array.from({ length: 4 }).map((_, index) => (
        <Skeleton key={index} className="h-24" />
      ))}
    </div>
  );
}

export default function MyEventsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi("/api/registrations");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [target, setTarget] = useState(null);
  const [cancelling, setCancelling] = useState(false);

  const items = useMemo(() => (data?.items || []).filter((item) => item.event), [data]);

  const counts = useMemo(() => {
    const map = { all: items.length };
    for (const item of items) map[item.status] = (map[item.status] || 0) + 1;
    return map;
  }, [items]);

  const tabs = STATUS_TABS.map((key) => ({
    value: key,
    label:
      key === "all"
        ? `All (${counts.all || 0})`
        : `${key.charAt(0).toUpperCase() + key.slice(1)} (${counts[key] || 0})`,
  })).filter((tab) => tab.value === "all" || counts[tab.value]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (status !== "all" && item.status !== status) return false;
      if (!query) return true;
      return [item.event.title, item.event.venue, item.registrationId, item.event.category]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, status, search]);

  const cancel = async () => {
    if (!target) return;
    setCancelling(true);
    try {
      await fetchJson(`/api/registrations/${target.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      toast("Your registration has been cancelled.", "success", "Registration cancelled");
      setTarget(null);
      await reload();
    } catch (err) {
      toast(err.message || "Could not cancel this registration.", "error");
    } finally {
      setCancelling(false);
    }
  };

  return (
    <>
      <ConsoleHeading
        eyebrow="Registration history"
        title="My events"
        description="Every event you have registered for, with live status, attendance and cancellation options."
        actions={
          <Link href="/events" className="btn btn-primary btn-sm">
            <CalendarDays size={14} /> Find events
          </Link>
        }
      />

      <Panel bodyClassName="p-0">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search events, venue or registration ID…" />
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs.length ? tabs : [{ value: "all", label: "All (0)" }]} value={status} onChange={setStatus} />
          </div>
        </Toolbar>

        {loading ? (
          <RegistrationSkeleton />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={status === "all" ? CalendarDays : Search}
            title={status === "all" ? "No registrations yet" : "Nothing in this view"}
            description={
              status === "all"
                ? "Browse the campus calendar and reserve your seat at an upcoming event."
                : "Try another status filter or clear your search."
            }
            action={
              status === "all" ? (
                <Link href="/events" className="btn btn-primary btn-sm">
                  Explore events
                </Link>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStatus("all"); setSearch(""); }}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => {
              const event = item.event;
              return (
                <li key={item.id} className="flex flex-col gap-4 px-4 py-4 transition hover:bg-lavender/30 sm:flex-row sm:items-center sm:px-5">
                  <Link
                    href={`/events/${event.slug}`}
                    className="relative h-24 w-full shrink-0 overflow-hidden rounded-xl bg-lavender sm:h-16 sm:w-24"
                  >
                    {event.poster ? (
                      <img loading="lazy" decoding="async" src={event.poster} alt="" className="h-full w-full object-cover" />
                    ) : (
                      <span className="grid h-full w-full place-items-center text-purple">
                        <CalendarDays size={20} />
                      </span>
                    )}
                  </Link>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/events/${event.slug}`} className="truncate text-[0.9rem] font-semibold text-ink hover:text-purple">
                        {event.title}
                      </Link>
                      <StatusBadge status={item.status} kind="registration" />
                      <AttendanceBadge attendance={item.attendance} />
                    </div>
                    <p className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] text-mist">
                      <span className="inline-flex items-center gap-1.5">
                        <CalendarDays size={12} className="text-purple" /> {formatDateRange(event.startAt, event.endAt)}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <MapPin size={12} className="text-blue" /> {event.venue || "Venue TBA"}
                      </span>
                      <span className="inline-flex items-center gap-1.5">
                        <Ticket size={12} /> <span className="font-mono">{item.registrationId}</span>
                      </span>
                    </p>
                    {item.note ? <p className="mt-1 line-clamp-1 text-[0.7rem] text-mist">Note: {item.note}</p> : null}
                  </div>

                  <div className="flex shrink-0 items-center gap-2">
                    <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm">
                      View <ArrowUpRight size={12} />
                    </Link>
                    {canCancel(item) ? (
                      <button type="button" className="btn btn-danger btn-sm" onClick={() => setTarget(item)}>
                        <X size={12} /> Cancel
                      </button>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {!loading && !error && filtered.length ? (
          <div className="border-t border-line px-4 py-2.5 text-[0.72rem] text-mist">
            {filtered.length} {filtered.length === 1 ? "registration" : "registrations"} shown
          </div>
        ) : null}
      </Panel>

      <Modal
        open={Boolean(target)}
        onClose={() => (cancelling ? null : setTarget(null))}
        title="Cancel this registration?"
        description={target?.event?.title}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTarget(null)} disabled={cancelling}>
              Keep registration
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={cancel} disabled={cancelling}>
              {cancelling ? "Cancelling…" : "Yes, cancel"}
            </button>
          </>
        }
      >
        <div className="space-y-3 text-[0.82rem] text-mist">
          <p>
            Your seat for <span className="font-medium text-ink">{target?.event?.title}</span> will be released. You can
            register again later if seats remain.
          </p>
          <div className="flex items-center gap-2 rounded-xl bg-lavender px-3 py-2 text-[0.74rem] text-ink-2">
            <CalendarX2 size={14} className="text-purple" />
            {target ? formatDateRange(target.event.startAt, target.event.endAt) : ""}
          </div>
        </div>
      </Modal>
    </>
  );
}
