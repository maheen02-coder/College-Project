"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, Sparkles } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import PosterField from "@/components/console/PosterField";
import { EVENT_CATEGORIES, EVENT_TYPES } from "@/lib/constants";

function toLocal(value) {
  if (!value) return "";
  const date = new Date(value);
  const offset = date.getTimezoneOffset();
  return new Date(date.getTime() - offset * 60000).toISOString().slice(0, 16);
}

function daysFromNow(days, hour = 10) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  date.setHours(hour, 0, 0, 0);
  return toLocal(date.toISOString());
}

function defaults(event) {
  if (event) {
    return {
      title: event.title,
      excerpt: event.excerpt || "",
      description: event.description,
      category: event.category,
      type: event.type,
      venue: event.venue,
      capacity: event.capacity,
      startAt: toLocal(event.startAt),
      endAt: toLocal(event.endAt),
      registrationOpenAt: toLocal(event.registrationOpenAt),
      registrationDeadline: toLocal(event.registrationDeadline),
      requirements: event.requirements || "",
      rules: (event.rules || []).join("\n"),
      highlights: (event.highlights || []).join("\n"),
      featured: Boolean(event.featured),
      poster: event.poster || "",
      status: event.storedStatus || "registration_open",
      organizer: event.organizerId || "",
    };
  }
  return {
    title: "",
    excerpt: "",
    description: "",
    category: EVENT_CATEGORIES[0],
    type: EVENT_TYPES[0],
    venue: "",
    capacity: 100,
    startAt: daysFromNow(14, 9),
    endAt: daysFromNow(14, 13),
    registrationOpenAt: toLocal(new Date().toISOString()),
    registrationDeadline: daysFromNow(10, 23),
    requirements: "",
    rules: "",
    highlights: "",
    featured: false,
    poster: "",
    status: "registration_open",
    organizer: "",
  };
}

export default function EventForm({ event = null, organizers = [], canAssignOrganizer = false, basePath = "/organizer/events" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(() => defaults(event));
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event_) => {
    event_.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...form,
        capacity: Number(form.capacity),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        registrationOpenAt: new Date(form.registrationOpenAt).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
      };
      if (!canAssignOrganizer) delete payload.organizer;
      if (!payload.organizer) delete payload.organizer;

      const res = await fetch(event ? `/api/events/${event.id}` : "/api/events", {
        method: event ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not save the event.", "error");
        return;
      }
      toast(event ? "Event updated." : "Event published.", "success");
      const id = event ? event.id : data.event.id;
      router.push(`${basePath}/${id}`);
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-5">
      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Event basics</h2>
        <p className="mt-0.5 text-[0.74rem] text-mist">What students see first on the calendar and event page.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Event title
            </label>
            <input value={form.title} onChange={(e) => update("title", e.target.value)} required minLength={4} maxLength={120} className="field" placeholder="e.g. Nexus Tech Summit 2026" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Short excerpt
            </label>
            <input value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} maxLength={240} className="field" placeholder="One line that sells the event." />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Description
            </label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} required minLength={20} rows={5} className="field resize-none" placeholder="Full event details, agenda and what to expect." />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Category
            </label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="field">
              {EVENT_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Event type
            </label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)} className="field">
              {EVENT_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Venue
            </label>
            <input value={form.venue} onChange={(e) => update("venue", e.target.value)} required className="field" placeholder="e.g. Main Auditorium" />
          </div>
          {canAssignOrganizer ? (
            <div>
              <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
                Assigned organizer
              </label>
              <select value={form.organizer} onChange={(e) => update("organizer", e.target.value)} className="field">
                <option value="">Assign to me</option>
                {organizers.map((organizer) => (
                  <option key={organizer.id} value={organizer.id}>
                    {organizer.name}
                  </option>
                ))}
              </select>
            </div>
          ) : null}
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Schedule & registration window</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["Event starts", "startAt"],
            ["Event ends", "endAt"],
            ["Registration opens", "registrationOpenAt"],
            ["Registration deadline", "registrationDeadline"],
          ].map(([label, key]) => (
            <div key={key}>
              <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
                {label}
              </label>
              <input
                type="datetime-local"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                required
                className="field [color-scheme:dark]"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Participant capacity
            </label>
            <input type="number" min={1} value={form.capacity} onChange={(e) => update("capacity", e.target.value)} required className="field" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Publishing status
            </label>
            <select value={form.status} onChange={(e) => update("status", e.target.value)} className="field">
              <option value="upcoming">Upcoming</option>
              <option value="registration_open">Registration open</option>
              <option value="registration_closed">Registration closed</option>
              <option value="ongoing">Ongoing</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
          <label className="sm:col-span-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
            <input
              type="checkbox"
              checked={form.featured}
              onChange={(e) => update("featured", e.target.checked)}
              className="h-4 w-4 accent-violet-500"
            />
            <span className="flex items-center gap-1.5 text-[0.78rem] text-white/85">
              <Sparkles size={13} className="text-amber-300" /> Feature on the homepage
            </span>
          </label>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Content & guidelines</h2>
        <p className="mt-0.5 text-[0.74rem] text-mist">One item per line — rules and highlights render as lists.</p>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Event rules
            </label>
            <textarea value={form.rules} onChange={(e) => update("rules", e.target.value)} rows={5} className="field resize-none" placeholder={"Bring your student ID\nNo late entries"} />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Highlights
            </label>
            <textarea value={form.highlights} onChange={(e) => update("highlights", e.target.value)} rows={5} className="field resize-none" placeholder={"Live demos\nNetworking session"} />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Eligibility & requirements
            </label>
            <textarea value={form.requirements} onChange={(e) => update("requirements", e.target.value)} rows={3} className="field resize-none" />
          </div>
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Poster</h2>
        <div className="mt-4">
          <PosterField value={form.poster} onChange={(value) => update("poster", value)} />
        </div>
      </section>

      <div className="flex flex-wrap items-center justify-end gap-2">
        <Link href={basePath} className="btn btn-ghost btn-sm">
          Cancel
        </Link>
        <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? "Saving…" : event ? "Save changes" : "Publish event"}
        </button>
      </div>
    </form>
  );
}
