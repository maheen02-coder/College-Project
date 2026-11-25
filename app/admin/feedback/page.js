"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { MessageSquare, RefreshCw, Star, ThumbsUp, Users } from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FilterSelect,
  Panel,
  Skeleton,
  StatTile,
  Toolbar,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { formatDate, initials, pct } from "@/lib/utils";

function Stars({ value, size = 13 }) {
  const rounded = Math.round(Number(value) || 0);
  return (
    <span className="inline-flex items-center gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((index) => (
        <Star
          key={index}
          size={size}
          className={index <= rounded ? "text-amber-500" : "text-line"}
          fill={index <= rounded ? "currentColor" : "none"}
        />
      ))}
    </span>
  );
}

export default function AdminFeedbackPage() {
  const { toast } = useToast();
  const [eventId, setEventId] = useState("");
  const eventsApi = useApi("/api/events?scope=all&limit=100");
  const feedbackApi = useApi(eventId ? `/api/feedback?eventId=${eventId}` : "/api/feedback");

  const items = feedbackApi.data?.items || [];
  const aggregate = feedbackApi.data?.aggregate || [];
  const eventOptions = (eventsApi.data?.items || []).map((event) => ({ value: event.id, label: event.title }));

  const stats = useMemo(() => {
    const distribution = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    let total = 0;
    items.forEach((item) => {
      const rating = Math.round(Number(item.rating) || 0);
      if (rating >= 1 && rating <= 5) distribution[rating] += 1;
      total += Number(item.rating) || 0;
    });
    const average = items.length ? Math.round((total / items.length) * 10) / 10 : 0;
    return {
      distribution,
      average,
      fiveStar: distribution[5],
      events: new Set(items.map((item) => item.event?.id).filter(Boolean)).size,
    };
  }, [items]);

  const refreshAll = async () => {
    const result = await feedbackApi.reload();
    if (result) toast("Feedback refreshed.", "success");
  };

  const selectedEvent = eventOptions.find((option) => option.value === eventId);

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Voice of the campus"
        title="Event feedback"
        description="Read-only view of student ratings after events. Use the event filter to isolate a single programme."
        actions={
          <button type="button" onClick={refreshAll} className="btn btn-secondary btn-sm">
            <RefreshCw size={14} /> Refresh
          </button>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Responses" value={items.length} icon="applications" hint={selectedEvent?.label || "All events"} />
        <StatTile
          label="Average rating"
          value={items.length ? `${stats.average} / 5` : "—"}
          icon="competitions"
          tone="amber"
          hint="Overall experience"
        />
        <StatTile label="5-star reviews" value={stats.fiveStar} icon="certificates" tone="emerald" hint="Top marks" />
        <StatTile label="Events reviewed" value={aggregate.length || stats.events} icon="events" tone="blue" hint="With at least one response" />
      </div>

      {feedbackApi.error ? (
        <Alert tone="error">{feedbackApi.error}</Alert>
      ) : null}

      <Panel>
        <Toolbar>
          <FilterSelect
            value={eventId}
            onChange={setEventId}
            options={eventOptions}
            placeholder="All events"
            className="sm:min-w-[16rem]"
          />
          <span className="text-[0.72rem] text-mist">
            {eventId ? "Filtered to a single event" : "Showing feedback from every event"}
          </span>
          <span className="ml-auto inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
            <MessageSquare size={14} /> {feedbackApi.loading ? "Loading…" : `${items.length} comment${items.length === 1 ? "" : "s"}`}
          </span>
        </Toolbar>

        <div className="grid gap-5 px-5 py-5 lg:grid-cols-[280px_1fr]">
          <div className="space-y-4">
            <div className="rounded-2xl border border-line bg-lavender/50 px-4 py-4">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-mist">Overall rating</p>
              <p className="mt-1 font-display text-3xl font-bold text-ink">
                {items.length ? stats.average.toFixed(1) : "—"}
                <span className="ml-1 text-[0.8rem] font-medium text-mist">/ 5</span>
              </p>
              <div className="mt-1.5">
                <Stars value={stats.average} size={16} />
              </div>
              <p className="mt-1.5 text-[0.68rem] text-mist">
                {items.length} response{items.length === 1 ? "" : "s"}
                {selectedEvent ? ` · ${selectedEvent.label}` : ""}
              </p>
            </div>

            <div>
              <p className="label">Rating distribution</p>
              {feedbackApi.loading ? (
                <div className="space-y-2">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <Skeleton key={index} className="h-5" />
                  ))}
                </div>
              ) : (
                <div className="space-y-2">
                  {[5, 4, 3, 2, 1].map((rating) => {
                    const count = stats.distribution[rating];
                    return (
                      <div key={rating} className="flex items-center gap-2">
                        <span className="inline-flex w-8 shrink-0 items-center gap-0.5 text-[0.7rem] font-medium text-ink-2">
                          {rating} <Star size={10} className="text-amber-500" fill="currentColor" />
                        </span>
                        <div className="h-2 flex-1 overflow-hidden rounded-full bg-lavender">
                          <div
                            className="h-full rounded-full bg-gradient-to-r from-amber-400 to-amber-500"
                            style={{ width: `${pct(count, items.length)}%` }}
                          />
                        </div>
                        <span className="w-8 shrink-0 text-right text-[0.68rem] text-mist">{count}</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-[0.92rem] font-semibold text-ink">Comments</h3>
              <span className="text-[0.68rem] text-mist">Newest first · read-only</span>
            </div>
            {feedbackApi.loading ? (
              <div className="space-y-3">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className="h-24" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-line px-4 py-14 text-center">
                <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
                  <MessageSquare size={18} />
                </span>
                <p className="text-[0.82rem] text-mist">No feedback has been submitted{eventId ? " for this event" : ""} yet.</p>
              </div>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {items.map((item) => (
                  <article key={item.id} className="rounded-2xl border border-line bg-white px-4 py-3.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-[0.6rem] font-bold text-white">
                          {initials(item.user?.name || "Student")}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-[0.78rem] font-semibold text-ink">{item.user?.name || "Student"}</p>
                          <p className="truncate text-[0.64rem] text-mist">{item.user?.matricRollNumber || "No roll"}</p>
                        </div>
                      </div>
                      <Stars value={item.rating} />
                    </div>

                    {item.suggestions ? (
                      <p className="mt-2.5 text-[0.78rem] leading-relaxed text-ink-2">{item.suggestions}</p>
                    ) : (
                      <p className="mt-2.5 text-[0.74rem] italic text-mist">No written comment.</p>
                    )}

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
                      {item.organization != null ? (
                        <span className="chip !text-[0.64rem]">
                          <ThumbsUp size={10} /> Organisation {item.organization}
                        </span>
                      ) : null}
                      {item.quality != null ? (
                        <span className="chip !text-[0.64rem]">Quality {item.quality}</span>
                      ) : null}
                      {item.event ? (
                        <Link href={`/events/${item.event.slug}`} className="badge badge-blue hover:underline">
                          {item.event.title}
                        </Link>
                      ) : (
                        <span className="badge badge-slate">Event removed</span>
                      )}
                      <span className="ml-auto whitespace-nowrap text-[0.64rem] text-mist">{formatDate(item.createdAt)}</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </div>
      </Panel>

      <Panel title="Per-event averages" description="Click an event to filter the comments above.">
        <div className="overflow-x-auto">
          <table className="table-console">
            <thead>
              <tr>
                <th>Event</th>
                <th>Responses</th>
                <th>Overall</th>
                <th>Organisation</th>
                <th>Quality</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {feedbackApi.loading ? (
                <tr>
                  <td colSpan={6} className="!py-8 text-center text-[0.8rem] text-mist">Loading aggregates…</td>
                </tr>
              ) : aggregate.length === 0 ? (
                <tr>
                  <td colSpan={6} className="!py-10 text-center text-[0.8rem] text-mist">
                    <span className="inline-flex items-center gap-2">
                      <Users size={14} /> No event has collected feedback yet.
                    </span>
                  </td>
                </tr>
              ) : (
                aggregate.map((row) => (
                  <tr key={row.eventId}>
                    <td className="font-medium text-ink">{row.title}</td>
                    <td>{row.count}</td>
                    <td>
                      <span className="inline-flex items-center gap-1.5 font-semibold text-ink">
                        {row.rating} <Star size={11} className="text-amber-500" fill="currentColor" />
                      </span>
                    </td>
                    <td className="text-ink-2">{row.organization ?? "—"}</td>
                    <td className="text-ink-2">{row.quality ?? "—"}</td>
                    <td className="text-right">
                      <button
                        type="button"
                        onClick={() => setEventId(row.eventId)}
                        className="btn btn-ghost btn-sm !px-2.5"
                        title="Filter comments"
                      >
                        Filter
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Panel>
    </div>
  );
}
