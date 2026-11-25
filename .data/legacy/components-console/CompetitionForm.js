"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Loader2, Save, Trophy } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import PosterField from "@/components/console/PosterField";
import { COMPETITION_CATEGORIES, COMPETITION_TYPES } from "@/lib/constants";

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

function defaults(competition) {
  if (competition) {
    return {
      title: competition.title,
      excerpt: competition.excerpt || "",
      description: competition.description,
      category: competition.category,
      type: competition.type,
      mode: competition.mode,
      teamMin: competition.teamSize?.min || 2,
      teamMax: competition.teamSize?.max || 3,
      venue: competition.venue,
      capacity: competition.capacity,
      startAt: toLocal(competition.startAt),
      endAt: toLocal(competition.endAt),
      registrationDeadline: toLocal(competition.registrationDeadline),
      submissionDeadline: toLocal(competition.submissionDeadline || ""),
      prizeDetails: competition.prizeDetails || "",
      rules: (competition.rules || []).join("\n"),
      requirements: competition.requirements || "",
      poster: competition.poster || "",
      status: competition.storedStatus || "registration_open",
      leaderboardPublished: Boolean(competition.leaderboardPublished),
      organizer: competition.organizerId || "",
    };
  }
  return {
    title: "",
    excerpt: "",
    description: "",
    category: COMPETITION_CATEGORIES[0],
    type: COMPETITION_TYPES[0],
    mode: "individual",
    teamMin: 2,
    teamMax: 4,
    venue: "",
    capacity: 60,
    startAt: daysFromNow(18, 10),
    endAt: daysFromNow(18, 17),
    registrationDeadline: daysFromNow(15, 23),
    submissionDeadline: "",
    prizeDetails: "",
    rules: "",
    requirements: "",
    poster: "",
    status: "registration_open",
    leaderboardPublished: false,
    organizer: "",
  };
}

export default function CompetitionForm({
  competition = null,
  organizers = [],
  canAssignOrganizer = false,
  basePath = "/organizer/competitions",
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState(() => defaults(competition));
  const [saving, setSaving] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        excerpt: form.excerpt,
        description: form.description,
        category: form.category,
        type: form.type,
        mode: form.mode,
        teamSize: form.mode === "team" ? { min: Number(form.teamMin), max: Number(form.teamMax) } : { min: 1, max: 1 },
        venue: form.venue,
        capacity: Number(form.capacity),
        startAt: new Date(form.startAt).toISOString(),
        endAt: new Date(form.endAt).toISOString(),
        registrationDeadline: new Date(form.registrationDeadline).toISOString(),
        submissionDeadline: form.submissionDeadline ? new Date(form.submissionDeadline).toISOString() : "",
        prizeDetails: form.prizeDetails,
        rules: form.rules,
        requirements: form.requirements,
        poster: form.poster,
        status: form.status,
      };
      if (canAssignOrganizer && form.organizer) payload.organizer = form.organizer;
      if (competition) payload.leaderboardPublished = form.leaderboardPublished;

      const res = await fetch(competition ? `/api/competitions/${competition.id}` : "/api/competitions", {
        method: competition ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not save the competition.", "error");
        return;
      }
      toast(competition ? "Competition updated." : "Competition published.", "success");
      const id = competition ? competition.id : data.competition.id;
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
        <h2 className="font-display text-base font-semibold text-white">Competition basics</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Competition title
            </label>
            <input value={form.title} onChange={(e) => update("title", e.target.value)} required minLength={4} maxLength={120} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Short excerpt
            </label>
            <input value={form.excerpt} onChange={(e) => update("excerpt", e.target.value)} maxLength={240} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Description
            </label>
            <textarea value={form.description} onChange={(e) => update("description", e.target.value)} required minLength={20} rows={5} className="field resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Type
            </label>
            <select value={form.type} onChange={(e) => update("type", e.target.value)} className="field">
              {COMPETITION_TYPES.map((type) => (
                <option key={type}>{type}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Category
            </label>
            <select value={form.category} onChange={(e) => update("category", e.target.value)} className="field">
              {COMPETITION_CATEGORIES.map((category) => (
                <option key={category}>{category}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Format
            </label>
            <select value={form.mode} onChange={(e) => update("mode", e.target.value)} className="field">
              <option value="individual">Individual</option>
              <option value="team">Team</option>
            </select>
          </div>
          {form.mode === "team" ? (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
                  Min team
                </label>
                <input type="number" min={2} max={10} value={form.teamMin} onChange={(e) => update("teamMin", e.target.value)} className="field" />
              </div>
              <div>
                <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
                  Max team
                </label>
                <input type="number" min={2} max={10} value={form.teamMax} onChange={(e) => update("teamMax", e.target.value)} className="field" />
              </div>
            </div>
          ) : null}
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Venue
            </label>
            <input value={form.venue} onChange={(e) => update("venue", e.target.value)} required className="field" />
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
        <h2 className="font-display text-base font-semibold text-white">Dates & capacity</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          {[
            ["Starts", "startAt", true],
            ["Ends", "endAt", true],
            ["Entry deadline", "registrationDeadline", true],
            ["Submission deadline", "submissionDeadline", false],
          ].map(([label, key, required]) => (
            <div key={key}>
              <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
                {label}
              </label>
              <input
                type="datetime-local"
                value={form[key]}
                onChange={(e) => update(key, e.target.value)}
                required={required}
                className="field [color-scheme:dark]"
              />
            </div>
          ))}
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Entry capacity
            </label>
            <input type="number" min={1} value={form.capacity} onChange={(e) => update("capacity", e.target.value)} required className="field" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Status
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
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Prize details
            </label>
            <input value={form.prizeDetails} onChange={(e) => update("prizeDetails", e.target.value)} maxLength={300} className="field" placeholder="e.g. PKR 50,000 pool + certificates" />
          </div>
          {competition ? (
            <label className="sm:col-span-2 flex cursor-pointer items-center gap-2.5 rounded-xl border border-white/[0.06] bg-white/[0.02] px-4 py-3">
              <input
                type="checkbox"
                checked={form.leaderboardPublished}
                onChange={(e) => update("leaderboardPublished", e.target.checked)}
                className="h-4 w-4 accent-violet-500"
              />
              <span className="flex items-center gap-1.5 text-[0.78rem] text-white/85">
                <Trophy size={13} className="text-amber-300" /> Publish results on the public leaderboard
              </span>
            </label>
          ) : null}
        </div>
      </section>

      <section className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Rules & eligibility</h2>
        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Rules <span className="normal-case tracking-normal">(one per line)</span>
            </label>
            <textarea value={form.rules} onChange={(e) => update("rules", e.target.value)} rows={5} className="field resize-none" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Requirements
            </label>
            <textarea value={form.requirements} onChange={(e) => update("requirements", e.target.value)} rows={5} className="field resize-none" />
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
          {saving ? "Saving…" : competition ? "Save changes" : "Publish competition"}
        </button>
      </div>
    </form>
  );
}
