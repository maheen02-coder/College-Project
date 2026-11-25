import Link from "next/link";
import {
  Award,
  CalendarDays,
  MessagesSquare,
  QrCode,
  ShieldCheck,
  Sparkles,
  Trophy,
  UserRoundPlus,
  Users,
} from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import SectionHeading from "@/components/site/SectionHeading";
import StatCounter from "@/components/site/StatCounter";
import Reveal from "@/components/ui/Reveal";
import Brand from "@/components/ui/Brand";
import { getHomeData } from "@/lib/content";
import { POINT_ACTIONS } from "@/lib/constants";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "About",
  description: "KIPS Campus Event Hub — events, societies, competitions, recruitment and verified certificates for KIPS College.",
};

const CAPABILITIES = [
  { icon: CalendarDays, title: "Discover events", body: "A live campus calendar with categories, filters, countdowns and instant registration." },
  { icon: Users, title: "Join societies", body: "Eight student-led communities with leadership, membership and activity records." },
  { icon: UserRoundPlus, title: "Apply with real forms", body: "Dynamic questionnaires, file uploads, interviews and round-by-round status tracking." },
  { icon: Trophy, title: "Compete & climb", body: "Solo and team competitions with judging, leaderboards and result publishing." },
  { icon: QrCode, title: "QR attendance", body: "Each event gets a signed QR check-in so attendance is fast and tamper-proof." },
  { icon: Award, title: "Verified certificates", body: "Eight certificate types with PDF download and public QR verification." },
  { icon: MessagesSquare, title: "Society groups", body: "Private group chat for teams and committees, right inside the platform." },
  { icon: ShieldCheck, title: "Verified identities", body: "Matric marks and academic records are verified by the campus office before access." },
];

const ROLES = [
  { name: "Super Admin", scope: "Full control of the campus — settings, people, programs and audit logs." },
  { name: "Recruitment Admin", scope: "Societies, openings, questionnaires, applications and interviews." },
  { name: "Event Admin", scope: "Events, competitions, registrations, attendance and announcements." },
  { name: "Society Admin", scope: "Membership, groups, tasks and galleries for campus societies." },
  { name: "Certificate Admin", scope: "Certificate issuance, templates, revocation and verification records." },
  { name: "Student Admin", scope: "Student directory, verification review and profile hygiene." },
  { name: "Communication Admin", scope: "Announcements, groups and campus-wide updates." },
];

