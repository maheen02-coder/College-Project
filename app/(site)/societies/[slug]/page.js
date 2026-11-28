import Link from "next/link";
import { notFound } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  CalendarClock,
  Mail,
  Sparkles,
  Target,
  Trophy,
  Users,
} from "lucide-react";
import EventCard from "@/components/site/EventCard";
import CompetitionCard from "@/components/site/CompetitionCard";
import LazyImage from "@/components/ui/LazyImage";
import Reveal from "@/components/ui/Reveal";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { getSocietyDetail } from "@/lib/content";
import { formatDate, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const data = await getSocietyDetail(slug);
  if (!data) return { title: "Society not found" };
  return { title: data.society.name, description: data.society.tagline };
}

export default async function SocietyDetailPage({ params }) {
  const { slug } = await params;
  const user = await getSessionUser();
  const data = await getSocietyDetail(slug);
  if (!data) notFound();
  const { society, members, events, competitions, recruitments, gallery } = data;
  const accent = society.color || "#7c3aed";
  const leadership = members.filter((member) => member.role !== "member" && member.role !== "volunteer");
  const generalMembers = members.filter((member) => member.role === "member" || member.role === "volunteer");

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line">
        <div className="h-44 w-full sm:h-56" style={{ background: `linear-gradient(120deg, ${accent}, #2563eb)` }}>
          {society.cover ? (
            <LazyImage priority src={society.cover} alt="" sizes="100vw" className="h-full w-full object-cover opacity-90" />
          ) : null}
        </div>
        <div className="container-x relative pb-8">
          <div className="-mt-12 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div className="flex items-end gap-4">
              <span
                className="grid h-24 w-24 shrink-0 place-items-center overflow-hidden rounded-3xl border-4 border-white text-2xl font-bold text-white shadow-[0_20px_40px_-20px_rgba(23,19,50,0.6)]"
                style={{ background: `linear-gradient(135deg, ${accent}, #2563eb)` }}
              >
                {society.logo ? <img loading="lazy" decoding="async" src={society.logo} alt="" className="h-full w-full object-cover" /> : initials(society.name)}
              </span>
              <div className="pb-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="badge badge-violet">{society.category}</span>
                  {society.featured ? <span className="badge badge-amber"><Sparkles size={11} /> Featured</span> : null}
                </div>
                <h1 className="mt-1.5 font-display text-2xl font-bold text-ink sm:text-3xl">{society.name}</h1>
                <p className="text-[0.84rem] text-mist">{society.tagline}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2 pb-1">
              <span className="chip"><Users size={13} className="text-purple" /> {society.memberCount} members</span>
              <span className="chip"><CalendarDays size={13} className="text-blue" /> {society.eventCount} events</span>
              {society.openRecruitments ? (
                <Link href="/recruitment" className="chip bg-emerald/10 text-emerald">
                  {society.openRecruitments} open role{society.openRecruitments > 1 ? "s" : ""}
                </Link>
              ) : null}
            </div>
          </div>
          <Link href="/societies" className="mt-4 inline-flex items-center gap-1.5 text-[0.74rem] font-semibold text-mist transition hover:text-purple">
            <ArrowLeft size={13} /> All societies
          </Link>
        </div>
      </section>

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          <Reveal className="card p-6 sm:p-8">
            <h2 className="font-display text-xl font-bold text-ink">About the society</h2>
            <div className="mt-3 space-y-3 text-[0.9rem] leading-relaxed text-ink-2/90">
              {String(society.description || "")
                .split("\n")
                .filter(Boolean)
                .map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
            </div>
            {society.purpose ? (
              <div className="mt-5 rounded-xl border border-line bg-lavender/60 px-4 py-3.5">
                <p className="flex items-center gap-1.5 text-[0.66rem] font-bold uppercase tracking-[0.14em] text-purple">
                  <Target size={13} /> Our purpose
                </p>
                <p className="mt-1.5 text-[0.85rem] leading-relaxed text-ink-2">{society.purpose}</p>
              </div>
            ) : null}
            {society.activities?.length ? (
              <div className="mt-5">
                <p className="text-[0.66rem] font-bold uppercase tracking-[0.14em] text-mist">What we do</p>
                <div className="mt-2.5 flex flex-wrap gap-2">
                  {society.activities.map((activity) => (
                    <span key={activity} className="chip">{activity}</span>
                  ))}
                </div>
              </div>
            ) : null}
          </Reveal>

          {leadership.length ? (
            <Reveal className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">Leadership</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {leadership.map((leader) => (
                  <div key={leader.id} className="flex items-center gap-3 rounded-xl border border-line px-3.5 py-3">
                    <span className="grid h-10 w-10 place-items-center overflow-hidden rounded-full bg-lilac text-[0.74rem] font-bold text-purple">
                      {leader.avatar ? <img loading="lazy" decoding="async" src={leader.avatar} alt="" className="h-full w-full object-cover" /> : initials(leader.name)}
                    </span>
                    <div className="min-w-0">
                      <p className="truncate text-[0.85rem] font-semibold text-ink">{leader.name}</p>
                      <p className="text-[0.7rem] text-mist">{leader.department || leader.classYear || "KIPS student"}</p>
                    </div>
                    <StatusBadge status={leader.role} kind="society_role" className="ml-auto" />
                  </div>
                ))}
              </div>
              {generalMembers.length ? (
                <p className="mt-4 text-[0.76rem] text-mist">
                  + {generalMembers.length} active member{generalMembers.length > 1 ? "s" : ""} and volunteers.
                </p>
              ) : null}
            </Reveal>
          ) : null}

          {events.length ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Upcoming events</h2>
                <Link href={`/events?society=${society.slug}`} className="text-[0.78rem] font-semibold text-purple">
                  View all
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {events.slice(0, 4).map((event) => (
                  <EventCard key={event.id} event={event} isAuthed={Boolean(user)} compact />
                ))}
              </div>
            </div>
          ) : null}

          {competitions.length ? (
            <div>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-display text-lg font-bold text-ink">Competitions</h2>
                <Link href="/competitions" className="text-[0.78rem] font-semibold text-purple">
                  View all
                </Link>
              </div>
              <div className="grid gap-5 sm:grid-cols-2">
                {competitions.slice(0, 4).map((competition) => (
                  <CompetitionCard key={competition.id} competition={competition} />
                ))}
              </div>
            </div>
          ) : null}

          {gallery.length ? (
            <Reveal className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">Society gallery</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                {gallery.map((item) =>
                  (item.images?.length ? item.images.slice(0, 2) : [item.cover]).filter(Boolean).map((image) => (
                    <LazyImage
                      key={`${item.id}-${image}`}
                      src={image}
                      alt={item.title}
                      sizes="(min-width: 640px) 33vw, 92vw"
                      className="h-32 w-full rounded-xl object-cover"
                    />
                  ))
                )}
              </div>
            </Reveal>
          ) : null}
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          {recruitments.length ? (
            <div className="card p-5">
              <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-purple">
                <CalendarClock size={13} /> Recruitment
              </p>
              <div className="mt-3 space-y-2.5">
                {recruitments.map((recruitment) => (
                  <div key={recruitment.id} className="rounded-xl border border-line px-3.5 py-3">
                    <div className="flex items-start justify-between gap-2">
                      <p className="text-[0.84rem] font-semibold text-ink">{recruitment.title}</p>
                      <StatusBadge status={recruitment.status} kind="recruitment" />
                    </div>
                    <p className="mt-1 text-[0.7rem] text-mist">Closes {formatDate(recruitment.closesAt)}</p>
                    {recruitment.status === "open" && new Date(recruitment.closesAt) > new Date() ? (
                      <Link href={`/recruitment/${recruitment.id}`} className="mt-2 inline-flex items-center gap-1 text-[0.74rem] font-semibold text-purple">
                        Apply <ArrowUpRight size={12} />
                      </Link>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="card p-5">
            <p className="text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mist">Details</p>
            <div className="mt-3 space-y-2.5 text-[0.8rem]">
              {society.foundedYear ? (
                <p className="flex items-center justify-between"><span className="text-mist">Founded</span><span className="font-semibold text-ink-2">{society.foundedYear}</span></p>
              ) : null}
              {society.meetingSchedule ? (
                <p className="flex items-center justify-between gap-3"><span className="text-mist">Meets</span><span className="text-right font-semibold text-ink-2">{society.meetingSchedule}</span></p>
              ) : null}
              {society.email ? (
                <p className="flex items-center justify-between gap-2">
                  <span className="text-mist">Contact</span>
                  <a href={`mailto:${society.email}`} className="inline-flex items-center gap-1 font-semibold text-purple">
                    <Mail size={12} /> Email
                  </a>
                </p>
              ) : null}
              <p className="flex items-center justify-between"><span className="text-mist">Category</span><span className="font-semibold text-ink-2">{society.category}</span></p>
            </div>
          </div>

          {generalMembers.length ? (
            <div className="card p-5">
              <p className="flex items-center gap-1.5 text-[0.65rem] font-bold uppercase tracking-[0.14em] text-mist">
                <Trophy size={13} /> Members
              </p>
              <div className="mt-3 grid grid-cols-6 gap-2">
                {generalMembers.slice(0, 12).map((member) => (
                  <span key={member.id} className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-lilac text-[0.62rem] font-bold text-purple" title={member.name}>
                    {member.avatar ? <img loading="lazy" decoding="async" src={member.avatar} alt="" className="h-full w-full object-cover" /> : initials(member.name)}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-[0.72rem] text-mist">{society.memberCount} active members</p>
            </div>
          ) : null}
        </aside>
      </div>
    </div>
  );
}
