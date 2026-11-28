import Link from "next/link";
import { ArrowUpRight, Bell, Pin } from "lucide-react";
import LazyImage from "@/components/ui/LazyImage";
import { formatDate, timeAgo } from "@/lib/utils";

const CATEGORY_LABEL = {
  general: "General",
  notice: "Notice",
  event: "Event",
  recruitment: "Recruitment",
  competition: "Competition",
  society: "Society",
  result: "Result",
};

const PRIORITY_TONE = {
  urgent: "border-l-rose-400",
  important: "border-l-amber-400",
  normal: "border-l-violet-300",
};

const PRIORITY_CHIP = {
  urgent: "badge-rose",
  important: "badge-amber",
  normal: "badge-violet",
};

export default function UpdateCard({ update, featured = false, className = "" }) {
  if (!update) return null;
  return (
    <article
      className={`card card-hover relative flex h-full flex-col border-l-4 p-5 ${
        PRIORITY_TONE[update.priority] || PRIORITY_TONE.normal
      } ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2">
        <span className={`badge ${PRIORITY_CHIP[update.priority] || PRIORITY_CHIP.normal}`}>
          {CATEGORY_LABEL[update.category] || update.category}
        </span>
        {update.pinned ? (
          <span className="badge badge-slate">
            <Pin size={11} /> Pinned
          </span>
        ) : null}
        <span className="ml-auto text-[0.7rem] text-mist">{timeAgo(update.createdAt)}</span>
      </div>

      <h3 className="mt-3 font-display text-[1rem] font-bold leading-snug text-ink">
        {update.link ? (
          <Link href={update.link} className="transition-colors hover:text-purple">
            {update.title}
          </Link>
        ) : (
          update.title
        )}
      </h3>

      <p className={`mt-2 text-[0.83rem] leading-relaxed text-mist ${featured ? "line-clamp-4" : "line-clamp-3"}`}>
        {update.body}
      </p>

      {update.image ? (
        <div className="mt-3 overflow-hidden rounded-xl border border-line">
          <LazyImage src={update.image} alt="" sizes="(min-width: 1024px) 400px, (min-width: 640px) 46vw, 92vw" className="h-36 w-full object-cover" />
        </div>
      ) : null}

      <div className="mt-auto flex items-center justify-between gap-3 pt-4 text-[0.72rem] text-mist">
        <span className="inline-flex items-center gap-1.5">
          <Bell size={12} className="text-purple" />
          {update.society?.name || update.publishedByName || "Campus office"}
          <span className="text-line">•</span>
          {formatDate(update.createdAt)}
        </span>
        {update.link ? (
          <Link href={update.link} className="inline-flex items-center gap-1 font-semibold text-purple">
            Open <ArrowUpRight size={12} />
          </Link>
        ) : null}
      </div>
    </article>
  );
}
