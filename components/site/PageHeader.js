import Link from "next/link";
import { ChevronRight } from "lucide-react";

export default function PageHeader({ eyebrow, title, description, breadcrumb = [], children, tone = "lavender" }) {
  return (
    <section className="relative overflow-hidden border-b border-line bg-paper">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        {tone === "lavender" ? (
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#ddd6fe]/70 blur-3xl" />
        ) : (
          <div className="absolute -right-24 -top-28 h-72 w-72 rounded-full bg-[#bfdbfe]/70 blur-3xl" />
        )}
        <div className="bg-dots absolute inset-0 opacity-60" />
      </div>
      <div className="container-x relative py-12 sm:py-16">
        {breadcrumb.length ? (
          <nav className="mb-4 flex flex-wrap items-center gap-1.5 text-[0.72rem] text-mist">
            <Link href="/" className="transition hover:text-purple">
              Home
            </Link>
            {breadcrumb.map((crumb) => (
              <span key={crumb.href || crumb.label} className="inline-flex items-center gap-1.5">
                <ChevronRight size={12} className="text-line" />
                {crumb.href ? (
                  <Link href={crumb.href} className="transition hover:text-purple">
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-ink-2">{crumb.label}</span>
                )}
              </span>
            ))}
          </nav>
        ) : null}
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <div className="mt-2 flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-2xl">
            <h1 className="text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-[2.6rem]">
              {title}
            </h1>
            {description ? (
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist sm:text-[0.92rem]">{description}</p>
            ) : null}
          </div>
          {children ? <div className="shrink-0">{children}</div> : null}
        </div>
      </div>
    </section>
  );
}
