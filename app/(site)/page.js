import Link from "next/link";
import {
  ArrowRight,
  Award,
  BadgeCheck,
  CalendarDays,
  CalendarRange,
  Crown,
  Megaphone,
  Sparkles,
  Trophy,
  UserRoundPlus,
} from "lucide-react";
import HeroHome from "@/components/site/HeroHome";
import SectionHeading from "@/components/site/SectionHeading";
import EventCard from "@/components/site/EventCard";
import CompetitionCard from "@/components/site/CompetitionCard";
import SocietyCard from "@/components/site/SocietyCard";
import UpdateCard from "@/components/site/UpdateCard";
import RecruitmentCard from "@/components/site/RecruitmentCard";
import StatsBand from "@/components/site/StatsBand";
import CategoryGrid from "@/components/site/CategoryGrid";
import Reveal from "@/components/ui/Reveal";
import GateReveal from "@/components/ui/GateReveal";
import LazyImage from "@/components/ui/LazyImage";
import { getSessionUser } from "@/lib/auth";
import { getHomeData } from "@/lib/content";
import { EVENT_CATEGORIES } from "@/lib/constants";
import { initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

const QUICK_LINKS = [
  { href: "/calendar", icon: CalendarRange, title: "Campus calendar", body: "Every event and deadline in one view." },
  { href: "/updates", icon: Megaphone, title: "Latest updates", body: "Notices, results and announcements." },
  { href: "/recruitment", icon: UserRoundPlus, title: "Join a society", body: "Openings with live application forms." },
  { href: "/verify", icon: BadgeCheck, title: "Verify a certificate", body: "Check any certificate ID instantly." },
];

export default async function HomePage() {
  const [user, data] = await Promise.all([getSessionUser(), getHomeData()]);
  const { featured, upcoming, updates, societies, competitions, recruitments, galleries, topStudents, stats } = data;
  const nextEvent = upcoming[0] || featured[0] || null;
  const openCompetitions = competitions.filter((item) => item.status === "registration_open").length;
  const categories = EVENT_CATEGORIES.slice(0, 8);

  return (
    <div>
      <HeroHome nextEvent={nextEvent} stats={stats} openCompetitions={openCompetitions} />

      <section className="border-y border-line bg-white/70">
        <div className="container-x py-8">
          <StatsBand stats={stats} />
        </div>
      </section>

      {featured.length ? (
        <section className="section">
          <div className="container-x">
            <SectionHeading
              eyebrow="Featured"
              title="Highlighted events this season"
              description="Hand-picked experiences from across the campus — reserve your spot before they fill up."
              href="/events"
              linkLabel="All events"
            />
            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {featured.slice(0, 3).map((event, index) => (
                <Reveal key={event.id} delay={index * 0.06}>
                  <EventCard event={event} isAuthed={Boolean(user)} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section bg-lavender/60">
        <div className="container-x">
          <SectionHeading
            eyebrow="Browse"
            title="Find your kind of moment"
            description="From cultural nights to coding sprints, explore events by category."
          />
          <div className="mt-8">
            <CategoryGrid categories={categories} />
          </div>

          {upcoming.length ? (
            <div className="mt-14">
              <SectionHeading
                eyebrow="Coming up"
                title="Upcoming on campus"
                href="/events"
                linkLabel="Browse all"
              />
              <div className="mt-8 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
                {upcoming.slice(0, 6).map((event, index) => (
                  <Reveal key={event.id} delay={index * 0.05}>
                    <EventCard event={event} isAuthed={Boolean(user)} />
                  </Reveal>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      </section>

      {updates.length ? (
        <section className="section">
          <div className="container-x">
            <SectionHeading
              eyebrow="Campus updates"
              title="Latest news & announcements"
              description="Official notices, results and everything the campus office wants you to know."
              href="/updates"
              linkLabel="All updates"
            />
            <div className="mt-9 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
              {updates.slice(0, 3).map((update, index) => (
                <Reveal key={update.id} delay={index * 0.06}>
                  <UpdateCard update={update} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {societies.length ? (
        <section className="section bg-white/70">
          <div className="container-x">
            <SectionHeading
              eyebrow="Societies & clubs"
              title="Communities that shape campus"
              description="Eight student-led societies spanning academics, arts, sports and social welfare."
              href="/societies"
              linkLabel="All societies"
            />
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {societies.slice(0, 8).map((society, index) => (
                <Reveal key={society.id} delay={index * 0.04}>
                  <SocietyCard society={society} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      {recruitments.length ? (
        <section className="section">
          <div className="container-x">
            <div className="relative overflow-hidden rounded-[1.8rem] border border-line bg-gradient-to-br from-[#f6f2ff] via-white to-[#eef4ff] p-6 sm:p-10">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <p className="eyebrow">Recruitment open</p>
                  <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">Join a society team</h2>
                  <p className="mt-2 max-w-lg text-sm leading-relaxed text-mist">
                    Apply to active openings — answer the form, upload your portfolio and track your application
                    all the way to interview.
                  </p>
                </div>
                <Link href="/recruitment" className="btn btn-secondary btn-sm shrink-0">
                  See all openings <ArrowRight size={14} />
                </Link>
              </div>
              <div className="mt-8 grid gap-4 md:grid-cols-3">
                {recruitments.slice(0, 3).map((recruitment) => (
                  <RecruitmentCard key={recruitment.id} recruitment={recruitment} />
                ))}
              </div>
            </div>
          </div>
        </section>
      ) : null}

      {competitions.length ? (
        <section className="section bg-lavender/60">
          <div className="container-x">
            <SectionHeading
              eyebrow="Compete"
              title="Competitions & tournaments"
              description="Quiz nights, debate cups, futsal and hackathons — enter solo or with your team."
              href="/competitions"
              linkLabel="All competitions"
            />
            <div className="mt-9 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {competitions.slice(0, 4).map((competition, index) => (
                <Reveal key={competition.id} delay={index * 0.05}>
                  <CompetitionCard competition={competition} />
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container-x grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="card relative overflow-hidden p-6 sm:p-8">
            <div className="flex items-center justify-between">
              <div>
                <p className="eyebrow">Recognition</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink">Campus leaderboard</h2>
              </div>
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber/10 text-amber">
                <Crown size={20} />
              </span>
            </div>
            <div className="mt-6 space-y-3">
              {topStudents.length ? (
                topStudents.map((student, index) => (
                  <div
                    key={student.id}
                    className="flex items-center gap-3 rounded-xl border border-line bg-white px-3.5 py-3"
                  >
                    <span
                      className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg text-[0.7rem] font-bold ${
                        index === 0
                          ? "bg-amber/15 text-amber"
                          : index === 1
                            ? "bg-blue/10 text-blue"
                            : "bg-lavender text-mist"
                      }`}
                    >
                      {index + 1}
                    </span>
                    <span className="grid h-9 w-9 place-items-center overflow-hidden rounded-full bg-lilac text-[0.72rem] font-bold text-purple">
                      {student.avatar ? (
                        <LazyImage src={student.avatar} alt="" sizes="36px" className="h-full w-full object-cover" />
                      ) : (
                        initials(student.name)
                      )}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.84rem] font-semibold text-ink">{student.name}</p>
                      <p className="truncate text-[0.7rem] text-mist">
                        {student.department || student.classYear || "KIPS student"}
                      </p>
                    </div>
                    <span className="chip shrink-0">{student.points} pts</span>
                  </div>
                ))
              ) : (
                <p className="rounded-xl bg-lavender px-4 py-6 text-center text-sm text-mist">
                  Leaderboard will appear as students earn points.
                </p>
              )}
            </div>
            <Link href="/about#points" className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-purple">
              How points work <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="card flex flex-col justify-between p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-emerald/10 text-emerald">
                <Award size={20} />
              </span>
              <div className="mt-6">
                <p className="font-display text-3xl font-bold text-ink">{stats.certificates}</p>
                <p className="mt-1 text-sm text-mist">Verified certificates issued with QR validation.</p>
              </div>
            </div>
            <div className="card flex flex-col justify-between p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-blue/10 text-blue">
                <Trophy size={20} />
              </span>
              <div className="mt-6">
                <p className="font-display text-3xl font-bold text-ink">{competitions.length}</p>
                <p className="mt-1 text-sm text-mist">Competitions across academics, arts, sports and tech.</p>
              </div>
            </div>
            <div className="card flex flex-col justify-between p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-purple/10 text-purple">
                <CalendarDays size={20} />
              </span>
              <div className="mt-6">
                <p className="font-display text-3xl font-bold text-ink">{stats.events}</p>
                <p className="mt-1 text-sm text-mist">Live events open for registration right now.</p>
              </div>
            </div>
            <div className="card flex flex-col justify-between p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-amber/10 text-amber">
                <Sparkles size={20} />
              </span>
              <div className="mt-6">
                <p className="font-display text-3xl font-bold text-ink">{stats.verifiedStudents}</p>
                <p className="mt-1 text-sm text-mist">Verified student profiles across departments.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {galleries.length ? (
        <section className="section bg-white/70">
          <div className="container-x">
            <SectionHeading
              eyebrow="Gallery"
              title="Moments from campus"
              description="Relive the energy of recent events."
            />
            <GateReveal className="mt-8">
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {galleries.slice(0, 3).map((gallery) => (
                  <Reveal key={gallery.id}>
                    <div className="card group overflow-hidden">
                      {gallery.cover ? (
                        <LazyImage
                          src={gallery.cover}
                          alt={gallery.title}
                          sizes="(min-width: 1024px) 400px, (min-width: 640px) 48vw, 92vw"
                          className="h-52 w-full object-cover transition-transform duration-700 group-hover:scale-105"
                        />
                      ) : (
                        <div className="h-52 w-full bg-gradient-to-br from-[#ddd6fe] to-[#bfdbfe]" />
                      )}
                      <div className="p-4">
                        <p className="font-display text-[0.95rem] font-bold text-ink">{gallery.title}</p>
                        <p className="mt-1 text-[0.72rem] text-mist">
                          {gallery.society?.name || gallery.event?.title || "KIPS Campus"}
                        </p>
                      </div>
                    </div>
                  </Reveal>
                ))}
              </div>
            </GateReveal>
          </div>
        </section>
      ) : null}

      <section className="section">
        <div className="container-x">
          <SectionHeading eyebrow="Quick access" title="Everything you need, one tap away" />
          <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {QUICK_LINKS.map((item) => (
              <Link key={item.href} href={item.href} className="card card-hover group flex flex-col p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-lilac text-purple transition-colors group-hover:bg-purple group-hover:text-white">
                  <item.icon size={19} />
                </span>
                <p className="mt-4 font-display text-[0.95rem] font-bold text-ink">{item.title}</p>
                <p className="mt-1 text-[0.78rem] leading-relaxed text-mist">{item.body}</p>
                <span className="mt-3 inline-flex items-center gap-1 text-[0.75rem] font-semibold text-purple">
                  Open <ArrowRight size={12} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
