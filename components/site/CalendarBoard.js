"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, ChevronLeft, ChevronRight, MapPin, Trophy, UserRoundPlus } from "lucide-react";

const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function ymd(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildMonth(viewDate) {
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();
  const first = new Date(year, month, 1);
  const offset = (first.getDay() + 6) % 7;
  const start = new Date(year, month, 1 - offset);
  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    return date;
  });
}

export default function CalendarBoard({ events = [], competitions = [], recruitments = [] }) {
  const today = new Date();
  const [view, setView] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [selected, setSelected] = useState(ymd(today));

  const itemsByDate = useMemo(() => {
    const map = {};
    const push = (key, item) => {
      map[key] = [...(map[key] || []), item];
    };
    events.forEach((event) => push(ymd(event.startAt), { ...event, kind: "event" }));
    competitions.forEach((competition) => push(ymd(competition.startAt), { ...competition, kind: "competition" }));
    recruitments.forEach((recruitment) => push(ymd(recruitment.closesAt), { ...recruitment, kind: "recruitment" }));
    return map;
  }, [events, competitions, recruitments]);

  const days = buildMonth(view);
  const monthLabel = view.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const selectedItems = itemsByDate[selected] || [];

  const move = (delta) => setView(new Date(view.getFullYear(), view.getMonth() + delta, 1));

  return (
    <div className="grid gap-6 lg:grid-cols-[1.55fr_0.95fr]">
      <div className="card overflow-hidden">
        <div className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 className="font-display text-lg font-bold text-ink">{monthLabel}</h2>
          <div className="flex items-center gap-1.5">
            <button type="button" onClick={() => move(-1)} className="btn btn-ghost btn-sm px-2.5" aria-label="Previous month">
              <ChevronLeft size={15} />
            </button>
            <button
              type="button"
              onClick={() => {
                setView(new Date(today.getFullYear(), today.getMonth(), 1));
                setSelected(ymd(today));
              }}
              className="btn btn-ghost btn-sm"
            >
              Today
            </button>
            <button type="button" onClick={() => move(1)} className="btn btn-ghost btn-sm px-2.5" aria-label="Next month">
              <ChevronRight size={15} />
            </button>
          </div>
        </div>

        <div className="grid grid-cols-7 border-b border-line bg-lavender/50">
          {WEEKDAYS.map((day) => (
            <span key={day} className="px-2 py-2 text-center text-[0.62rem] font-bold uppercase tracking-[0.12em] text-mist">
              {day}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {days.map((date) => {
            const key = ymd(date);
            const inMonth = date.getMonth() === view.getMonth();
            const isToday = key === ymd(today);
            const isSelected = key === selected;
            const items = itemsByDate[key] || [];
            return (
              <button
                key={key}
                type="button"
                onClick={() => setSelected(key)}
                className={`relative min-h-[74px] border-b border-r border-line/70 p-1.5 text-left transition hover:bg-lavender/70 ${
                  isSelected ? "bg-lilac/70" : ""
                } ${inMonth ? "" : "opacity-40"}`}
              >
                <span
                  className={`inline-grid h-6 w-6 place-items-center rounded-full text-[0.7rem] font-semibold ${
                    isToday ? "bg-purple text-white" : "text-ink-2"
                  }`}
                >
                  {date.getDate()}
                </span>
                <div className="mt-1 space-y-0.5">
                  {items.slice(0, 2).map((item) => (
                    <span
                      key={`${item.kind}-${item.id}`}
                      className={`block truncate rounded px-1 py-0.5 text-[0.56rem] font-medium ${
                        item.kind === "event"
                          ? "bg-purple/10 text-purple"
                          : item.kind === "competition"
                            ? "bg-blue/10 text-blue"
                            : "bg-emerald/10 text-emerald"
                      }`}
                    >
                      {item.title}
                    </span>
                  ))}
                  {items.length > 2 ? (
                    <span className="block pl-1 text-[0.55rem] font-semibold text-mist">+{items.length - 2} more</span>
                  ) : null}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex flex-wrap items-center gap-4 px-5 py-3 text-[0.68rem] text-mist">
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-purple" /> Events</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-blue" /> Competitions</span>
          <span className="inline-flex items-center gap-1.5"><i className="h-2 w-2 rounded-full bg-emerald" /> Recruitment deadlines</span>
        </div>
      </div>

      <div className="card p-5">
        <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-purple">
          {new Date(selected).toLocaleDateString("en-GB", { weekday: "long", day: "2-digit", month: "long" })}
        </p>
        <div className="mt-3 space-y-2.5">
          {selectedItems.length ? (
            selectedItems.map((item) => (
              <div key={`${item.kind}-${item.id}`} className="rounded-xl border border-line px-3.5 py-3">
                <div className="flex items-center gap-2">
                  {item.kind === "event" ? (
                    <CalendarDays size={14} className="text-purple" />
                  ) : item.kind === "competition" ? (
                    <Trophy size={14} className="text-blue" />
                  ) : (
                    <UserRoundPlus size={14} className="text-emerald" />
                  )}
                  <span className="text-[0.62rem] font-bold uppercase tracking-[0.1em] text-mist">{item.kind}</span>
                </div>
                <p className="mt-1.5 text-[0.86rem] font-semibold text-ink">{item.title}</p>
                {item.venue ? (
                  <p className="mt-1 flex items-center gap-1.5 text-[0.7rem] text-mist">
                    <MapPin size={11} /> {item.venue}
                  </p>
                ) : null}
                <Link
                  href={item.kind === "event" ? `/events/${item.slug}` : item.kind === "competition" ? `/competitions/${item.slug}` : `/recruitment/${item.id}`}
                  className="mt-2 inline-flex text-[0.74rem] font-semibold text-purple"
                >
                  View details
                </Link>
              </div>
            ))
          ) : (
            <p className="rounded-xl bg-lavender px-4 py-8 text-center text-[0.8rem] text-mist">
              Nothing scheduled on this day.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
