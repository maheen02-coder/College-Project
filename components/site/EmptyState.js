import Link from "next/link";
import { Inbox } from "lucide-react";

export default function EmptyState({ icon: Icon = Inbox, title = "Nothing here yet", message, actionHref, actionLabel, children }) {
  return (
    <div className="card flex flex-col items-center justify-center px-6 py-14 text-center">
      <span className="grid h-16 w-16 place-items-center rounded-2xl bg-lavender text-purple">
        <Icon size={26} />
      </span>
      <h3 className="mt-4 font-display text-lg font-bold text-ink">{title}</h3>
      {message ? <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-mist">{message}</p> : null}
      {actionHref ? (
        <Link href={actionHref} className="btn btn-primary btn-sm mt-5">
          {actionLabel}
        </Link>
      ) : null}
      {children}
    </div>
  );
}
