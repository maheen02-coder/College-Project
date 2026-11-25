import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function PageHeader({ eyebrow, title, description, actions, backHref, backLabel }) {
  return (
    <div className="mb-7">
      {backHref ? (
        <Link
          href={backHref}
          className="mb-4 inline-flex items-center gap-1.5 text-[0.74rem] text-mist transition hover:text-white"
        >
          <ArrowLeft size={13} /> {backLabel || "Back"}
        </Link>
      ) : null}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
          <h1 className="mt-1.5 font-display text-2xl font-semibold tracking-tight text-white sm:text-[1.75rem]">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-2xl text-[0.82rem] leading-relaxed text-mist">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </div>
  );
}
