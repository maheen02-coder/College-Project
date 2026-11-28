"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, CalendarPlus, Save } from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FormField,
  Panel,
  Toggle,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { EVENT_CATEGORIES, EVENT_STATUSES, EVENT_STATUS_META, EVENT_TYPES } from "@/lib/constants";

function toIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function EventBasicsFields({ form, set, errors }) {
  return (
    <div className="space-y-4">
      <FormField label="Title" error={errors.title} hint="Shown across the public events listing (4–140 characters).">
        <input
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          maxLength={140}
          placeholder="e.g. KIPS Annual Science Gala"
          className="field"
        />
      </FormField>
      <FormField label="Short excerpt" error={errors.excerpt} hint="One-line teaser for cards (max 300 characters).">
        <textarea
          value={form.excerpt}
          onChange={(e) => set("excerpt", e.target.value)}
          maxLength={300}
          rows={2}
          className="field resize-y"
          placeholder="A quick line students will see on the event card."
        />
      </FormField>
      <FormField label="Description" error={errors.description} hint="Minimum 20 characters.">
        <textarea
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={6}
          className="field resize-y"
          placeholder="What happens at this event, who should attend and what to bring."
        />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" error={errors.category}>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className="field">
            <option value="">Select category</option>
            {EVENT_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Event type" error={errors.type}>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className="field">
            <option value="">Select type</option>
            {EVENT_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Venue" error={errors.venue}>
        <input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="field" placeholder="Auditorium, Block A" />
      </FormField>
    </div>
  );
}

export function EventScheduleFields({ form, set, errors, societies }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Registration opens" error={errors.registrationOpenAt}>
          <input type="datetime-local" value={form.registrationOpenAt} onChange={(e) => set("registrationOpenAt", e.target.value)} className="field" />
        </FormField>
        <FormField label="Registration deadline" error={errors.registrationDeadline}>
          <input type="datetime-local" value={form.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} className="field" />
        </FormField>
        <FormField label="Event starts" error={errors.startAt}>
          <input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className="field" />
        </FormField>
        <FormField label="Event ends" error={errors.endAt}>
          <input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} className="field" />
        </FormField>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Capacity" error={errors.capacity} hint="Total seats including pending registrations.">
          <input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className="field" />
        </FormField>
        <FormField label="Registration type" hint="Approval requires you to confirm each student.">
          <select value={form.registrationType} onChange={(e) => set("registrationType", e.target.value)} className="field">
            <option value="open">Open — auto-approve</option>
            <option value="approval">Approval required</option>
          </select>
        </FormField>
      </div>
      <FormField label="Hosting society" hint="Optional — link this event to a campus society.">
        <select value={form.societyId} onChange={(e) => set("societyId", e.target.value)} className="field">
          <option value="">No society</option>
          {(societies || []).map((society) => (
            <option key={society.id} value={society.id}>
              {society.name}
            </option>
          ))}
        </select>
      </FormField>
      <FormField label="Status" hint="Defaults to registration open. Public phase still depends on dates.">
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field">
          {EVENT_STATUSES.map((item) => (
            <option key={item} value={item}>
              {EVENT_STATUS_META[item]?.label || item}
            </option>
          ))}
        </select>
      </FormField>
      <div className="space-y-2">
        <Toggle checked={form.featured} onChange={(value) => set("featured", value)} label="Feature this event" description="Pin it to the public homepage and featured scope." />
        <Toggle checked={form.feedbackEnabled} onChange={(value) => set("feedbackEnabled", value)} label="Collect feedback" description="Let attendees rate the event after it ends." />
      </div>
    </div>
  );
}

