"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, Trophy } from "lucide-react";
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
import { COMPETITION_CATEGORIES, COMPETITION_TYPES } from "@/lib/constants";

const COMPETITION_STATUSES = ["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"];
const STATUS_LABELS = {
  upcoming: "Upcoming",
  registration_open: "Registration open",
  registration_closed: "Registration closed",
  ongoing: "In progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

function toIso(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString();
}

export function CompetitionBasicsFields({ form, set, errors }) {
  return (
    <div className="space-y-4">
      <FormField label="Title" error={errors.title} hint="4–140 characters.">
        <input value={form.title} onChange={(e) => set("title", e.target.value)} maxLength={140} className="field" placeholder="e.g. Inter-Society Coding Challenge" />
      </FormField>
      <FormField label="Short excerpt" error={errors.excerpt} hint="Teaser shown on cards (max 300 characters).">
        <textarea value={form.excerpt} onChange={(e) => set("excerpt", e.target.value)} maxLength={300} rows={2} className="field resize-y" />
      </FormField>
      <FormField label="Description" error={errors.description} hint="Minimum 20 characters.">
        <textarea value={form.description} onChange={(e) => set("description", e.target.value)} rows={6} className="field resize-y" placeholder="Format, judging criteria and what entrants should prepare." />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Category" error={errors.category}>
          <select value={form.category} onChange={(e) => set("category", e.target.value)} className="field">
            <option value="">Select category</option>
            {COMPETITION_CATEGORIES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
        <FormField label="Competition type" error={errors.type}>
          <select value={form.type} onChange={(e) => set("type", e.target.value)} className="field">
            <option value="">Select type</option>
            {COMPETITION_TYPES.map((item) => (
              <option key={item} value={item}>
                {item}
              </option>
            ))}
          </select>
        </FormField>
      </div>
      <FormField label="Venue" error={errors.venue}>
        <input value={form.venue} onChange={(e) => set("venue", e.target.value)} className="field" placeholder="Computer Lab 2" />
      </FormField>
    </div>
  );
}

export function CompetitionFormatFields({ form, set, errors }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Participation mode" hint="Team mode enforces a roster on entry.">
          <select value={form.mode} onChange={(e) => set("mode", e.target.value)} className="field">
            <option value="individual">Individual</option>
            <option value="team">Team</option>
          </select>
        </FormField>
        <FormField label="Capacity" error={errors.capacity} hint="Maximum entries (individuals or teams).">
          <input type="number" min={1} value={form.capacity} onChange={(e) => set("capacity", e.target.value)} className="field" />
        </FormField>
      </div>
      {form.mode === "team" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <FormField label="Minimum team size" error={errors.teamMin} hint="At least 2 members.">
            <input type="number" min={2} value={form.teamMin} onChange={(e) => set("teamMin", e.target.value)} className="field" />
          </FormField>
          <FormField label="Maximum team size" error={errors.teamMax}>
            <input type="number" min={2} value={form.teamMax} onChange={(e) => set("teamMax", e.target.value)} className="field" />
          </FormField>
        </div>
      ) : (
        <Alert tone="info">Individual mode locks the team size to 1 participant per entry.</Alert>
      )}
      <FormField label="Status" hint="Public phase also depends on the dates below.">
        <select value={form.status} onChange={(e) => set("status", e.target.value)} className="field">
          {COMPETITION_STATUSES.map((item) => (
            <option key={item} value={item}>
              {STATUS_LABELS[item]}
            </option>
          ))}
        </select>
      </FormField>
      <Toggle
        checked={form.leaderboardPublished}
        onChange={(value) => set("leaderboardPublished", value)}
        label="Publish leaderboard immediately"
        description="Only publish once scores and positions are final — it notifies entrants and awards points."
      />
    </div>
  );
}

export function CompetitionScheduleFields({ form, set, errors, societies }) {
  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <FormField label="Registration deadline" error={errors.registrationDeadline} hint="On or before the start.">
          <input type="datetime-local" value={form.registrationDeadline} onChange={(e) => set("registrationDeadline", e.target.value)} className="field" />
        </FormField>
        <FormField label="Submission deadline" error={errors.submissionDeadline} hint="Optional — must fall inside the competition window.">
          <input type="datetime-local" value={form.submissionDeadline} onChange={(e) => set("submissionDeadline", e.target.value)} className="field" />
        </FormField>
        <FormField label="Starts" error={errors.startAt}>
          <input type="datetime-local" value={form.startAt} onChange={(e) => set("startAt", e.target.value)} className="field" />
        </FormField>
        <FormField label="Ends" error={errors.endAt}>
          <input type="datetime-local" value={form.endAt} onChange={(e) => set("endAt", e.target.value)} className="field" />
        </FormField>
      </div>
      <FormField label="Hosting society" hint="Optional — used for society leaderboards and certificates.">
        <select value={form.societyId} onChange={(e) => set("societyId", e.target.value)} className="field">
          <option value="">No society</option>
          {(societies || []).map((society) => (
            <option key={society.id} value={society.id}>
              {society.name}
            </option>
          ))}
        </select>
      </FormField>
    </div>
  );
}

