"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { CalendarDays, QrCode, ScanLine, ShieldCheck } from "lucide-react";
import {
  ChipTabs,
  ConsoleHeading,
  DataTable,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { ATTENDANCE_META, AttendanceBadge, EmptyState } from "@/components/dashboard/common";
import { formatDate } from "@/lib/utils";

export default function AttendancePage() {
  const { data, loading, error } = useApi("/api/registrations");
  const [filter, setFilter] = useState("all");
  const [search, setSearch] = useState("");

  const items = useMemo(() => (data?.items || []).filter((item) => item.event), [data]);
  const counts = useMemo(() => {
    const map = { present: 0, absent: 0, unmarked: 0 };
    for (const item of items) {
      const key = item.attendance || "unmarked";
      map[key] = (map[key] || 0) + 1;
    }
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const query = search.trim().toLowerCase();
    return items.filter((item) => {
      if (filter !== "all" && (item.attendance || "unmarked") !== filter) return false;
      if (!query) return true;
      return [item.event.title, item.event.venue, item.registrationId]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(query));
    });
  }, [items, filter, search]);

  const columns = [
    {
      key: "event",
      label: "Event",
      render: (row) => (
        <div className="min-w-[180px]">
          <Link href={`/events/${row.event.slug}`} className="font-medium text-ink hover:text-purple">
            {row.event.title}
          </Link>
          <p className="mt-0.5 text-[0.68rem] text-mist">
            {row.event.venue || "Venue TBA"} · <span className="font-mono">{row.registrationId}</span>
          </p>
        </div>
      ),
    },
    {
      key: "date",
      label: "Event date",
      render: (row) => <span className="whitespace-nowrap">{formatDate(row.event.startAt)}</span>,
    },
    {
      key: "status",
      label: "Registration",
      render: (row) => <StatusBadge status={row.status} kind="registration" />,
    },
    {
      key: "attendance",
      label: "Attendance",
      render: (row) => <AttendanceBadge attendance={row.attendance} />,
    },
    {
      key: "markedVia",
      label: "Marked via",
      render: (row) => (
        <span className="text-[0.74rem] capitalize text-mist">
          {(row.attendance || "unmarked") === "unmarked" ? "—" : String(row.markedVia || "manual").replace(/_/g, " ")}
        </span>
      ),
    },
  ];

  return (
    <>
      <ConsoleHeading
        eyebrow="Participation record"
        title="Attendance"
        description="Your verified presence at campus events — marked by organisers via QR check-in or manual roll call."
        actions={
          <Link href="/events" className="btn btn-secondary btn-sm">
            <CalendarDays size={14} /> Upcoming events
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Present" value={counts.present} icon="registrations" tone="emerald" hint="Checked in at the venue" />
        <StatTile label="Absent" value={counts.absent} icon="analytics" tone="rose" hint="Marked absent by organisers" />
        <StatTile label="Not marked" value={counts.unmarked} icon="events" tone="blue" hint="Awaiting attendance" />
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Panel bodyClassName="p-0">
          <Toolbar>
            <SearchBox value={search} onChange={setSearch} placeholder="Search events or registration ID…" />
            <div className="flex flex-wrap items-center gap-2 sm:ml-auto">
              <ChipTabs
                tabs={[
                  { value: "all", label: "All" },
                  { value: "present", label: `Present (${counts.present})` },
                  { value: "absent", label: `Absent (${counts.absent})` },
                  { value: "unmarked", label: `Not marked (${counts.unmarked})` },
                ]}
                value={filter}
                onChange={setFilter}
              />
            </div>
          </Toolbar>

          {!loading && !error && items.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No attendance records yet"
              description="Register for an event and check in at the venue to build your attendance record."
              action={<Link href="/events" className="btn btn-primary btn-sm">Find an event</Link>}
            />
          ) : (
            <DataTable
              columns={columns}
              rows={filtered}
              loading={loading}
              error={error}
              rowKey={(row) => row.id}
              emptyMessage="No records match this filter."
              footer={`${filtered.length} ${filtered.length === 1 ? "record" : "records"} shown`}
            />
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title="How QR check-in works" description="Attendance is recorded at the venue.">
            <ol className="space-y-4 p-5">
              {[
                { icon: QrCode, title: "Scan the event QR", text: "Organisers display a unique QR code at the entrance or on the sign-in desk." },
                { icon: ScanLine, title: "Open the check-in link", text: "Scanning opens /attend/<token> in your browser and identifies you automatically." },
                { icon: ShieldCheck, title: "Get marked present", text: "Your registration flips to attended and counts towards certificates and points." },
              ].map((step, index) => {
                const Icon = step.icon;
                return (
                  <li key={step.title} className="flex gap-3">
                    <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-lilac text-purple">
                      <Icon size={16} />
                    </span>
                    <div>
                      <p className="text-[0.82rem] font-semibold text-ink">
                        {index + 1}. {step.title}
                      </p>
                      <p className="mt-0.5 text-[0.74rem] leading-relaxed text-mist">{step.text}</p>
                    </div>
                  </li>
                );
              })}
            </ol>
          </Panel>

          <Panel title="Legend">
            <div className="space-y-2.5 p-5">
              {Object.entries(ATTENDANCE_META).map(([key, meta]) => (
                <div key={key} className="flex items-center justify-between gap-2 text-[0.76rem]">
                  <span className="capitalize text-mist">{key}</span>
                  <span className={`badge badge-${meta.tone}`}>{meta.label}</span>
                </div>
              ))}
              <p className="border-t border-line pt-3 text-[0.7rem] leading-relaxed text-mist">
                Contact the activities office if you attended an event but were not marked present.
              </p>
            </div>
          </Panel>
        </div>
      </div>
    </>
  );
}
