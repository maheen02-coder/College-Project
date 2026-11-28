import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CalendarClock, CheckCircle2, ClipboardList, Info, ListChecks, Users } from "lucide-react";
import Countdown from "@/components/site/Countdown";
import ApplicationForm from "@/components/site/ApplicationForm";
import StatusBadge from "@/components/ui/StatusBadge";
import { getSessionUser } from "@/lib/auth";
import { getRecruitmentDetail } from "@/lib/content";
import { formatDateTime, initials } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { id } = await params;
  const data = await getRecruitmentDetail(id);
  if (!data) return { title: "Recruitment not found" };
  return { title: `${data.recruitment.title} · Recruitment` };
}

export default async function RecruitmentDetailPage({ params }) {
  const { id } = await params;
  const user = await getSessionUser();
  const data = await getRecruitmentDetail(id, user?.id);
  if (!data) notFound();
  const { recruitment, questions, myApplication } = data;
  const accent = recruitment.society?.color || "#7c3aed";

  return (
    <div>
      <section className="relative overflow-hidden border-b border-line bg-paper">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0">
          <div className="absolute -right-20 -top-24 h-72 w-72 rounded-full bg-[#bbf7d0]/50 blur-3xl" />
          <div className="bg-dots absolute inset-0 opacity-60" />
        </div>
        <div className="container-x relative py-10 sm:py-14">
          <Link href="/recruitment" className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-mist transition hover:text-purple">
            <ArrowLeft size={14} /> All recruitment
          </Link>
          <div className="mt-6 flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <StatusBadge status={recruitment.status} kind="recruitment" dot />
                {recruitment.society ? <span className="badge badge-violet">{recruitment.society.name}</span> : null}
              </div>
              <h1 className="mt-3 font-display text-3xl font-bold tracking-tight text-ink sm:text-[2.5rem]">
                {recruitment.title}
              </h1>
              <p className="mt-2 max-w-2xl text-[0.92rem] leading-relaxed text-mist">{recruitment.description}</p>
            </div>
            {recruitment.society ? (
              <Link
                href={`/societies/${recruitment.society.slug}`}
                className="flex shrink-0 items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 transition hover:border-purple/40"
              >
                <span
                  className="grid h-10 w-10 place-items-center overflow-hidden rounded-xl text-sm font-bold text-white"
                  style={{ background: `linear-gradient(135deg, ${accent}, #2563eb)` }}
                >
                  {recruitment.society.logo ? (
                    <img loading="lazy" decoding="async" src={recruitment.society.logo} alt="" className="h-full w-full object-cover" />
                  ) : (
                    initials(recruitment.society.name)
                  )}
                </span>
                <span>
                  <span className="block text-[0.62rem] uppercase tracking-[0.12em] text-mist">Society</span>
                  <span className="block text-[0.84rem] font-semibold text-ink">{recruitment.society.name}</span>
                </span>
              </Link>
            ) : null}
          </div>

          <div className="mt-6 flex flex-wrap gap-2">
            <span className="chip"><CalendarClock size={13} className="text-amber" /> Closes {formatDateTime(recruitment.closesAt)}</span>
            <span className="chip"><ListChecks size={13} className="text-blue" /> {questions.length} questions</span>
            {recruitment.rounds?.length ? (
              <span className="chip"><Users size={13} className="text-purple" /> {recruitment.rounds.length} rounds</span>
            ) : null}
          </div>
        </div>
      </section>

      <div className="container-x grid gap-8 py-12 lg:grid-cols-[1.55fr_0.95fr]">
        <div className="space-y-6">
          {recruitment.instructions ? (
            <div className="card p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
                <Info size={17} className="text-blue" /> Before you apply
              </h2>
              <p className="mt-2 whitespace-pre-line text-[0.87rem] leading-relaxed text-ink-2/90">{recruitment.instructions}</p>
            </div>
          ) : null}

          {recruitment.rounds?.length ? (
            <div className="card p-6">
              <h2 className="font-display text-lg font-bold text-ink">Selection process</h2>
              <ol className="mt-4 space-y-3">
                {recruitment.rounds.map((round, index) => (
                  <li key={round.key || round.name || index} className="flex items-start gap-3">
                    <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-lilac text-[0.68rem] font-bold text-purple">
                      {index + 1}
                    </span>
                    <div>
                      <p className="text-[0.86rem] font-semibold text-ink">{round.name || round.label || round.key}</p>
                      {round.description ? <p className="text-[0.76rem] text-mist">{round.description}</p> : null}
                    </div>
                    {round.isActive ? (
                      <span className="ml-auto badge badge-emerald">Current</span>
                    ) : null}
                  </li>
                ))}
              </ol>
            </div>
          ) : null}

          <div className="card p-6 sm:p-8">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-ink">
              <ClipboardList size={18} className="text-purple" /> Application form
            </h2>
            <p className="mt-1 text-[0.78rem] text-mist">
              Your answers are submitted securely to {recruitment.society?.name || "the society"} leadership.
            </p>
            <div className="mt-5">
              <ApplicationForm
                recruitment={recruitment}
                questions={questions}
                isAuthed={Boolean(user)}
                verified={user?.verificationStatus === "verified"}
                myApplication={myApplication}
              />
            </div>
          </div>
        </div>

        <aside className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <div className="card p-6">
            {recruitment.isOpen ? (
              <Countdown target={recruitment.closesAt} label="Applications close in" />
            ) : (
              <p className="rounded-xl bg-lavender px-4 py-3 text-center text-[0.8rem] font-semibold text-mist">
                Applications closed
              </p>
            )}
            <div className="mt-5 space-y-2 text-[0.78rem] text-mist">
              <p className="flex items-center justify-between">
                <span>Opened</span>
                <span className="font-semibold text-ink-2">{formatDateTime(recruitment.opensAt)}</span>
              </p>
              <p className="flex items-center justify-between">
                <span>Deadline</span>
                <span className="font-semibold text-ink-2">{formatDateTime(recruitment.closesAt)}</span>
              </p>
            </div>
          </div>

          <div className="card p-5">
            <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-mist">What happens next</p>
            <div className="mt-3 space-y-2.5">
              {[
                "Submit your responses and files",
                "Leadership shortlists candidates",
                "Interview invites arrive in your dashboard",
                "Offers and roles are confirmed",
              ].map((step, index) => (
                <p key={step} className="flex items-start gap-2 text-[0.78rem] text-ink-2/90">
                  <CheckCircle2 size={14} className="mt-0.5 shrink-0 text-emerald" />
                  {step}
                </p>
              ))}
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