export function CompetitionContentFields({ form, set }) {
  return (
    <div className="space-y-4">
      <FormField label="Prize details" hint="Short summary of awards (max 400 characters).">
        <textarea value={form.prizeDetails} onChange={(e) => set("prizeDetails", e.target.value)} maxLength={400} rows={3} className="field resize-y" placeholder="Cash prize, trophies and certificates for the top three." />
      </FormField>
      <FormField label="Requirements" hint="Eligibility, tools or prerequisites.">
        <textarea value={form.requirements} onChange={(e) => set("requirements", e.target.value)} rows={3} className="field resize-y" />
      </FormField>
      <FormField label="Rules" hint="One rule per line.">
        <textarea value={form.rules} onChange={(e) => set("rules", e.target.value)} rows={4} className="field resize-y" placeholder={"Original work only\nJudges' decision is final"} />
      </FormField>
      <div className="grid gap-4 sm:grid-cols-[1fr_10rem]">
        <FormField label="Poster URL" hint="Landscape artwork for the competition card.">
          <input value={form.poster} onChange={(e) => set("poster", e.target.value)} className="field" placeholder="https://…" />
        </FormField>
        <div>
          <span className="label">Preview</span>
          {form.poster ? (
            <img loading="lazy" decoding="async" src={form.poster} alt="Poster preview" className="h-24 w-full rounded-xl border border-line object-cover" />
          ) : (
            <div className="grid h-24 w-full place-items-center rounded-xl border border-dashed border-line bg-lavender text-mist">
              <Trophy size={20} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export function validateCompetitionForm(form) {
  const errors = {};
  if (form.title.trim().length < 4) errors.title = "Title needs at least 4 characters.";
  if (form.description.trim().length < 20) errors.description = "Description needs at least 20 characters.";
  if (!form.category) errors.category = "Select a category.";
  if (!form.type) errors.type = "Select a competition type.";
  if (form.venue.trim().length < 2) errors.venue = "Venue is required.";
  if (!form.capacity || Number(form.capacity) < 1) errors.capacity = "Capacity must be at least 1.";
  if (!form.registrationDeadline) errors.registrationDeadline = "Pick a registration deadline.";
  if (!form.startAt) errors.startAt = "Pick a start time.";
  if (!form.endAt) errors.endAt = "Pick an end time.";
  if (form.mode === "team") {
    if (Number(form.teamMin) < 2) errors.teamMin = "Teams need at least 2 members.";
    if (Number(form.teamMax) < Number(form.teamMin)) errors.teamMax = "Maximum cannot be below the minimum.";
  }
  if (Object.keys(errors).length) return errors;

  const start = new Date(form.startAt);
  const end = new Date(form.endAt);
  const deadline = new Date(form.registrationDeadline);
  const submission = form.submissionDeadline ? new Date(form.submissionDeadline) : null;
  if (start >= end) errors.endAt = "End time must be after the start.";
  else if (deadline > start) errors.registrationDeadline = "Deadline must be on or before the start.";
  else if (submission && (submission < start || submission > end)) {
    errors.submissionDeadline = "Submission must fall within the competition window.";
  }
  return errors;
}

export function buildCompetitionPayload(form) {
  return {
    title: form.title.trim(),
    excerpt: form.excerpt.trim(),
    description: form.description.trim(),
    category: form.category,
    type: form.type,
    mode: form.mode,
    teamSize: { min: Number(form.teamMin), max: Number(form.teamMax) },
    startAt: toIso(form.startAt),
    endAt: toIso(form.endAt),
    registrationDeadline: toIso(form.registrationDeadline),
    submissionDeadline: toIso(form.submissionDeadline),
    venue: form.venue.trim(),
    capacity: Number(form.capacity),
    prizeDetails: form.prizeDetails,
    rules: form.rules.split("\n").map((line) => line.trim()).filter(Boolean),
    requirements: form.requirements,
    poster: form.poster.trim(),
    leaderboardPublished: Boolean(form.leaderboardPublished),
    status: form.status,
    societyId: form.societyId || "",
  };
}

export const emptyCompetitionForm = () => ({
  title: "",
  excerpt: "",
  description: "",
  category: "",
  type: "",
  mode: "individual",
  teamMin: 2,
  teamMax: 4,
  startAt: "",
  endAt: "",
  registrationDeadline: "",
  submissionDeadline: "",
  venue: "",
  capacity: 50,
  prizeDetails: "",
  rules: "",
  requirements: "",
  poster: "",
  leaderboardPublished: false,
  status: "registration_open",
  societyId: "",
});

export default function NewCompetitionPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(() => emptyCompetitionForm());
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
    const nextErrors = validateCompetitionForm(form);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) {
      toast("Check the highlighted fields.", "error", "Form incomplete");
      return;
    }
    setSaving(true);
    try {
      const json = await fetchJson("/api/competitions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(buildCompetitionPayload(form)),
      });
      toast("Competition published.", "success", "Competition created");
      router.push(`/admin/competitions/${json.item.id}`);
      router.refresh();
    } catch (err) {
      setServerError(err.message);
      toast(err.message, "error", "Could not create competition");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={submit} noValidate>
      <ConsoleHeading
        eyebrow="Competitions & results"
        title="Create competition"
        description="Set the format, entry window and judging timeline. Entries close at the registration deadline."
        actions={
          <>
            <Link href="/admin/competitions" className="btn btn-ghost btn-sm">
              <ArrowLeft size={14} /> Back to competitions
            </Link>
            <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
              <Save size={14} /> {saving ? "Publishing…" : "Publish competition"}
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
