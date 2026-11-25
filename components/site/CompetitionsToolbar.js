"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, X } from "lucide-react";
import { COMPETITION_CATEGORIES, COMPETITION_TYPES } from "@/lib/constants";

export default function CompetitionsToolbar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") || "");

  const category = params.get("category") || "All";
  const type = params.get("type") || "All";
  const mode = params.get("mode") || "All";

  const apply = (patch) => {
    const next = new URLSearchParams(params.toString());
    Object.entries(patch).forEach(([key, value]) => {
      if (!value || value === "All") next.delete(key);
      else next.set(key, value);
    });
    router.replace(`${pathname}?${next.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const id = setTimeout(() => {
      if ((params.get("q") || "") !== q) apply({ q });
    }, 350);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const active = q || category !== "All" || type !== "All" || mode !== "All";

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      <div className="relative min-w-[210px] flex-1">
        <Search size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
        <input
          value={q}
          onChange={(event) => setQ(event.target.value)}
          placeholder="Search competitions…"
          className="field pl-10"
        />
      </div>
      <select value={type} onChange={(event) => apply({ type: event.target.value })} className="field w-auto min-w-[140px]">
        <option value="All">All types</option>
        {COMPETITION_TYPES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={category} onChange={(event) => apply({ category: event.target.value })} className="field w-auto min-w-[150px]">
        <option value="All">All categories</option>
        {COMPETITION_CATEGORIES.map((item) => (
          <option key={item} value={item}>
            {item}
          </option>
        ))}
      </select>
      <select value={mode} onChange={(event) => apply({ mode: event.target.value })} className="field w-auto min-w-[130px]">
        <option value="All">Solo & team</option>
        <option value="solo">Solo only</option>
        <option value="team">Team only</option>
      </select>
      {active ? (
        <button
          type="button"
          onClick={() => {
            setQ("");
            router.replace(pathname, { scroll: false });
          }}
          className="btn btn-ghost btn-sm"
        >
          <X size={13} /> Clear
        </button>
      ) : null}
    </div>
  );
}