export default async function AboutPage() {
  const { stats, institute } = await getHomeData();

  return (
    <div>
      <PageHeader
        eyebrow="About the platform"
        title="Built for the way campus actually works"
        description="KIPS Campus Event Hub brings events, societies, recruitment, attendance and certificates into one verified student record."
        breadcrumb={[{ label: "About" }]}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-sm">
          <Brand compact />
        </div>
      </PageHeader>

      <section className="section">
        <div className="container-x grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
          <Reveal>
            <p className="eyebrow">Why we built this</p>
            <h2 className="mt-3 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-[2.3rem]">
              One record of everything students do
            </h2>
            <div className="mt-4 space-y-3 text-[0.9rem] leading-relaxed text-mist">
              <p>
                Campus life is fragmented across WhatsApp groups, paper forms and screenshots. Important
                achievements get lost, and students have no reliable proof of participation.
              </p>
              <p>
                This platform gives every event, society, competition and certificate a proper digital home —
                tied to a verified student identity at {institute?.name || "KIPS College"}.
              </p>
              <p>
                Students get one dashboard. Society leaders get real applications and member records. Admins get
                analytics, attendance and audit logs without spreadsheet chaos.
              </p>
            </div>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/events" className="btn btn-primary btn-sm">Browse events</Link>
              <Link href="/verify" className="btn btn-secondary btn-sm">Verify a certificate</Link>
            </div>
          </Reveal>

          <Reveal delay={0.08} className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            <StatCounter value={stats.verifiedStudents || 0} label="Verified students" icon="verified" />
            <StatCounter value={stats.societies || 0} label="Societies" icon="users" />
            <StatCounter value={stats.events || 0} label="Live events" icon="events" />
            <StatCounter value={stats.registrations || 0} label="Registrations" icon="registrations" />
            <StatCounter value={stats.certificates || 0} label="Certificates" icon="certificates" />
            <StatCounter value={8} label="Certificate types" icon="types" />
          </Reveal>
        </div>
      </section>

      <section className="section bg-lavender/50">
        <div className="container-x">
          <SectionHeading
            eyebrow="Capabilities"
            title="Everything, properly connected"
            description="Each module reads and writes to the same campus database — no duplicate forms, no lost records."
          />
          <div className="mt-9 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map((item, index) => (
              <Reveal key={item.title} delay={index * 0.04} className="card card-hover p-5">
                <span className="grid h-11 w-11 place-items-center rounded-xl bg-lilac text-purple">
                  <item.icon size={19} />
                </span>
                <p className="mt-4 font-display text-[0.95rem] font-bold text-ink">{item.title}</p>
                <p className="mt-1.5 text-[0.79rem] leading-relaxed text-mist">{item.body}</p>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      <section id="points" className="section">
        <div className="container-x grid gap-8 lg:grid-cols-2">
          <div className="card p-7">
            <p className="eyebrow">Recognition</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">How campus points work</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Points are awarded automatically for verified participation. They feed the campus leaderboard and
              help societies recognise active members.
            </p>
            <div className="mt-5 space-y-2.5">
              {Object.entries(POINT_ACTIONS).map(([key, action]) => (
                <div key={key} className="flex items-center justify-between rounded-xl border border-line px-4 py-2.5">
                  <span className="text-[0.82rem] text-ink-2">{action.label}</span>
                  <span className="chip">+{action.points} pts</span>
                </div>
              ))}
            </div>
            <div className="mt-5 flex items-center gap-2 rounded-xl bg-emerald/5 px-4 py-3 text-[0.76rem] text-emerald">
              <Sparkles size={14} /> Attendance is only counted once — duplicate check-ins are ignored.
            </div>
          </div>

          <div className="card p-7">
            <p className="eyebrow">Administration</p>
            <h2 className="mt-2 font-display text-2xl font-bold text-ink">Roles with real boundaries</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Every admin gets a scoped role. Permissions are enforced on the server for each action, not just
              hidden in the UI.
            </p>
            <div className="mt-5 space-y-2.5">
              {ROLES.map((role) => (
                <div key={role.name} className="rounded-xl border border-line px-4 py-2.5">
                  <p className="text-[0.82rem] font-semibold text-ink">{role.name}</p>
                  <p className="mt-0.5 text-[0.74rem] leading-relaxed text-mist">{role.scope}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section bg-white/70">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-[1.8rem] border border-line bg-gradient-to-br from-[#f6f2ff] via-white to-[#eef4ff] p-8 sm:p-12">
            <div className="grid gap-8 sm:grid-cols-[1.2fr_0.8fr] sm:items-center">
              <div>
                <p className="eyebrow">Get started</p>
                <h2 className="mt-2 font-display text-2xl font-bold text-ink sm:text-3xl">
                  Your next campus moment is waiting
                </h2>
                <p className="mt-2 max-w-xl text-sm leading-relaxed text-mist">
                  Create your student account, get verified by the campus office, and unlock events,
                  competitions, societies and certificates.
                </p>
                <div className="mt-6 flex flex-wrap gap-3">
                  <Link href="/signup" className="btn btn-primary">Create account</Link>
                  <Link href="/events" className="btn btn-secondary">Explore events</Link>
                </div>
              </div>
              <div className="rounded-2xl border border-line bg-white p-5">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-mist">Campus office</p>
                <p className="mt-2 text-[0.86rem] font-semibold text-ink">{institute?.name || "KIPS College"}</p>
                <p className="mt-1 text-[0.78rem] text-mist">{institute?.city || "Pakistan"}</p>
                {institute?.emailDomain ? (
                  <p className="mt-1 text-[0.78rem] text-mist">Student email domain · @{institute.emailDomain}</p>
                ) : null}
                <Link href="/verify" className="mt-4 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-purple">
                  <ShieldCheck size={14} /> Certificate verification
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
