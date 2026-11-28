import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  Award,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users2,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import Countdown from "@/components/site/Countdown";
import CompetitionEntryPanel from "@/components/site/CompetitionEntryPanel";
import CompetitionCard from "@/components/site/CompetitionCard";
import CopyButton from "@/components/ui/CopyButton";
import LazyImage from "@/components/ui/LazyImage";
import Reveal from "@/components/ui/Reveal";
import { getSessionUser } from "@/lib/auth";
import { getCompetitionDetail } from "@/lib/content";
import { formatDateRange, formatDateTime, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getCompetitionDetail(slug);
  if (!data) return { title: "Competition not found" };
  return { title: data.competition.title, description: data.competition.excerpt };
}

export default async function CompetitionDetailPage({ params }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const data = await getCompetitionDetail(slug, user?.id);
  if (!data) notFound();

  const { competition, entries, related, raw, myEntry } = data;
  const team = competition.teamSize
    ? `${competition.teamSize.min || 1}–${competition.teamSize.max || competition.teamSize.min || 1} per team`
    : "Individual";

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#bfdbfe]/70 blur-3xl" />
          <div className="bg-dots absolute inset-0 opacity-60" />
        </div>
        <div className="container-x relative py-10 sm:py-14">
          <Link href="/competitions" className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-mist transition hover:text-purple">
            <ArrowLeft size={14} /> Back to competitions
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-blue">{competition.type}</span>
                <span className="badge badge-violet">{competition.category}</span>
                <StatusBadge status={competition.status} kind="competition" dot />
              </div>
              <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.7rem]">
                {competition.title}
              </h1>
              {competition.excerpt ? (
                <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-mist">{competition.excerpt}</p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-3">
                {[
                  { icon: CalendarDays, label: "When", value: formatDateRange(competition.startAt, competition.endAt) },
                  { icon: MapPin, label: "Venue", value: competition.venue || "Campus" },
                  { icon: Users2, label: "Format", value: `${competition.mode === "team" ? "Team" : "Solo"} · ${team}` },
                ].map((item) => (
                  <div key={item.label} className="flex items-center gap-2.5 rounded-xl border border-line bg-white px-3.5 py-3">
                    <item.icon size={16} className="shrink-0 text-purple" />
                    <div className="min-w-0">
                      <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">{item.label}</p>
                      <p className="truncate text-[0.78rem] font-semibold text-ink">{item.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              {competition.society ? (
                <Link
                  href={`/societies/${competition.society.slug}`}
                  className="mt-5 inline-flex items-center gap-2 text-[0.76rem] font-semibold text-mist transition hover:text-purple"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-lilac text-[0.6rem] font-bold text-purple">
                    {competition.society.name?.slice(0, 1)}
                  </span>
                  Organised by {competition.society.name}
                </Link>
              ) : null}
            </div>

            <div className="overflow-hidden rounded-[1.6rem] border border-white bg-white shadow-[0_35px_70px_-40px_rgba(23,19,50,0.5)]">
              {competition.poster ? (
                <LazyImage
                  priority
                  src={competition.poster}
                  alt={competition.title}
                  sizes="(min-width: 1024px) 660px, 92vw"
                  className="aspect-[16/11] w-full object-cover"
                />
              ) : (
                <div className="aspect-[16/11] w-full bg-gradient-to-br from-[#e9e3ff] via-[#e0e7ff] to-[#dbeafe]" />
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <Reveal className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">About the competition</h2>
            <div className="mt-3 space-y-3 text-[0.9rem] leading-relaxed text-ink-2/90">
              {String(competition.description || "")
                .split("\n")
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
            {raw.rules?.length ? (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-display text-[0.95rem] font-bold text-ink">
                  <ShieldCheck size={16} className="text-blue" /> Rules
                </h3>
                <ol className="mt-3 space-y-2">
                  {raw.rules.map((rule, index) => (
                    <li key={rule} className="flex items-start gap-2.5 text-[0.83rem] text-ink-2/90">
                      <span className="mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full bg-lilac text-[0.62rem] font-bold text-purple">
                        {index + 1}
                      </span>
                      {rule}
                    </li>
                  ))}
                </ol>
              </div>
            ) : null}
            {raw.requirements ? (
              <p className="mt-5 rounded-xl bg-lavender px-4 py-3 text-[0.82rem] leading-relaxed text-ink-2">
                <span className="font-semibold text-purple">Requirements · </span>
                {raw.requirements}
              </p>
            ) : null}
          </Reveal>

          <Reveal className="card overflow-hidden">
            <div className="flex items-center justify-between border-b border-line px-6 py-4">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Trophy size={17} className="text-amber" /> Participants
              </h2>
              <span className="chip">{entries.length} entries</span>
            </div>
            {entries.length ? (
              <div className="divide-y divide-line">
                {entries.map((entry, index) => (
                  <div key={entry.id} className="flex items-center gap-3 px-6 py-3.5">
                    <span className="w-6 text-center text-[0.72rem] font-bold text-mist">{index + 1}</span>
                    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-lilac text-[0.7rem] font-bold text-purple">
                      {entry.avatar ? (
                        <img loading="lazy" decoding="async" src={entry.avatar} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initials(entry.name)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.84rem] font-semibold text-ink">{entry.teamName || entry.name}</p>
                      <p className="truncate text-[0.7rem] text-mist">
                        {entry.teamName ? `Captain · ${entry.name}` : entry.members?.length ? entry.members.map((m) => m.name).join(", ") : "Solo entry"}
                      </p>
                    </div>
                    {competition.leaderboardPublished && entry.position !== "none" ? (
                      <StatusBadge status={entry.position} kind="position" />
                    ) : null}
                    {competition.leaderboardPublished && entry.score !== null && entry.score !== undefined ? (
                      <span className="chip shrink-0">{entry.score} pts</span>
                    ) : null}
                  </div>
                ))}
              </div>
            ) : (
              <p className="px-6 py-10 text-center text-sm text-mist">No approved entries yet — be the first to enter.</p>
            )}
            {!competition.leaderboardPublished ? (
              <p className="border-t border-line bg-lavender/60 px-6 py-3 text-[0.72rem] text-mist">
                Scores and positions appear once the organiser publishes results.
              </p>
            ) : null}
          </Reveal>
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line bg-gradient-to-br from-[#f6f2ff] to-[#eef4ff] px-6 py-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-purple">Entry</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="font-display text-2xl font-bold text-ink">{competition.entryCount || 0} entries</p>
                <span className="text-[0.72rem] text-mist">of {competition.capacity || "∞"}</span>
              </div>
            </div>
            <div className="space-y-4 p-6">
              {competition.status === "registration_open" ? (
                <Countdown target={competition.registrationDeadline} label="Entries close in" />
              ) : null}

              <CompetitionEntryPanel
                competition={competition}
                isAuthed={Boolean(user)}
                verified={user?.verificationStatus === "verified"}
                myEntry={myEntry}
              />

              <div className="hairline" />
              <div className="space-y-2 text-[0.78rem] text-mist">
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5"><Clock size={13} /> Deadline</span>
                  <span className="font-semibold text-ink-2">{formatDateTime(competition.registrationDeadline)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5"><Award size={13} /> Prizes</span>
                  <span className="text-right font-semibold text-ink-2">{competition.prizeDetails || "Certificates"}</span>
                </p>
              </div>
              <CopyButton value={`/competitions/${competition.slug}`} label="Share competition" />
            </div>
          </div>

          {competition.prizeDetails ? (
            <div className="card mt-4 p-5">
              <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-amber">
                <Sparkles size={13} /> Prize pool
              </p>
              <p className="mt-2 text-[0.84rem] leading-relaxed text-ink-2">{competition.prizeDetails}</p>
              <p className="mt-3 flex items-center gap-1.5 text-[0.72rem] text-mist">
                <CheckCircle2 size={13} className="text-emerald" /> Winners receive verified certificates.
              </p>
            </div>
          ) : null}
        </aside>
      </div>

      {related.length ? (
        <section className="section border-t border-line bg-lavender/50">
          <div className="container-x">
            <h2 className="font-display text-2xl font-bold text-ink">More competitions</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <CompetitionCard key={item.id} competition={item} />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
