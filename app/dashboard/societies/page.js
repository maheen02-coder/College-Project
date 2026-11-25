"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Building2, Search, Users } from "lucide-react";
import { ChipTabs, ConsoleHeading, Panel, SearchBox, Skeleton, Toolbar, useApi } from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState, SocietyAvatar } from "@/components/dashboard/common";

export default function MySocietiesPage() {
  const { data, loading, error, reload } = useApi("/api/societies?mine=1");
  const [search, setSearch] = useState("");
  const [role, setRole] = useState("all");

  const items = useMemo(() => data?.items || [], [data]);
  const roles = useMemo(() => {
    const map = { all: items.length };
    for (const item of items) map[item.myRole] = (map[item.myRole] || 0) + 1;
    return map;
  }, [items]);

  const tabs = [
    { value: "all", label: `All (${roles.all || 0})` },
    ...Object.keys(roles)
      .filter((key) => key !== "all" && roles[key])
      .map((key) => ({
        value: key,
        label: `${key.replace(/_/g, " ").replace(/\b\w/g, (character) => character.toUpperCase())} (${roles[key]})`,
      })),
  ];

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (role !== "all" && item.myRole !== role) return false;
      if (!query) return true;
      return [item.name, item.tagline, item.category].filter(Boolean).some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, search, role]);

  return (
    <>
      <ConsoleHeading
        eyebrow="Memberships"
        title="My societies"
        description="Societies you belong to, your role in each, and the communities you help run."
        actions={
          <Link href="/societies" className="btn btn-primary btn-sm">
            <Building2 size={14} /> Explore societies
          </Link>
        }
      />

      <Panel bodyClassName="p-0">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search your societies…" />
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs} value={role} onChange={setRole} />
          </div>
        </Toolbar>

        {loading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-52" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={items.length === 0 ? Building2 : Search}
            title={items.length === 0 ? "You have not joined a society yet" : "No societies match this view"}
            description={
              items.length === 0
                ? "Explore the societies at your campus and apply when recruitment opens."
                : "Try a different role filter or clear your search."
            }
            action={
              items.length === 0 ? (
                <Link href="/societies" className="btn btn-primary btn-sm">Explore societies</Link>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setRole("all"); setSearch(""); }}>
                  Clear filters
                </button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((society) => (
              <Link
                key={society.id}
                href={`/societies/${society.slug}`}
                className="card group flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
              >
                <div className="relative h-20" style={{ background: `linear-gradient(120deg, ${society.color || "#7c3aed"}22, #eef3ff)` }}>
                  <div className="absolute -bottom-6 left-4">
                    <SocietyAvatar society={society} size="lg" className="ring-4 ring-white" />
                  </div>
                  <span className="absolute right-3 top-3 capitalize">
                    <StatusBadge status={society.myRole || "member"} kind="society_role" />
                  </span>
                </div>
                <div className="flex flex-1 flex-col p-4 pt-9">
                  <p className="font-display text-[0.98rem] font-semibold text-ink group-hover:text-purple">{society.name}</p>
                  <p className="mt-1 line-clamp-2 text-[0.74rem] leading-relaxed text-mist">{society.tagline || society.category}</p>
                  <div className="mt-auto flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.7rem] text-mist">
                    <span className="inline-flex items-center gap-1.5">
                      <Users size={12} className="text-purple" /> {society.memberCount} members
                    </span>
                    <span className="inline-flex items-center gap-1 font-semibold text-purple">
                      Open <ArrowUpRight size={12} />
                    </span>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