export function EventContentFields({ form, set }) {
  return (
    <div className="space-y-4">
      <FormField label="Requirements" hint="Eligibility, dress code, prerequisites.">
        <textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={3} className="field resize-y" />
      </FormField>
      <FormField label="Notes" hint="Internal or public notes about logistics.">
        <textarea value={form.notes} onChange={(e) => set("notes", e.target.value)} rows={3} className="field resize-y" />
      </FormField>
      <div className="grid gap-4 lg:grid-cols-2">
        <FormField label="Rules" hint="One rule per line.">
          <textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={4} className="field resize-y" placeholder={"No food in the auditorium\nBring your student card"} />
        </FormField>
        <FormField label="Highlights" hint="One highlight per line.">
          <textarea value={form.highlights} onChange={(e) => set("highlights", e.target.value)} rows={4} className="field resize-y" placeholder={"Live robotics demo\nGuest keynote"} />
        </FormField>
      </div>
      <FormField label="Gallery image URLs" hint="One URL per line.">
        <textarea value={form.gallery} onChange={(e) => set("gallery", e.target.value)} rows={3} className="field resize-y" placeholder="https://…" />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <FormField label="Poster URL" hint="Portrait or landscape image used on cards.">
          <input value={form.poster} onChange={(e) => set("poster", e.target.value)} className="field" placeholder="https://…" />
        </FormField>
        <div>
          <span className="label">Preview</span>
          {form.poster ? (
            <img loading="lazy" decoding="async" src={form.poster} alt="Poster preview" className="h-24 w-full rounded-xl border border-line object-cover" />
          ) : (
            <div className="grid h-24 w-full place-items-center rounded-xl border border-dashed border-line bg-lavender text-mist">
              <CalendarPlus size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function validateEventForm(form) {
  const errors = {};
  if (form.title.trim().length < 4) errors.title = "Title needs at least 4 characters.";
  if (form.description.trim().length < 20) errors.description = "Description needs at least 20 characters.";
  if (!form.category) errors.category = "Select a category.";
  if (!form.type) errors.type = "Select an event type.";
  if (form.venue.trim().length < 2) errors.venue = "Venue is required.";
  if (!form.capacity || Number(form.capacity) < 1) errors.capacity = "Capacity must be at least 1.";
  if (!form.registrationOpenAt) errors.registrationOpenAt = "Pick a registration opening time.";
  if (!form.registrationDeadline) errors.registrationDeadline = "Pick a registration deadline.";
  if (!form.startAt) errors.startAt = "Pick a start time.";
  if (!form.endAt) errors.endAt = "Pick an end time.";
  if (Object.keys(errors).length) return errors;

  const open = new Date(form.registrationOpenAt);
  const deadline = new Date(form.registrationDeadline);
  const start = new Date(form.startAt);
  const end = new Date(form.endAt);
  if (open >= deadline) errors.registrationDeadline = "Deadline must be after registration opens.";
  else if (deadline > start) errors.registrationDeadline = "Deadline must be on or before the event start.";
  if (start >= end) errors.endAt = "End time must be after the start.";
  return errors;
}

export function buildEventPayload(form) {
  return {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    description: form.description.trim(),
    category: form.category,
    type: form.type,
    startAt: toIso(form.startAt),
    endAt: toIso(form.endAt),
    registrationOpenAt: toIso(form.registrationOpenAt),
    registrationDeadline: toIso(form.registrationDeadline),
    venue: form.venue.trim(),
    capacity: Number(form.capacity),
    registrationType: form.registrationType,
    requirements: form.requirements,
    notes: form.notes,
    rules: form.rules.split("\n").map((line) => line.trim()).filter(Boolean),
    highlights: form.highlights.split("\n").map((line) => line.trim()).filter(Boolean),
    gallery: form.gallery.split("\n").map((line) => line.trim()).filter(Boolean),
    poster: form.poster.trim(),
    featured: Boolean(form.featured),
    feedbackEnabled: Boolean(form.feedbackEnabled),
    status: form.status,
    societyId: form.societyId || "",
  };
}

export const emptyEventForm = (societyId = "") => ({
  title: "",
  excerpt: "",
  description: "",
  category: "",
  type: "",
  startAt: "",
  endAt: "",
  registrationOpenAt: "",
  registrationDeadline: "",
  venue: "",
  capacity: 100,
  registrationType: "open",
  requirements: "",
  notes: "",
  rules: "",
  highlights: "",
  gallery: "",
  poster: "",
  featured: false,
  feedbackEnabled: false,
  status: "registration_open",
  societyId,
});

export default function NewEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(() => emptyEventForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const { data: societyData } = useApi("/api/societies");

  const set = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => ({ ...current, [key]: undefined }));
  };

  async function submit(event) {
    event.preventDefault();
    setServerError("");
    const nextErrors = validateEventForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast("Check the highlighted fields.", "error", "Form incomplete");
      return;
    }
    setSaving(true);
    try {
      const json = await fetchJson("/api/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEventPayload(form)),
      });
      toast("Event published. Managing the console now.", "success", "Event created");
      router.push(`/admin/events/${json.item.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err.message);
      toast(err.message, "error", "Could not create event");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConsoleHeading
        eyebrow="Programme management"
        title="Create event"
        description="Publish a new campus event. Dates are checked against the registration window before saving."
        actions={
          <>
            <Link href="/admin/events" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back to events
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              <Save size={14} /> {saving ? "Publishing…" : "Publish event"}
            </button>
          </>
        }
      />

      {serverError ? (
        <div className="mb-4">
          <Alert tone="error">{serverError}</Alert>
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="Event details" description="Core information shown on the public event page." bodyClassName="p-5">
            <EventBasicsFields form={form} set={set} errors={errors} />
          </Panel>
          <Panel title="Content" description="Requirements, rules, highlights and imagery." bodyClassName="p-5">
            <EventContentFields form={form} set={set} />
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Schedule & registration" description="Registration must open before the deadline, and the deadline cannot fall after the start." bodyClassName="p-5">
            <EventScheduleFields form={form} set={set} errors={errors} societies={societyData?.items || []} />
          </Panel>
          <Alert tone="info">
            New events default to <strong>registration open</strong>. The public status also reflects the dates you set, so a
            published event appears as upcoming until registration opens.
          </Alert>
        </div>
      </div>
    </form>
  );
}
