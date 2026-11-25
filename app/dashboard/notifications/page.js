"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  Award,
  Bell,
  Building2,
  CalendarCheck,
  CalendarClock,
  CalendarDays,
  CheckCheck,
  Check,
  FolderOpen,
  Info,
  Inbox,
  ListChecks,
  Loader2,
  Megaphone,
  MessagesSquare,
  Medal,
  Sparkles,
  Trophy,
} from "lucide-react";
import { ChipTabs, ConsoleHeading, Panel, Skeleton, Toolbar, fetchJson, useApi } from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { timeAgo } from "@/lib/utils";

const TYPE_ICONS = {
  application: Inbox,
  interview: CalendarClock,
  file_review: FolderOpen,
  society: Building2,
  event: CalendarDays,
  registration: CalendarCheck,
  reminder: Bell,
  competition: Trophy,
  result: Medal,
  certificate: Award,
  group: MessagesSquare,
  task: ListChecks,
  points: Sparkles,
  announcement: Megaphone,
  system: Info,
};

const TYPE_TONES = {
  certificate: "bg-amber-50 text-amber-600",
  competition: "bg-blue-50 text-blue-600",
  result: "bg-emerald-50 text-emerald-600",
  points: "bg-violet-50 text-purple",
  task: "bg-rose-50 text-rose-600",
  group: "bg-blue-50 text-blue-600",
};

export default function NotificationsPage() {
  const { toast } = useToast();
  const { data, loading, error, reload, setData } = useApi("/api/notifications?limit=60");
  const [tab, setTab] = useState("all");
  const [busy, setBusy] = useState("");

  const notifications = useMemo(() => data?.notifications || [], [data]);
  const unread = data?.unread || 0;
  const filtered = useMemo(
    () => (tab === "unread" ? notifications.filter((item) => !item.read) : notifications),
    [notifications, tab]
  );

  const markRead = async (item) => {
    if (!item || item.read) return;
    setBusy(item.id);
    try {
      await fetchJson("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id }),
      });
      setData((prev) =>
        prev
          ? {
              ...prev,
              unread: Math.max(0, (prev.unread || 0) - 1),
              notifications: prev.notifications.map((row) => (row.id === item.id ? { ...row, read: true } : row)),
            }
          : prev
      );
    } catch (err) {
      toast(err.message || "Could not mark this notification as read.", "error");
    } finally {
      setBusy("");
    }
  };

  const markAll = async () => {
    setBusy("all");
    try {
      await fetchJson("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ all: true }),
      });
      setData((prev) => (prev ? { ...prev, unread: 0, notifications: prev.notifications.map((row) => ({ ...row, read: true })) } : prev));
      toast("All notifications marked as read.", "success");
    } catch (err) {
      toast(err.message || "Could not update notifications.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <>
      <ConsoleHeading
        eyebrow="Inbox"
        title="Notifications"
        description={`Updates about your registrations, applications, tasks and certificates${unread ? ` · ${unread} unread` : ""}.`}
        actions={
          <button type="button" className="btn btn-secondary btn-sm" onClick={markAll} disabled={!unread || busy === "all"}>
            {busy === "all" ? <Loader2 size={13} className="animate-spin" /> : <CheckCheck size={13} />}
            Mark all read
          </button>
        }
      />

      <Panel bodyClassName="p-0">
        <Toolbar>
          <ChipTabs
            tabs={[
              { value: "all", label: `All (${notifications.length})` },
              { value: "unread", label: `Unread (${unread})` },
            ]}
            value={tab}
            onChange={setTab}
          />
        </Toolbar>

        {loading ? (
          <div className="space-y-3 p-5">
            {Array.from({ length: 5 }).map((_, index) => (
              <Skeleton key={index} className="h-20" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Bell}
            title={tab === "unread" ? "You are all caught up" : "No notifications yet"}
            description={
              tab === "unread"
                ? "Unread updates will appear here. Switch to All to review older activity."
                : "Registration approvals, application decisions and certificates will appear here."
            }
            action={
              tab === "unread" ? (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setTab("all")}>
                  View all notifications
                </button>
              ) : null
            }
          />
        ) : (
          <ul className="divide-y divide-line">
            {filtered.map((item) => {
              const Icon = TYPE_ICONS[item.type] || Bell;
              const tone = TYPE_TONES[item.type] || "bg-lavender text-purple";
              const content = (
                <div className="flex flex-1 items-start gap-3">
                  <span className={`mt-0.5 grid h-9 w-9 shrink-0 place-items-center rounded-xl ${tone}`}>
                    <Icon size={16} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {!item.read ? <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-purple" /> : null}
                      <p className={`truncate text-[0.84rem] ${item.read ? "font-medium text-ink-2" : "font-semibold text-ink"}`}>{item.title}</p>
                    </div>
                    {item.message ? <p className="mt-0.5 text-[0.74rem] leading-relaxed text-mist">{item.message}</p> : null}
                    <p className="mt-1 text-[0.64rem] uppercase tracking-[0.08em] text-mist">{timeAgo(item.createdAt)}</p>
                  </div>
                </div>
              );

              return (
                <li key={item.id} className={`flex items-center gap-3 px-4 py-3.5 sm:px-5 ${item.read ? "" : "bg-lavender/30"}`}>
                  {item.link ? (
                    <Link
                      href={item.link}
                      onClick={() => markRead(item)}
                      className="flex min-w-0 flex-1 items-center gap-3 transition hover:opacity-90"
                    >
                      {content}
                    </Link>
                  ) : (
                    <div className="flex min-w-0 flex-1 items-center gap-3">{content}</div>
                  )}
                  {!item.read ? (
                    <button
                      type="button"
                      onClick={() => markRead(item)}
                      disabled={busy === item.id}
                      className="btn btn-ghost btn-sm shrink-0"
                      aria-label="Mark as read"
                    >
                      {busy === item.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />}
                      <span className="hidden sm:inline">Read</span>
                    </button>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </Panel>
    </>
  );
}
