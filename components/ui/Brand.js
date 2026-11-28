import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className = "", size = 40 }) {
  return (
    <span
      role="img"
      aria-label="KIPS College"
      className={cn("brand-mark shrink-0", className)}
      style={{ width: size, height: size }}
    />
  );
}

export default function Brand({ institute, compact = false, href = "/" }) {
  return (
    <Link href={href} className="group flex items-center gap-3" aria-label="KIPS Campus Event Hub home">
      <BrandMark size={compact ? 34 : 40} className="transition-transform duration-300 group-hover:-rotate-3" />
      <span className="flex flex-col leading-none">
        <span className="font-display text-[0.95rem] font-bold tracking-tight text-ink">
          KIPS <span className="gradient-text">Event Hub</span>
        </span>
        <span className="mt-1 text-[0.58rem] font-semibold uppercase tracking-[0.3em] text-mist">
          {institute?.shortName || "KIPS"} Campus
        </span>
      </span>
    </Link>
  );
}
