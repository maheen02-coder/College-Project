"use client";

import { useCallback, useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Award,
  BarChart3,
  Building2,
  CalendarDays,
  CheckCircle2,
  ClipboardList,
  FolderOpen,
  Inbox,
  Loader2,
  Search,
  Trophy,
  TriangleAlert,
  Users,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";

const TILE_ICONS = {
  students: Users,
  events: CalendarDays,
  competitions: Trophy,
  registrations: ClipboardList,
  certificates: Award,
  societies: Building2,
  files: FolderOpen,
  applications: Inbox,
  analytics: BarChart3,
};

export function ConsoleHeading({ eyebrow, title, description, actions }) {
  return (
    <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        {eyebrow ? <p className="eyebrow">{eyebrow}</p> : null}
        <h2 className="mt-1.5 font-display text-2xl font-bold tracking-tight text-ink sm:text-[1.7rem]">{title}</h2>
        {description ? <p className="mt-1.5 max-w-2xl text-[0.84rem] leading-relaxed text-mist">{description}</p> : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2.5">{actions}</div> : null}
    </div>
  );
}

export function Panel({ title, description, actions, children, className = "", bodyClassName = "" }) {
  return (
    <section className={cn("card overflow-hidden", className)}>
      {title || actions ? (
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-line px-5 py-4">
          <div>
            {title ? <h3 className="text-[0.95rem] font-semibold text-ink">{title}</h3> : null}
            {description ? <p className="mt-0.5 text-[0.76rem] text-mist">{description}</p> : null}
          </div>
          {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div className={bodyClassName}>{children}</div>
    </section>
  );
}

export function StatTile({ label, value, icon, hint, tone = "purple", trend }) {
  const Icon = TILE_ICONS[icon] || BarChart3;
  const tones = {
    purple: "bg-lilac text-purple",
    blue: "bg-blue-50 text-blue-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    rose: "bg-rose-50 text-rose-600",
  };
  return (
    <div className="stat-card flex items-start gap-3">
      <span className={cn("grid h-10 w-10 shrink-0 place-items-center rounded-xl", tones[tone] || tones.purple)}>
        <Icon size={18} />
      </span>
      <div className="min-w-0">
        <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-mist">{label}</p>
        <p className="mt-0.5 font-display text-2xl font-bold tracking-tight text-ink">
          {typeof value === "number" ? value.toLocaleString() : value}
        </p>
        {hint ? <p className="mt-0.5 text-[0.68rem] text-mist">{hint}</p> : null}
        {trend ? <p className="mt-0.5 text-[0.68rem] font-medium text-emerald-600">{trend}</p> : null}
      </div>
    </div>
  );
}

export function Toolbar({ children, className = "" }) {
  return <div className={cn("flex flex-col gap-2.5 border-b border-line px-4 py-3 sm:flex-row sm:flex-wrap sm:items-center", className)}>{children}</div>;
}

export function SearchBox({ value, onChange, placeholder = "Search…", className = "" }) {
  return (
    <label className={cn("relative flex-1 sm:max-w-xs", className)}>
      <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="field !py-2 pl-9 text-[0.82rem]"
      />
    </label>
  );
}

export function FilterSelect({ value, onChange, options = [], placeholder, className = "" }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className={cn("field !w-auto !py-2 text-[0.82rem]", className)}>
      {placeholder ? <option value="">{placeholder}</option> : null}
      {options.map((option) => {
        const item = typeof option === "string" ? { value: option, label: option } : option;
        return (
          <option key={item.value} value={item.value}>
            {item.label}
          </option>
        );
      })}
    </select>
  );
}

export function ChipTabs({ tabs, value, onChange, className = "" }) {
  return (
    <div className={cn("flex flex-wrap gap-1.5", className)}>
      {tabs.map((tab) => {
        const item = typeof tab === "string" ? { value: tab, label: tab } : tab;
        return (
          <button
            key={item.value}
            type="button"
            onClick={() => onChange(item.value)}
            className={cn(
              "rounded-full border px-3 py-1.5 text-[0.72rem] font-medium transition",
              value === item.value
                ? "border-violet-300 bg-lilac text-purple shadow-sm"
                : "border-line bg-white text-mist hover:border-violet-200 hover:text-ink"
            )}
          >
            {item.label}
          </button>
        );
      })}
    </div>
  );
}

export function DataTable({ columns, rows, loading, error, rowKey, emptyMessage = "Nothing here yet.", onRowClick, footer }) {
  return (
    <div className="overflow-x-auto">
      <table className="table-console">
        <thead>
          <tr>
            {columns.map((column) => (
              <th key={column.key} className={column.className} style={column.width ? { width: column.width } : undefined}>
                {column.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {loading ? (
            <tr>
              <td colSpan={columns.length} className="!py-12 text-center">
                <span className="inline-flex items-center gap-2 text-[0.8rem] text-mist">
                  <Loader2 size={16} className="animate-spin" /> Loading…
                </span>
              </td>
            </tr>
          ) : error ? (
            <tr>
              <td colSpan={columns.length} className="!py-12 text-center">
                <span className="inline-flex items-center gap-2 text-[0.8rem] text-rose-600">
                  <TriangleAlert size={16} /> {error}
                </span>
              </td>
            </tr>
          ) : rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="!py-14 text-center">
                <span className="mx-auto flex max-w-xs flex-col items-center gap-2 text-[0.8rem] text-mist">
                  <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
                    <Inbox size={18} />
                  </span>
                  {emptyMessage}
                </span>
              </td>
            </tr>
          ) : (
            rows.map((row, index) => (
              <tr
                key={rowKey ? rowKey(row, index) : row.id || index}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                className={onRowClick ? "cursor-pointer" : undefined}
              >
                {columns.map((column) => (
                  <td key={column.key} className={column.className}>
                    {column.render ? column.render(row) : row[column.key] ?? "—"}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
      {footer ? <div className="border-t border-line px-4 py-2.5 text-[0.72rem] text-mist">{footer}</div> : null}
    </div>
  );
}

export function Modal({ open, onClose, title, description, children, footer, wide = false }) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          className="fixed inset-0 z-[90] flex items-end justify-center p-3 sm:items-center sm:p-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <div className="absolute inset-0 bg-ink/35 backdrop-blur-sm" onClick={onClose} />
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 340, damping: 30 }}
            className={cn(
              "relative max-h-[90vh] w-full overflow-y-auto rounded-3xl border border-line bg-white shadow-[0_40px_90px_-40px_rgba(23,19,50,0.45)]",
              wide ? "max-w-3xl" : "max-w-lg"
            )}
          >
            <div className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-line bg-white/95 px-5 py-4 backdrop-blur">
              <div>
                <h3 className="text-[1rem] font-semibold text-ink">{title}</h3>
                {description ? <p className="mt-0.5 text-[0.76rem] text-mist">{description}</p> : null}
              </div>
              <button
                type="button"
                onClick={onClose}
                className="grid h-8 w-8 shrink-0 place-items-center rounded-full border border-line text-mist transition hover:text-ink"
                aria-label="Close"
              >
                <X size={15} />
              </button>
            </div>
            <div className="px-5 py-5">{children}</div>
            {footer ? <div className="flex flex-wrap justify-end gap-2 border-t border-line bg-ivory/60 px-5 py-3.5">{footer}</div> : null}
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}

export function FormField({ label, hint, error, children, className = "" }) {
  return (
    <label className={cn("block", className)}>
      <span className="label">{label}</span>
      {children}
      {error ? <span className="mt-1 block text-[0.7rem] text-rose-600">{error}</span> : null}
      {hint && !error ? <span className="mt-1 block text-[0.7rem] text-mist">{hint}</span> : null}
    </label>
  );
}

export function Toggle({ checked, onChange, label, description }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex w-full items-center justify-between gap-4 rounded-xl border border-line bg-white px-3.5 py-3 text-left transition hover:border-violet-200">
      <span>
        <span className="block text-[0.82rem] font-medium text-ink">{label}</span>
        {description ? <span className="mt-0.5 block text-[0.72rem] text-mist">{description}</span> : null}
      </span>
      <span className={cn("relative h-6 w-11 shrink-0 rounded-full transition", checked ? "bg-gradient-to-r from-violet-600 to-blue-600" : "bg-line")}>
        <span className={cn("absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all", checked ? "left-[1.4rem]" : "left-0.5")} />
      </span>
    </button>
  );
}

export function Alert({ tone = "info", children }) {
  const toneMap = {
    info: "border-violet-200 bg-violet-50 text-violet-700",
    success: "border-emerald-200 bg-emerald-50 text-emerald-700",
    error: "border-rose-200 bg-rose-50 text-rose-700",
    warning: "border-amber-200 bg-amber-50 text-amber-700",
  };
  const Icon = tone === "success" ? CheckCircle2 : tone === "error" || tone === "warning" ? TriangleAlert : Inbox;
  return (
    <div className={cn("flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[0.78rem]", toneMap[tone] || toneMap.info)}>
      <Icon size={15} className="mt-0.5 shrink-0" />
      <div className="min-w-0">{children}</div>
    </div>
  );
}

export function Skeleton({ className = "" }) {
  return <div className={cn("animate-pulse rounded-xl bg-lavender/70", className)} />;
}

export async function fetchJson(url, options) {
  const res = await fetch(url, { cache: "no-store", ...options });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.ok === false) {
    throw new Error(data.error || `Request failed (${res.status})`);
  }
  return data;
}

export function useApi(url, { enabled = true } = {}) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(Boolean(url && enabled));
  const [error, setError] = useState("");

  const reload = useCallback(async () => {
    if (!url || !enabled) return null;
    setLoading(true);
    setError("");
    try {
      const json = await fetchJson(url);
      setData(json);
      return json;
    } catch (err) {
      setError(err.message || "Could not load data.");
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, enabled]);

  useEffect(() => {
    reload();
  }, [reload]);

  return { data, loading, error, reload, setData };
}

export function useDebounced(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);
  return debounced;
}
