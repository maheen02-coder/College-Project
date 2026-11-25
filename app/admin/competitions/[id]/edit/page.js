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
  CompetitionBasicsFields,
  CompetitionContentFields,
  CompetitionFormatFields,
  CompetitionScheduleFields,
  buildCompetitionPayload,
  emptyCompetitionForm,
  validateCompetitionForm,
} from "../../new/page";

function toLocalInput(value) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (number) => String(number).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function EditCompetitionPage() {
  const params = useParams();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id;
  const router = useRouter();
  const { toast } = useToast();
  const { data, loading, error } = useApi(id ? `/api/competitions/${id}` : null);
  const { data: societyData } = useApi("/api/societies");
  const [form, setForm] = useState(() => emptyCompetitionForm());
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [serverError, setServerError] = useState("");
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const item = data?.item;
    if (!item || hydrated) return;
    setForm({
      ...emptyCompetitionForm(),
      title: item.title || "",
      excerpt: item.excerpt || "",
      description: item.description || "",
      category: item.category || "",
      type: item.type || "",
      mode: item.mode || "individual",
      teamMin: item.teamSize?.min || 2,
      teamMax: item.teamSize?.max || 4,
      startAt: toLocalInput(item.startAt),
      endAt: toLocalInput(item.endAt),
      registrationDeadline: toLocalInput(item.registrationDeadline),
      submissionDeadline: toLocalInput(item.submissionDeadline),
      venue: item.venue || "",
      capacity: item.capacity ?? 50,
      prizeDetails: item.prizeDetails || "",
      rules: Array.isArray(item.rules) ? item.rules.join("\n") : "",
      requirements: item.requirements || "",
      poster: item.poster || "",
      leaderboardPublished: Boolean(item.leaderboardPublished),
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
    const nextErrors = validateCompetitionForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast("Check the highlighted fields.", "error", "Form incomplete");
      return;
    }
    setSaving(true);
    try {
      const payload = buildCompetitionPayload(form);
      if (!form.submissionDeadline) payload.submissionDeadline = null;
      await fetchJson(`/api/competitions/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      toast("Competition updated.", "success", "Changes saved");
      router.push(`/admin/competitions/${id}`);
      router.refresh();
    } catch (err) {
      setServerError(err.message);
      toast(err.message, "error", "Could not update competition");
    } finally {
      setSaving(false);
    }
  }

  if (loading && !hydrated) {
    return (
      <>
        <ConsoleHeading eyebrow="Competitions & results" title="Edit competition" description="Loading competition details…" />
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
        <ConsoleHeading eyebrow="Competitions & results" title="Edit competition" />
        <Alert tone="error">
          <span className="inline-flex items-center gap-2">
            <TriangleAlert size={15} /> {error}
          </span>
        </Alert>
        <Link href="/admin/competitions" className="btn btn-ghost btn-sm mt-4">
          <ArrowLeft size={14} /> Back to competitions
        </Link>
      </>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConsoleHeading
        eyebrow="Competitions & results"
        title={hydrated ? `Edit · ${form.title || data?.item?.title}` : "Edit competition"}
        description="Adjust the format, timeline or entry limits. Existing entries are preserved."
        actions={
          <>
            <Link href={`/admin/competitions/${id}`} className="btn btn-ghost btn-sm">
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

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(0,1fr)]">
        <div className="space-y-5">
          <Panel title="Competition details" description="Public-facing description and classification." bodyClassName="p-5">
            <CompetitionBasicsFields form={form} set={set} errors={errors} />
          </Panel>
          <Panel title="Prizes & materials" description="Prizes, requirements, rules and poster." bodyClassName="p-5">
            <CompetitionContentFields form={form} set={set} />
          </Panel>
        </div>
        <div className="space-y-5">
          <Panel title="Format & capacity" description="Who can enter and how many entries are accepted." bodyClassName="p-5">
            <CompetitionFormatFields form={form} set={set} errors={errors} />
          </Panel>
          <Panel title="Timeline" description="Registration deadline must be on or before the start." bodyClassName="p-5">
            <CompetitionScheduleFields form={form} set={set} errors={errors} societies={societyData?.items || []} />
          </Panel>
        </div>
      </div>
    </form>
  );
}
