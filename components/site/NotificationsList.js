"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  CalendarClock,
  CheckCheck,
  ClipboardCheck,
  FileCheck2,
  Megaphone,
  MessagesSquare,
  Sparkles,
  Ticket,
  Trophy,
  UserRoundCheck,
  Users,
} from "lucide-react";
import { timeAgo } from "@/lib/utils";

const ICONS = {
  application: ClipboardCheck,
  interview: CalendarClock,
  file_review: FileCheck2,
  society: Users,
  event: Ticket,
  registration: Ticket,
  reminder: CalendarClock,
  competition: Trophy,
  result: Award,
  certificate: Award,
  group: MessagesSquare,
  task: ClipboardCheck,
  points: Sparkles,
  announcement: Megaphone,
  system: Bell,
};

const TONES = {
  application: "bg-violet/10 text-purple",
  interview: "bg-blue/10 text-blue",
  file_review: "bg-emerald/10 text-emerald",
  result: "bg-amber/10 text-amber",
  certificate: "bg-amber/10 text-amber",
  competition: "bg-blue/10 text-blue",
  registration: "bg-violet/10 text-purple",
  group: "bg-emerald/10 text-emerald",
  points: "bg-amber/10 text-amber",
  announcement: "bg-rose/10 text-rose",
};

export default function NotificationsList({ initial = [] }) {
  const [items, setItems] = useState(initial);
  const [filter, setFilter] = useState("all");
  const [busy, setBusy] = useState(false);

  const unread = items.filter((item) => !item.read).length;
  const visible = filter === "unread" ? items.filter((item) => !item.read) : items;

  const markAll = async () => {
    setBusy(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setItems((rows) => rows.map((row) => ({ ...row, read: true })));
    } finally {
      setBusy(false);
    }
  };

  const markOne = (id) => {
    setItems((rows) => rows.map((row) => (row.id === id ? { ...row, read: true } : row)));
    fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    }).catch(() => {});
  };

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 rounded-full border border-line bg-lavender p-1">
          {[
            { key: "all", label: `All (${items.length})` },
            { key: "unread", label: `Unread (${unread})` },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilter(tab.key)}
              className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition ${
                filter === tab.key ? "bg-white text-purple shadow-sm" : "text-mist hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
        <button type="button" onClick={markAll} disabled={busy || !unread} className="btn btn-ghost btn-sm">
          <CheckCheck size={14} /> Mark all read
        </button>
      </div>

      {visible.length ? (
        <div className="space-y-2.5">
          {visible.map((item) => {
            const Icon = ICONS[item.type] || Bell;
            const tone = TONES[item.type] || "bg-lavender text-purple";
            const content = (
              <div
                className={`card flex items-start gap-3 p-4 transition hover:border-purple/40 ${
                  item.read ? "" : "border-l-4 border-l-purple bg-white"
                }`}
              >
                <span className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${tone}`}>
                  <Icon size={17} />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex items-start justify-between gap-3">
                    <p className="text-[0.86rem] font-semibold text-ink">{item.title}</p>
                    <span className="shrink-0 text-[0.66rem] text-mist">{timeAgo(item.createdAt)}</span>
                  </div>
                  <p className="mt-1 text-[0.8rem] leading-relaxed text-mist">{item.message}</p>
                </div>
                {!item.read ? <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-purple" /> : null}
              </div>
            );
            return (
              <div key={item.id} onClick={() => !item.read && markOne(item.id)}>
                {item.link ? <Link href={item.link}>{content}</Link> : content}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="card flex flex-col items-center px-6 py-14 text-center">
          <span className="grid h-14 w-14 place-items-center rounded-2xl bg-lavender text-purple">
            <UserRoundCheck size={24} />
          </span>
          <p className="mt-4 font-display text-lg font-bold text-ink">You are all caught up</p>
          <p className="mt-1 text-sm text-mist">New registrations, results and approvals will appear here.</p>
        </div>
      )}
    </div>
  );
}
