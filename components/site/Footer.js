import Link from "next/link";
import { ArrowUpRight, Mail, MapPin, Phone, Sparkles } from "lucide-react";
import { BrandMark } from "@/components/ui/Brand";

function SocialIcon({ name }) {
  const common = { width: 15, height: 15, viewBox: "0 0 24 24", fill: "currentColor", "aria-hidden": "true" };
  if (name === "Instagram") {
    return (
      <svg {...common} fill="none" stroke="currentColor" strokeWidth="1.8">
        <rect x="3" y="3" width="18" height="18" rx="5.5" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="17.2" cy="6.8" r="1" fill="currentColor" stroke="none" />
      </svg>
    );
  }
  if (name === "LinkedIn") {
    return (
      <svg {...common}>
        <path d="M4.5 8.8h3.6V20H4.5zM6.3 3.6a2.1 2.1 0 1 1 0 4.2 2.1 2.1 0 0 1 0-4.2zM10.6 8.8h3.45v1.55h.05c.48-.9 1.65-1.85 3.4-1.85 3.63 0 4.3 2.35 4.3 5.4V20h-3.6v-5.4c0-1.3-.02-2.95-1.8-2.95-1.8 0-2.08 1.4-2.08 2.85V20h-3.6z" />
      </svg>
    );
  }
  if (name === "Facebook") {
    return (
      <svg {...common}>
        <path d="M14.2 8.6h3V5.1h-3c-2.35 0-4.05 1.7-4.05 4.05V11H7.4v3.5h2.75V21h3.6v-6.5h2.9l.55-3.5h-3.45V9.15c0-.33.2-.55.45-.55z" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M3.6 3.5h4.1l4.35 5.85 5.05-5.85h2.4l-6.3 7.3 7 9.7h-4.1l-4.65-6.35-5.5 6.35H4.5l6.75-7.8z" />
    </svg>
  );
}

const SOCIALS = [
  { label: "Instagram", href: "https://instagram.com" },
  { label: "LinkedIn", href: "https://linkedin.com" },
  { label: "Facebook", href: "https://facebook.com" },
  { label: "X", href: "https://x.com" },
];

const EXPLORE = [
  { href: "/events", label: "Campus events" },
  { href: "/societies", label: "Societies & clubs" },
  { href: "/competitions", label: "Competitions" },
  { href: "/calendar", label: "Campus calendar" },
  { href: "/updates", label: "Updates feed" },
];

const STUDENTS = [
  { href: "/dashboard", label: "Student dashboard" },
  { href: "/recruitment", label: "Society recruitment" },
  { href: "/dashboard/groups", label: "Society groups" },
  { href: "/dashboard/certificates", label: "My certificates" },
  { href: "/verify", label: "Verify a certificate" },
];

export default function Footer({ institute }) {
  const name = institute?.name || "KIPS College";
  const short = institute?.shortName || "KIPS";
  return (
    <footer className="relative mt-20 overflow-hidden border-t border-line bg-white">
      <div className="relative overflow-hidden bg-gradient-to-br from-[#2a1258] via-[#43179b] to-[#1846a8]">
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 opacity-30 [background-image:radial-gradient(rgba(255,255,255,0.35)_1px,transparent_1px)] [background-size:26px_26px]" />
        <div className="container-x relative flex flex-col items-start justify-between gap-6 py-12 md:flex-row md:items-center">
          <div className="max-w-xl">
            <p className="eyebrow text-violet-200">Your campus, connected</p>
            <h2 className="mt-2 text-2xl font-bold text-white md:text-3xl">
              One hub for every KIPS moment.
            </h2>
            <p className="mt-2 max-w-md text-sm leading-relaxed text-violet-100/85">
              Join societies, apply to recruitment drives, compete, chat with your team and collect verified certificates — all in one place.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2.5">
            <Link href="/signup" className="btn btn-lg bg-white text-[#43179b] shadow-lg hover:bg-violet-50">
              <Sparkles size={16} /> Create your account
            </Link>
            <Link href="/login" className="btn btn-lg border border-white/30 bg-white/10 text-white hover:bg-white/20">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="container-x relative grid gap-12 py-14 md:grid-cols-[1.5fr_1fr_1fr_1.2fr]">
        <div>
          <div className="flex items-center gap-3">
            <BrandMark size={38} />
            <div>
              <p className="font-display text-sm font-bold text-ink">KIPS Event Hub</p>
              <p className="text-[0.6rem] font-semibold uppercase tracking-[0.3em] text-mist">{short} Official</p>
            </div>
          </div>
          <p className="mt-5 max-w-xs text-sm leading-relaxed text-mist">
            The official campus platform of {name} — discover events, build your society, compete with the best and collect verified achievements.
          </p>
          <div className="mt-5 flex items-center gap-2.5">
            {SOCIALS.map(({ label, href }) => (
              <a
                key={label}
                href={href}
                target="_blank"
                rel="noreferrer"
                aria-label={label}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-line bg-white text-mist transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-purple"
              >
                <SocialIcon name={label} />
              </a>
            ))}
          </div>
        </div>

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mist">Explore</p>
          <ul className="mt-4 space-y-2.5">
            {EXPLORE.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[0.82rem] text-ink-2 transition hover:text-purple">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mist">For students</p>
          <ul className="mt-4 space-y-2.5">
            {STUDENTS.map((item) => (
              <li key={item.href}>
                <Link href={item.href} className="text-[0.82rem] text-ink-2 transition hover:text-purple">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.22em] text-mist">Campus office</p>
          <ul className="mt-4 space-y-3 text-[0.82rem] text-ink-2">
            <li className="flex items-start gap-2.5">
              <MapPin size={15} className="mt-0.5 shrink-0 text-purple" />
              {institute?.city || "Lahore, Pakistan"}
            </li>
            <li className="flex items-start gap-2.5">
              <Mail size={15} className="mt-0.5 shrink-0 text-purple" />
              activities@{institute?.emailDomain || "kips.edu.pk"}
            </li>
            <li className="flex items-start gap-2.5">
              <Phone size={15} className="mt-0.5 shrink-0 text-purple" />
              +92 42 111 547 547
            </li>
          </ul>
          <Link href="/about" className="mt-5 inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-purple hover:gap-2.5 transition-all">
            About the campus hub <ArrowUpRight size={13} />
          </Link>
        </div>
      </div>

      <div className="border-t border-line">
        <div className="container-x flex flex-col items-center justify-between gap-3 py-5 text-[0.72rem] text-mist sm:flex-row">
          <p>© {new Date().getFullYear()} {name}. Built for students, societies and campus life.</p>
          <p className="flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            Official campus platform
          </p>
        </div>
      </div>
    </footer>
  );
}
