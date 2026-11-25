"use client";

import Link from "next/link";
import { Inbox, RefreshCw, TriangleAlert } from "lucide-react";
import { cn, initials } from "@/lib/utils";
import { fetchJson } from "@/components/layout/ui";

const ATTENDANCE_META = {
  present: { label: "Present", tone: "emerald" },
  absent: { label: "Absent", tone: "rose" },
  unmarked: { label: "Not marked", tone: "slate" },
};

/** Fetch independent endpoints in parallel without letting one failure sink the rest. */
export async function fetchParallel(entries) {
  const results = await Promise.all(
    entries.map(async ([key, url]) => {
      try {
        return [key, await fetchJson(url), null];
      } catch (error) {
        return [key, null, error?.message || "Request failed"];
      }
    })
  );
  const data = {};
  const errors = {};
  for (const [key, value, error] of results) {
    data[key] = value;
    if (error) errors[key] = error;
  }
  return { data, errors };
}

export function EmptyState({ icon, title = "Nothing here yet", description, action, className = "" }) {
  const Icon = icon || Inbox;
  return (
    <div className={cn("flex flex-col items-center gap-2.5 px-6 py-14 text-center", className)}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-lavender text-purple">
        <Icon size={20} />
      </span>
      <p className="font-display text-[0.98rem] font-semibold text-ink">{title}</p>
      {description ? <p className="max-w-sm text-[0.8rem] leading-relaxed text-mist">{description}</p> : null}
      {action ? <div className="mt-2 flex flex-wrap justify-center gap-2">{action}</div> : null}
    </div>
  );
}

export function ErrorState({ message, onRetry, className = "" }) {
  return (
    <div className={cn("flex flex-col items-center gap-3 px-6 py-14 text-center", className)}>
      <span className="grid h-12 w-12 place-items-center rounded-2xl bg-rose-50 text-rose-600">
        <TriangleAlert size={20} />
      </span>
      <p className="font-display text-[0.98rem] font-semibold text-ink">Something went wrong</p>
      <p className="max-w-md text-[0.8rem] leading-relaxed text-mist">{message || "Could not load this view."}</p>
      {onRetry ? (
        <button type="button" onClick={onRetry} className="btn btn-secondary btn-sm mt-1">
          <RefreshCw size={13} /> Try again
        </button>
      ) : null}
    </div>
  );
}

export function SocietyAvatar({ society, size = "md", className = "" }) {
  const sizes = {
    sm: "h-9 w-9 rounded-xl text-[0.66rem]",
    md: "h-11 w-11 rounded-xl text-[0.78rem]",
    lg: "h-14 w-14 rounded-2xl text-base",
  };
  const color = society?.color || "#7c3aed";
  return (
    <span
      className={cn("grid shrink-0 place-items-center overflow-hidden border font-bold", sizes[size] || sizes.md, className)}
      style={{ backgroundColor: `${color}16`, borderColor: `${color}30`, color }}
    >
      {society?.logo ? <img src={society.logo} alt="" className="h-full w-full object-cover" /> : initials(society?.name || "S")}
    </span>
  );
}

export function AttendanceBadge({ attendance = "unmarked" }) {
  const meta = ATTENDANCE_META[attendance] || ATTENDANCE_META.unmarked;
  return <span className={`badge badge-${meta.tone}`}>{meta.label}</span>;
}

export function BackLink({ href, children = "Back" }) {
  return (
    <Link href={href} className="inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-purple transition hover:text-blue">
      {children}
    </Link>
  );
}

export function formatBytes(bytes = 0) {
  if (!bytes) return "0 KB";
  if (bytes < 1024 * 1024) return `${Math.max(1, Math.round(bytes / 1024))} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export { ATTENDANCE_META };
