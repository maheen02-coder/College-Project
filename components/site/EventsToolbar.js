"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { EVENT_CATEGORIES, EVENT_TYPES } from "@/lib/constants";

export default function EventsToolbar({ societies = [] }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");

  const scope = params.get("scope") === "past" ? "past" : "upcoming";
  const category = params.get("category") || "All";
  const type = params.get("type") || "All";
  const society = params.get("society") || "All";
  const sort = params.get("sort") || "soonest";

  const apply = (patch) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === "All" || value === "soonest") next.delete(key);
      else next.set(key, value);
    });
    if (!next.get("scope")) next.delete("scope");
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") || "") !== q) apply({ q });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const reset = () => {
    setQ("");
    router.replace(pathname, { scroll: false });
  };

  const active = q || (category !== "All") || (type !== "All") || (society !== "All");

  return (
    <div className="card p-4">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative min-w-[210px] flex-1">
          <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Search events, venues, titles…"
            className="field pl-10"
          />
        </div>

        <div className="flex items-center gap-1 rounded-full border border-line bg-lavender p-1">
          {[
            { key: "upcoming", label: "Upcoming" },
            { key: "past", label: "Past" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => apply({ scope: tab.key === "upcoming" ? "" : tab.key })}
              className={`rounded-full px-3.5 py-1.5 text-[0.76rem] font-semibold transition ${
                scope === tab.key ? "bg-white text-purple shadow-sm" : "text-mist hover:text-ink"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <select value={category} onChange={(event) => apply({ category: event.target.value })} className="field w-auto min-w-[150px]">
          <option value="All">All categories</option>
          {EVENT_CATEGORIES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={type} onChange={(event) => apply({ type: event.target.value })} className="field w-auto min-w-[140px]">
          <option value="All">All types</option>
          {EVENT_TYPES.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>

        <select value={society} onChange={(event) => apply({ society: event.target.value })} className="field w-auto min-w-[150px]">
          <option value="All">All societies</option>
          {societies.map((item) => (
            <option key={item.slug} value={item.slug}>
              {item.name}
            </option>
          ))}
        </select>

        <select value={sort} onChange={(event) => apply({ sort: event.target.value })} className="field w-auto min-w-[140px]">
          <option value="soonest">Soonest first</option>
          <option value="latest">Recently added</option>
        </select>

        {active ? (
          <button type="button" onClick={reset} className="btn btn-ghost btn-sm">
            <X size={13} /> Clear
          </button>
        ) : (
          <span className="hidden items-center gap-1.5 text-[0.72rem] text-mist sm:inline-flex">
            <SlidersHorizontal size={13} /> Filters
          </span>
        )}
      </div>
    </div>
  );
}
