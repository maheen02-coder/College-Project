import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Reveal from "@/components/ui/Reveal";

export default function SectionHeading({
  eyebrow,
  title,
  description,
  href,
  linkLabel = "View all",
  align = "left",
  className = "",
}) {
  const centered = align === "center";
  return (
    <Reveal
      className={`flex flex-col gap-5 ${
        centered ? "items-center text-center" : "sm:flex-row sm:items-end sm:justify-between"
      } ${className}`}
    >
      <div className={centered ? "max-w-2xl" : "max-w-2xl"}>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-2.5 text-balance font-display text-3xl font-bold tracking-tight text-ink sm:text-[2.1rem]">
          {title}
        </h2>
        {description ? (
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-mist">{description}</p>
        ) : null}
      </div>
      {href ? (
        <Link
          href={href}
          className="group inline-flex shrink-0 items-center gap-1.5 text-sm font-semibold text-purple transition hover:gap-2.5"
        >
          {linkLabel}
          <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
        </Link>
      ) : null}
    </Reveal>
  );
}
