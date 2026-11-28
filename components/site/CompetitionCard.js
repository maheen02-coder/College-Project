import Link from "next/link";
import { ArrowUpRight, CalendarDays, MapPin, Trophy, Users2 } from "lucide-react";
import TiltCard from "@/components/ui/TiltCard";
import StatusBadge from "@/components/ui/StatusBadge";
import LazyImage from "@/components/ui/LazyImage";
import { formatDate } from "@/lib/utils";

export default function CompetitionCard({ competition, className = "" }) {
  if (!competition) return null;
  const start = new Date(competition.startAt);
  const team = competition.teamSize
    ? `${competition.teamSize.min || 1}–${competition.teamSize.max || competition.teamSize.min || 1} per team`
    : "Solo entry";

  return (
    <TiltCard intensity={4} className={className}>
      <article className="card card-hover group flex h-full flex-col overflow-hidden">
        <Link href={`/competitions/${competition.slug}`} className="relative block aspect-[16/9] overflow-hidden bg-lavender">
          {competition.poster ? (
            <LazyImage
              src={competition.poster}
              alt={competition.title}
              sizes="(min-width: 1280px) 300px, (min-width: 1024px) 33vw, (min-width: 640px) 46vw, 92vw"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#e9e3ff] via-[#e0e7ff] to-[#dbeafe]" />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
            <span className="rounded-xl bg-white/92 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-purple shadow-sm backdrop-blur">
              {competition.type}
            </span>
            <StatusBadge status={competition.status} dot />
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2 text-[0.7rem] font-medium text-mist">
            <CalendarDays size={13} className="text-purple" />
            {formatDate(start)}
            <span className="text-line">•</span>
            {competition.mode === "team" ? "Team" : "Individual"}
          </div>

          <h3 className="mt-2 font-display text-[1.05rem] font-bold leading-snug text-ink">
            <Link href={`/competitions/${competition.slug}`} className="transition-colors hover:text-purple">
              {competition.title}
            </Link>
          </h3>

          {competition.excerpt ? (
            <p className="mt-2 line-clamp-2 text-[0.82rem] leading-relaxed text-mist">{competition.excerpt}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.74rem] text-mist">
            <span className="inline-flex items-center gap-1.5">
              <Users2 size={13} className="text-blue" />
              {team}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-blue" />
              {competition.venue || "Campus"}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Trophy size={13} className="text-amber" />
              {competition.entryCount || 0} entries
            </span>
          </div>

          <div className="mt-auto flex items-center justify-between gap-3 pt-5">
            <span className="text-[0.74rem] text-mist">
              {competition.society?.name ? `by ${competition.society.name}` : "KIPS Campus"}
            </span>
            <Link
              href={`/competitions/${competition.slug}`}
              className="inline-flex items-center gap-1.5 text-[0.8rem] font-semibold text-purple transition hover:gap-2.5"
            >
              Enter <ArrowUpRight size={14} />
            </Link>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
