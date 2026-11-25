import Link from "next/link";
import { ArrowUpRight, CalendarClock, ListChecks } from "lucide-react";
import { formatDate, initials } from "@/lib/utils";

export default function RecruitmentCard({ recruitment, className = "" }) {
  if (!recruitment) return null;
  const accent = recruitment.society?.color || "#7c3aed";
  const closes = new Date(recruitment.closesAt);
  const daysLeft = Math.max(0, Math.ceil((closes.getTime() - Date.now()) / 864e5));

  return (
    <article className={`card card-hover flex h-full flex-col p-5 ${className}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span
            className="grid h-11 w-11 shrink-0 place-items-center overflow-hidden rounded-xl text-sm font-bold text-white"
            style={{ background: `linear-gradient(135deg, ${accent}, #2563eb)` }}
          >
            {recruitment.society?.logo ? (
              <img src={recruitment.society.logo} alt="" className="h-full w-full object-cover" />
            ) : (
              initials(recruitment.society?.name || "KIPS")
            )}
          </span>
          <div>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.12em] text-mist">
              {recruitment.society?.name || "KIPS Campus"}
            </p>
            <h3 className="font-display text-[0.98rem] font-bold leading-snug text-ink">{recruitment.title}</h3>
          </div>
        </div>
        <span className={`badge ${recruitment.isOpen ? "badge-emerald" : "badge-slate"}`}>
          {recruitment.isOpen ? "Open" : "Closed"}
        </span>
      </div>

      <p className="mt-3 line-clamp-2 text-[0.82rem] leading-relaxed text-mist">{recruitment.description}</p>

      <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[0.73rem] text-mist">
        <span className="inline-flex items-center gap-1.5">
          <CalendarClock size={13} className="text-amber" />
          {recruitment.isOpen ? `${daysLeft} day${daysLeft === 1 ? "" : "s"} left · ${formatDate(closes)}` : `Closed ${formatDate(closes)}`}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ListChecks size={13} className="text-blue" />
          {recruitment.questionCount || 0} questions
        </span>
      </div>

      <div className="mt-auto pt-4">
        <Link
          href={`/recruitment/${recruitment.id}`}
          className={`btn btn-sm w-full ${recruitment.isOpen ? "btn-primary" : "btn-ghost"}`}
        >
          {recruitment.isOpen ? "Apply now" : "View details"}
          <ArrowUpRight size={14} />
        </Link>
      </div>
    </article>
  );
}
