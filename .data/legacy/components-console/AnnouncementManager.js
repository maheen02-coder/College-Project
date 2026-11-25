"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Megaphone, Pin, PinOff, Send, Trash2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn, timeAgo } from "@/lib/utils";

const AUDIENCES = [
  ["all", "Everyone"],
  ["students", "Students"],
  ["organizers", "Organizers"],
];

export default function AnnouncementManager({ announcements }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({ title: "", body: "", audience: "all", pinned: false });
  const [creating, setCreating] = useState(false);
  const [busy, setBusy] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const create = async (event) => {
    event.preventDefault();
    setCreating(true);
    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not publish the announcement.", "error");
        return;
      }
      toast("Announcement published.", "success");
      setForm({ title: "", body: "", audience: "all", pinned: false });
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setCreating(false);
    }
  };

  const patch = async (announcement, body, message) => {
    setBusy(announcement.id);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update the announcement.", "error");
        return;
      }
      toast(message, "success");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
    }
  };

  const remove = async (announcement) => {
    if (!window.confirm(`Delete "${announcement.title}"? This cannot be undone.`)) return;
    setBusy(announcement.id);
    try {
      const res = await fetch(`/api/announcements/${announcement.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not delete the announcement.", "error");
        return;
      }
      toast("Announcement deleted.", "info");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setBusy("");
    }
  };

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,420px)_minmax(0,1fr)]">
      <form onSubmit={create} className="panel h-fit p-5 sm:p-6">
        <div className="flex items-center gap-2">
          <span className="grid h-8 w-8 place-items-center rounded-lg border border-violet-400/25 bg-violet-500/10 text-violet-300">
            <Megaphone size={14} />
          </span>
          <div>
            <h2 className="font-display text-[0.95rem] font-semibold text-white">New announcement</h2>
            <p className="text-[0.7rem] text-mist">Posted to student and organizer dashboards instantly.</p>
          </div>
        </div>

        <div className="mt-5 space-y-3">
          <div>
            <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
              Title
            </label>
            <input
              value={form.title}
              onChange={(event) => update("title", event.target.value)}
              required
              minLength={5}
              maxLength={140}
              placeholder="e.g. Tech Summit registration closes Friday"
              className="field py-2 text-[0.8rem]"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
              Message
            </label>
            <textarea
              value={form.body}
              onChange={(event) => update("body", event.target.value)}
              required
              minLength={10}
              maxLength={1200}
              rows={5}
              placeholder="What do students need to know?"
              className="field resize-none py-2 text-[0.8rem]"
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div>
              <label className="mb-1.5 block text-[0.68rem] font-medium uppercase tracking-[0.14em] text-mist">
                Audience
              </label>
              <select
                value={form.audience}
                onChange={(event) => update("audience", event.target.value)}
                className="field py-2 text-[0.8rem]"
              >
                {AUDIENCES.map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            <label className="flex cursor-pointer items-end gap-2 pb-2.5">
              <input
                type="checkbox"
                checked={form.pinned}
                onChange={(event) => update("pinned", event.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              <span className="text-[0.76rem] text-white/85">Pin to top</span>
            </label>
          </div>
        </div>

        <button type="submit" disabled={creating} className="btn btn-primary btn-sm mt-4 w-full">
          {creating ? <Loader2 size={13} className="animate-spin" /> : <Send size={13} />}
          Publish announcement
        </button>
      </form>

      <div className="space-y-3">
        {announcements.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 px-6 py-16 text-center text-[0.8rem] text-mist">
            No announcements yet. Publish the first one to reach the campus.
          </div>
        ) : (
          announcements.map((announcement) => (
            <article
              key={announcement.id}
              className={cn(
                "rounded-2xl border bg-white/[0.02] p-4",
                announcement.pinned ? "border-violet-400/25" : "border-white/[0.06]",
                !announcement.isActive ? "opacity-60" : ""
              )}
            >
              <div className="flex items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    {announcement.pinned ? <span className="badge badge-violet">Pinned</span> : null}
                    <span className="badge badge-slate">{announcement.audience}</span>
                    {!announcement.isActive ? <span className="badge badge-rose">Hidden</span> : null}
                  </div>
                  <h3 className="mt-2 font-display text-[0.95rem] font-semibold text-white">{announcement.title}</h3>
                  <p className="mt-1 whitespace-pre-line text-[0.76rem] leading-relaxed text-mist">{announcement.body}</p>
                  <p className="mt-2 text-[0.64rem] text-mist/70">
                    {announcement.publishedByName || "Administration"} · {timeAgo(announcement.createdAt)}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-end gap-1.5 border-t border-white/[0.05] pt-3">
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      announcement,
                      { pinned: !announcement.pinned },
                      announcement.pinned ? "Unpinned." : "Pinned to top."
                    )
                  }
                  disabled={busy === announcement.id}
                  className="btn btn-ghost btn-sm"
                >
                  {announcement.pinned ? <PinOff size={12} /> : <Pin size={12} />}
                  {announcement.pinned ? "Unpin" : "Pin"}
                </button>
                <button
                  type="button"
                  onClick={() =>
                    patch(
                      announcement,
                      { isActive: !announcement.isActive },
                      announcement.isActive ? "Announcement hidden." : "Announcement published."
                    )
                  }
                  disabled={busy === announcement.id}
                  className="btn btn-ghost btn-sm"
                >
                  {announcement.isActive ? "Hide" : "Publish"}
                </button>
                <button
                  type="button"
                  onClick={() => remove(announcement)}
                  disabled={busy === announcement.id}
                  className="btn btn-ghost btn-sm text-rose-300 hover:bg-rose-500/10"
                >
                  {busy === announcement.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />}
                  Delete
                </button>
              </div>
            </article>
          ))
        )}
      </div>
    </div>
  );
}
