import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  CalendarDays,
  CheckCircle2,
  Clock,
  MapPin,
  ShieldCheck,
  Sparkles,
  Star,
  Ticket,
  Users,
} from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import RegisterButton from "@/components/site/RegisterButton";
import CancelRegistration from "@/components/site/CancelRegistration";
import Countdown from "@/components/site/Countdown";
import EventCard from "@/components/site/EventCard";
import CopyButton from "@/components/ui/CopyButton";
import Reveal from "@/components/ui/Reveal";
import { getSessionUser } from "@/lib/auth";
import { getEventDetail } from "@/lib/content";
import { formatDate, formatDateTime, formatDateRange, formatTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getEventDetail(slug);
  if (!data) return { title: "Event not found" };
  return { title: data.event.title, description: data.event.excerpt || data.event.description?.slice(0, 150) };
}

export default async function EventDetailPage({ params }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const data = await getEventDetail(slug, user?.id);
  if (!data) notFound();

  const { event, raw, related, galleries, feedback, myRegistration } = data;
  const registered = myRegistration && myRegistration.status !== "cancelled";
  const seatsLeft = event.seatsLeft ?? Math.max(0, (event.capacity || 0) - (event.registeredCount || 0));

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#ddd6fe]/70 blur-3xl" />
          <div className="bg-dots absolute inset-0 opacity-60" />
        </div>
        <div className="container-x relative py-10 sm:py-14">
          <Link href="/events" className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-mist transition hover:text-purple">
            <ArrowLeft size={14} /> Back to events
          </Link>
          <div className="mt-6 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="badge badge-violet">{event.category}</span>
                <StatusBadge status={event.status} kind="event" dot />
                {event.registrationType === "approval" ? (
                  <span className="badge badge-slate">Approval required</span>
                ) : null}
              </div>
              <h1 className="mt-4 text-balance font-display text-3xl font-bold leading-tight tracking-tight text-ink sm:text-[2.7rem]">
                {event.title}
              </h1>
              {event.excerpt ? (
                <p className="mt-3 max-w-2xl text-[0.95rem] leading-relaxed text-mist">{event.excerpt}</p>
              ) : null}

              <div className="mt-6 grid gap-3 sm:grid-cols-2">
                <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                  <CalendarDays size={17} className="shrink-0 text-purple" />
                  <div>
                    <p className="text-[0.64rem] uppercase tracking-[0.12em] text-mist">Date & time</p>
                    <p className="text-[0.82rem] font-semibold text-ink">{formatDateRange(event.startAt, event.endAt)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-3">
                  <MapPin size={17} className="shrink-0 text-blue" />
                  <div>
                    <p className="text-[0.64rem] uppercase tracking-[0.12em] text-mist">Venue</p>
                    <p className="text-[0.82rem] font-semibold text-ink">{event.venue}</p>
                  </div>
                </div>
              </div>

              {event.society ? (
                <Link
                  href={`/societies/${event.society.slug}`}
                  className="mt-5 inline-flex items-center gap-2.5 rounded-full border border-line bg-white px-3 py-1.5 text-[0.76rem] font-semibold text-ink-2 transition hover:border-purple/40 hover:text-purple"
                >
                  <span className="grid h-6 w-6 place-items-center rounded-full bg-lilac text-[0.6rem] font-bold text-purple">
                    {event.society.name?.slice(0, 1)}
                  </span>
                  Hosted by {event.society.name}
                </Link>
              ) : null}
            </div>

            <div className="relative">
              <div className="overflow-hidden rounded-[1.6rem] border border-white bg-white shadow-[0_35px_70px_-40px_rgba(23,19,50,0.5)]">
                {event.poster ? (
                  <img src={event.poster} alt={event.title} className="aspect-[16/11] w-full object-cover" />
                ) : (
                  <div className="aspect-[16/11] w-full bg-gradient-to-br from-[#ddd6fe] via-[#e0e7ff] to-[#bfdbfe]" />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <Reveal className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">About this event</h2>
            <div className="mt-3 space-y-3 text-[0.9rem] leading-relaxed text-ink-2/90">
              {String(event.description || "")
                .split("\n")
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>

            {raw.highlights?.length ? (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-display text-[0.95rem] font-bold text-ink">
                  <Sparkles size={16} className="text-amber" /> Highlights
                </h3>
                <ul className="mt-3 grid gap-2 sm:grid-cols-2">
                  {raw.highlights.map((item) => (
                    <li key={item} className="flex items-start gap-2 rounded-xl bg-lavender px-3.5 py-2.5 text-[0.82rem] text-ink-2">
                      <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald" />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {raw.rules?.length ? (
              <div className="mt-6">
                <h3 className="flex items-center gap-2 font-display text-[0.95rem] font-bold text-ink">
                  <ShieldCheck size={16} className="text-blue" /> Rules & guidelines
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
              <div className="mt-6 rounded-xl border border-line bg-lavender/70 px-4 py-3.5">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-purple">What to bring</p>
                <p className="mt-1.5 text-[0.84rem] leading-relaxed text-ink-2">{raw.requirements}</p>
              </div>
            ) : null}
          </Reveal>

          {raw.gallery?.length ? (
            <Reveal className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">Event gallery</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {raw.gallery.map((image) => (
                  <img key={image} src={image} alt="" loading="lazy" className="h-36 w-full rounded-xl object-cover" />
                ))}
              </div>
            </Reveal>
          ) : null}

          {galleries?.length ? (
            <Reveal className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">Photo galleries</h2>
              <div className="mt-4 space-y-4">
                {galleries.map((gallery) => (
                  <div key={gallery.id} className="rounded-xl border border-line p-3">
                    <p className="text-[0.85rem] font-semibold text-ink">{gallery.title}</p>
                    <div className="mt-2 grid gap-2 sm:grid-cols-4">
                      {(gallery.images || []).slice(0, 4).map((image) => (
                        <img key={image} src={image} alt="" loading="lazy" className="h-20 w-full rounded-lg object-cover" />
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </Reveal>
          ) : null}

          {feedback?.count ? (
            <div className="card flex items-center gap-3 p-5">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber/10 text-amber">
                <Star size={20} />
              </span>
              <div>
                <p className="font-display text-lg font-bold text-ink">{feedback.average} / 5</p>
                <p className="text-[0.75rem] text-mist">Average rating from {feedback.count} attendees</p>
              </div>
            </div>
          ) : null}
        </div>

        <aside className="lg:sticky lg:top-24 lg:self-start">
          <div className="card overflow-hidden">
            <div className="border-b border-line bg-gradient-to-br from-[#f6f2ff] to-[#eef4ff] px-6 py-5">
              <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-purple">Registration</p>
              <div className="mt-2 flex items-end justify-between">
                <p className="font-display text-2xl font-bold text-ink">{seatsLeft} seats left</p>
                <span className="text-[0.72rem] text-mist">of {event.capacity}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-white">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet to-blue"
                  style={{ width: `${Math.min(100, Math.round(((event.registeredCount || 0) / (event.capacity || 1)) * 100))}%` }}
                />
              </div>
            </div>

            <div className="space-y-4 p-6">
              {event.status === "registration_open" ? (
                <Countdown target={event.registrationDeadline} />
              ) : null}

              <div className="space-y-2 text-[0.78rem] text-mist">
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Ticket size={13} /> Registration opens
                  </span>
                  <span className="font-semibold text-ink-2">{formatDateTime(event.registrationOpenAt)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Clock size={13} /> Deadline
                  </span>
                  <span className="font-semibold text-ink-2">{formatDateTime(event.registrationDeadline)}</span>
                </p>
                <p className="flex items-center justify-between">
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={13} /> Registered
                  </span>
                  <span className="font-semibold text-ink-2">{event.registeredCount || 0}</span>
                </p>
              </div>

              <div className="hairline" />

              {registered ? (
                <div className="space-y-3">
                  <div className="rounded-xl border border-emerald/30 bg-emerald/5 px-4 py-3">
                    <p className="flex items-center gap-1.5 text-[0.72rem] font-bold uppercase tracking-[0.12em] text-emerald">
                      <CheckCircle2 size={14} /> You are registered
                    </p>
                    <p className="mt-1 text-[0.8rem] text-ink-2">
                      Status: <span className="font-semibold capitalize">{myRegistration.status}</span>
                    </p>
                    {myRegistration.registrationId ? (
                      <p className="mt-0.5 font-mono text-[0.72rem] text-mist">{myRegistration.registrationId}</p>
                    ) : null}
                  </div>
                  {["pending", "approved"].includes(myRegistration.status) && event.status !== "completed" ? (
                    <CancelRegistration registrationId={myRegistration.id} />
                  ) : null}
                  <Link href="/dashboard/events" className="btn btn-secondary btn-sm w-full">
                    Manage in dashboard
                  </Link>
                </div>
              ) : (
                <RegisterButton
                  eventId={event.id}
                  eventSlug={event.slug}
                  phase={event.status}
                  isAuthed={Boolean(user)}
                  size="md"
                  className="w-full"
                  label="Register for this event"
                />
              )}

              {!user ? (
                <p className="text-center text-[0.72rem] text-mist">
                  <Link href={`/login?next=/events/${event.slug}`} className="font-semibold text-purple">
                    Sign in
                  </Link>{" "}
                  with your KIPS student account to register.
                </p>
              ) : user.verificationStatus !== "verified" ? (
                <p className="rounded-xl bg-amber/10 px-3 py-2 text-center text-[0.72rem] text-amber">
                  Your account must be verified by the campus office before you can register.
                </p>
              ) : null}

              <CopyButton value={`/events/${event.slug}`} label="Share this event" />
            </div>
          </div>

          <div className="card mt-4 p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mist">Event schedule</p>
            <div className="mt-3 space-y-2 text-[0.8rem]">
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald" />
                <span className="text-mist">Starts</span>
                <span className="ml-auto font-semibold text-ink-2">{formatDate(event.startAt)} · {formatTime(event.startAt)}</span>
              </p>
              <p className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-rose" />
                <span className="text-mist">Ends</span>
                <span className="ml-auto font-semibold text-ink-2">{formatDate(event.endAt)} · {formatTime(event.endAt)}</span>
              </p>
            </div>
          </div>
        </aside>
      </div>

      {related.length ? (
        <section className="section border-t border-line bg-lavender/50">
          <div className="container-x">
            <h2 className="font-display text-2xl font-bold text-ink">You may also like</h2>
            <div className="mt-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((item) => (
                <EventCard key={item.id} event={item} isAuthed={Boolean(user)} compact />
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </div>
  );
}
