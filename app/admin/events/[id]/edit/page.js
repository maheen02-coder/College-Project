"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Loader2, Save, TriangleAlert } from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  Panel,
  Skeleton,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import {
  EventBasicsFields,
  EventContentFields,
  EventScheduleFields,
  buildEventPayload,
  emptyEventForm,
  validateEventForm,
} from "../../new/page";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function listToText(value) {
  return Array.isArray(value) ? value.join("\n") : "";
}

export default function EditEventPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error } = useApi(id ? `/api/events/${id}` : null);
  const { data: societyData } = useApi("/api/societies");
  const [form, setForm] = useState(() => emptyEventForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const item = data?.item;
    if (!item || hydrated) return;
    setForm({
      ...emptyEventForm(),
      title: item.title || "",
      excerpt: item.excerpt || "",
      description: item.description || "",
      category: item.category || "",
      type: item.type || "",
      startAt: toLocalInput(item.startAt),
      endAt: toLocalInput(item.endAt),
      registrationOpenAt: toLocalInput(item.registrationOpenAt),
      registrationDeadline: toLocalInput(item.registrationDeadline),
      venue: item.venue || "",
      capacity: item.capacity ?? 100,
      registrationType: item.registrationType || "open",
      requirements: item.requirements || "",
      notes: item.notes || "",
      rules: listToText(item.rules),
      highlights: listToText(item.highlights),
      gallery: listToText(item.gallery),
      poster: item.poster || "",
      featured: Boolean(item.featured),
      feedbackEnabled: Boolean(item.feedbackEnabled),
      status: item.storedStatus || "registration_open",
      societyId: item.society?.id || "",
    });
    setHydrated(true);
  }, [data, hydrated]);

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
      await fetchJson(`/api/events/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildEventPayload(form)),
      });
      toast("Event details updated.", "success", "Changes saved");
      router.push(`/admin/events/${id}`);
      router.refresh();
    } catch (err) {
      setServerError(err.message);
      toast(err.message, "error", "Could not update event");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !hydrated) {
    return (
      <>
        <ConsoleHeading eyebrow="Programme management" title="Edit event" description="Loading event details…" />
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[420px]" />
        </div>
      </>
    );
  }

  if (error) {
    return (
      <>
        <ConsoleHeading eyebrow="Programme management" title="Edit event" />
        <Alert tone="error">
          <span className="inline-flex items-center gap-2">
            <TriangleAlert size={15} /> {error}
          </span>
        </Alert>
        <Link href="/admin/events" className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft size={14} /> Back to events
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConsoleHeading
        eyebrow="Programme management"
        title={hydrated ? `Edit · ${form.title || data?.item?.title}` : "Edit event"}
        description="Update schedule, capacity and content. Date rules are re-checked by the server on save."
        actions={
          <>
            <Link href={`/admin/events/${id}`} className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back to console
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {saving ? "Saving…" : "Save changes"}
            </button>
          </>
        }
      />

      {serverError ? (
        <div className="mb-4">
          <Alert tone="error">{serverError}</Alert>
        </div>
      ) : null}

      {data?.item?.registeredCount ? (
        <div className="mb-4">
          <Alert tone="warning">
            {data.item.registeredCount} seat{data.item.registeredCount === 1 ? "" : "s"} are already taken — capacity cannot be
            lowered below the number of active registrations.
          </Alert>
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
          <Panel title="Schedule & registration" description="Deadline must sit between registration opening and the event start." bodyClassName="p-5">
            <EventScheduleFields form={form} set={set} errors={errors} societies={societyData?.items || []} />
          </Panel>
          {data?.item?.society ? (
            <Alert tone="info">Currently hosted by {data.item.society.name}.</Alert>
          ) : null}
        </div>
      </div>
    </form>
  );
}
