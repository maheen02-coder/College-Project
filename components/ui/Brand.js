import Link from "next/link";
import { cn } from "@/lib/utils";

export function BrandMark({ className = "", size = 40 }) {
  return (
    <span
      className={cn("relative inline-flex shrink-0 items-center justify-center", className)}
      style={{ width: size, height: size }}
    >
      <svg viewBox="0 0 48 48" width={size} height={size} aria-hidden="true">
        <defs>
          <linearGradient id="brand-grad" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
            <stop offset="0" stopColor="#7c3aed" />
            <stop offset="0.55" stopColor="#6d28d9" />
            <stop offset="1" stopColor="#2563eb" />
          </linearGradient>
        </defs>
        <rect x="2" y="2" width="44" height="44" rx="14" fill="url(#brand-grad)" />
        <path
          d="M33.5 16.2a9.6 9.6 0 0 0-4.9-1.4c-4.9 0-8.4 3.4-8.4 9.2s3.4 9.2 8.4 9.2a9.6 9.6 0 0 0 4.9-1.4"
          fill="none"
          stroke="#ffffff"
          strokeWidth="3.4"
          strokeLinecap="round"
        />
        <path d="M17.5 15v18" stroke="#ffffff" strokeWidth="3.4" strokeLinecap="round" />
      </svg>
    </span>
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
