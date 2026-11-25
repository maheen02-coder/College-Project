"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Info, MessagesSquare, Search, Users } from "lucide-react";
import { ConsoleHeading, Panel, SearchBox, Skeleton, Toolbar, useApi } from "@/components/layout/ui";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { timeAgo } from "@/lib/utils";

export default function MyGroupsPage() {
  const { data, loading, error, reload } = useApi("/api/groups");
  const [search, setSearch] = useState("");
  const groups = useMemo(() => data?.groups || [], [data]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return groups;
    return groups.filter((group) =>
      [group.name, group.society?.name, group.lastMessagePreview].filter(Boolean).some((value) =>
        String(value).toLowerCase().includes(query)
      )
    );
  }, [groups, search]);

  return (
    <>
      <ConsoleHeading
        eyebrow="Team communication"
        title="Groups & chat"
        description="Collaborate with your society teams, share updates and keep every project conversation in one place."
      />

      <div className="mb-5">
        <div className="flex items-start gap-2.5 rounded-xl border border-violet-200 bg-violet-50 px-3.5 py-2.5 text-[0.78rem] text-violet-700">
          <Info size={15} className="mt-0.5 shrink-0" />
          <p>Groups are created and managed by society administrators. Ask your society lead to add you to a new group.</p>
        </div>
      </div>

      <Panel bodyClassName="p-0">
        <Toolbar>
          <SearchBox value={search} onChange={setSearch} placeholder="Search groups or societies…" />
          <span className="text-[0.72rem] text-mist sm:ml-auto">{filtered.length} {filtered.length === 1 ? "group" : "groups"}</span>
        </Toolbar>

        {loading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-44" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={groups.length === 0 ? MessagesSquare : Search}
            title={groups.length === 0 ? "No groups yet" : "No groups match your search"}
            description={
              groups.length === 0
                ? "Once a society adds you to a team, your group chats will appear here."
                : "Try a different search term."
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((group) => (
              <Link
                key={group.id}
                href={`/dashboard/groups/${group.id}`}
                className="card group flex flex-col overflow-hidden p-4 transition hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-lg"
              >
                <div className="flex items-start gap-3">
                  <span
                    className="grid h-11 w-11 shrink-0 place-items-center rounded-xl border text-white"
                    style={{ backgroundColor: group.color || "#7c3aed", borderColor: `${group.color || "#7c3aed"}40` }}
                  >
                    <MessagesSquare size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate font-display text-[0.94rem] font-semibold text-ink group-hover:text-purple">{group.name}</p>
                      {group.isArchived ? <span className="badge badge-slate">Archived</span> : null}
                      {group.unreadCount > 0 ? (
                        <span className="ml-auto grid h-5 min-w-5 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 px-1 text-[0.6rem] font-bold text-white">
                          {group.unreadCount > 9 ? "9+" : group.unreadCount}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-0.5 truncate text-[0.7rem] text-mist">{group.society?.name || "Society group"}</p>
                  </div>
                </div>

                <p className="mt-3 line-clamp-2 min-h-[2.2rem] text-[0.74rem] leading-relaxed text-mist">
                  {group.lastMessagePreview || group.description || "No messages yet — say hello to your team."}
                </p>

                <div className="mt-3 flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.68rem] text-mist">
                  <span className="inline-flex items-center gap-1.5">
                    <Users size={12} className="text-purple" /> {group.memberCount} members
                    {group.isModerator ? " · moderator" : ""}
                  </span>
                  <span className="inline-flex items-center gap-1 text-purple">
                    {group.lastMessageAt ? timeAgo(group.lastMessageAt) : "New"} <ArrowUpRight size={12} />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </Panel>
    </>
  );
}
