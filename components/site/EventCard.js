import Link from "next/link";
import { CalendarDays, MapPin, Users } from "lucide-react";
import TiltCard from "@/components/ui/TiltCard";
import StatusBadge from "@/components/ui/StatusBadge";
import RegisterButton from "@/components/site/RegisterButton";
import { formatDate, formatTime, pct } from "@/lib/utils";

const monthFmt = new Intl.DateTimeFormat("en-GB", { month: "short" });
const dayFmt = new Intl.DateTimeFormat("en-GB", { day: "2-digit" });

export default function EventCard({ event, isAuthed = false, compact = false, className = "" }) {
  if (!event) return null;
  const start = new Date(event.startAt);
  const fill = pct(event.registeredCount || 0, event.capacity || 0);

  return (
    <TiltCard intensity={4} className={className}>
      <article className="card card-hover group relative flex h-full flex-col overflow-hidden">
        <Link href={`/events/${event.slug}`} className="relative block aspect-[16/10] overflow-hidden bg-lavender">
          {event.poster ? (
            <img
              src={event.poster}
              alt={event.title}
              loading="lazy"
              className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-[#ddd6fe] via-[#e0e7ff] to-[#bfdbfe]" />
          )}
          <div className="absolute inset-x-0 top-0 flex items-start justify-between p-3.5">
            <span className="rounded-xl bg-white/92 px-2.5 py-1 text-[0.66rem] font-bold uppercase tracking-[0.12em] text-purple shadow-sm backdrop-blur">
              {event.category}
            </span>
            <StatusBadge status={event.status} dot />
          </div>
          <div className="absolute bottom-3.5 left-3.5 flex items-center gap-2.5 rounded-2xl bg-white/95 px-3 py-2 shadow-[0_10px_30px_-14px_rgba(23,19,50,0.45)] backdrop-blur">
            <span className="font-display text-2xl font-bold leading-none text-ink">{dayFmt.format(start)}</span>
            <span className="text-[0.6rem] font-semibold uppercase leading-tight tracking-[0.18em] text-mist">
              {monthFmt.format(start)}
              <br />
              {new Intl.DateTimeFormat("en-GB", { weekday: "short" }).format(start)}
            </span>
          </div>
        </Link>

        <div className="flex flex-1 flex-col p-5">
          <div className="flex items-center gap-2 text-[0.7rem] font-medium text-mist">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays size={13} className="text-purple" />
              {formatDate(start)} · {formatTime(start)}
            </span>
          </div>

          <h3 className="mt-2.5 line-clamp-2 font-display text-[1.05rem] font-bold leading-snug text-ink">
            <Link href={`/events/${event.slug}`} className="transition-colors hover:text-purple">
              {event.title}
            </Link>
          </h3>

          {!compact && event.excerpt ? (
            <p className="mt-2 line-clamp-2 text-[0.82rem] leading-relaxed text-mist">{event.excerpt}</p>
          ) : null}

          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.74rem] text-mist">
            <span className="inline-flex items-center gap-1.5">
              <MapPin size={13} className="text-blue" />
              {event.venue}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Users size={13} className="text-blue" />
              {event.registeredCount || 0}/{event.capacity || 0}
            </span>
          </div>

          <div className="mt-auto pt-4">
            <div className="mb-3">
              <div className="flex items-center justify-between text-[0.68rem] font-medium text-mist">
                <span>{fill >= 90 ? "Almost full" : `${fill}% filled`}</span>
                <span>{event.seatsLeft ?? Math.max(0, (event.capacity || 0) - (event.registeredCount || 0))} seats left</span>
              </div>
              <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-lilac">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-blue transition-[width] duration-700"
                  style={{ width: `${Math.max(4, fill)}%` }}
                />
              </div>
            </div>
            <div className="flex items-center justify-between gap-3">
              <Link
                href={`/events/${event.slug}`}
                className="text-[0.78rem] font-semibold text-ink-2 transition hover:text-purple"
              >
                View details
              </Link>
              <RegisterButton
                eventId={event.id}
                eventSlug={event.slug}
                phase={event.status}
                isAuthed={isAuthed}
              />
            </div>
          </div>
        </div>
      </article>
    </TiltCard>
  );
}
