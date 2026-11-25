import Link from "next/link";
import { ArrowUpRight, CalendarDays, Sparkles, Users } from "lucide-react";
import { initials } from "@/lib/utils";

export default function SocietyCard({ society, className = "" }) {
  if (!society) return null;
  const accent = society.color || "#7c3aed";

  return (
    <Link
      href={`/societies/${society.slug}`}
      className={`card card-hover group relative flex h-full flex-col overflow-hidden ${className}`}
    >
      <div className="relative h-24 overflow-hidden">
        {society.cover ? (
          <img
            src={society.cover}
            alt=""
            loading="lazy"
            className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
          />
        ) : (
          <div
            className="h-full w-full"
            style={{ background: `linear-gradient(120deg, ${accent}, #2563eb)` }}
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-white/30 to-transparent" />
        {society.openRecruitments ? (
          <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-emerald shadow-sm">
            {society.openRecruitments} opening{society.openRecruitments > 1 ? "s" : ""}
          </span>
        ) : null}
      </div>

      <div className="relative flex flex-1 flex-col px-5 pb-5">
        <div className="-mt-7 mb-3 flex items-end justify-between">
          <span
            className="grid h-14 w-14 place-items-center overflow-hidden rounded-2xl border-4 border-white text-lg font-bold text-white shadow-[0_12px_28px_-14px_rgba(23,19,50,0.5)]"
            style={{ background: `linear-gradient(135deg, ${accent}, #2563eb)` }}
          >
            {society.logo ? (
              <img src={society.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(society.name)
            )}
          </span>
          <span className="rounded-full bg-lavender px-2.5 py-1 text-[0.62rem] font-semibold uppercase tracking-[0.1em] text-purple">
            {society.category}
          </span>
        </div>

        <h3 className="font-display text-[1.02rem] font-bold leading-snug text-ink transition-colors group-hover:text-purple">
          {society.name}
        </h3>
        <p className="mt-1.5 line-clamp-2 text-[0.82rem] leading-relaxed text-mist">{society.tagline}</p>

        <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.73rem] text-mist">
          <span className="inline-flex items-center gap-1.5">
            <Users size={13} className="text-purple" />
            {society.memberCount || 0} members
          </span>
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={13} className="text-blue" />
            {society.eventCount || 0} events
          </span>
          {society.leaders?.[0] ? (
            <span className="inline-flex items-center gap-1.5">
              <Sparkles size={13} className="text-amber" />
              {society.leaders[0].name}
            </span>
          ) : null}
        </div>

        <span className="mt-auto inline-flex items-center gap-1.5 pt-4 text-[0.78rem] font-semibold text-purple">
          Explore society <ArrowUpRight size={14} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
        </span>
      </div>
    </Link>
  );
}
