"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Download, Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { cn, formatDate, initials } from "@/lib/utils";

const STATUSES = ["pending", "approved", "rejected", "cancelled", "attended", "absent"];
const ATTENDANCE_TONE = { present: "badge-emerald", absent: "badge-rose", unmarked: "badge-slate" };

export default function RegistrationsTable({ registrations, eventBasePath }) {
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [attendance, setAttendance] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return registrations.filter((row) => {
      if (status !== "all" && row.status !== status) return false;
      if (attendance !== "all" && row.attendance !== attendance) return false;
      if (!q) return true;
      return [
        row.user.name,
        row.user.email,
        row.user.rollNumber,
        row.user.department,
        row.registrationId,
        row.event.title,
        row.event.category,
      ]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [registrations, query, status, attendance]);

  const exportCsv = () => {
    const header = [
      "Student",
      "Roll number",
      "Email",
      "Department",
      "Event",
      "Registration ID",
      "Status",
      "Attendance",
      "Registered at",
    ];
    const lines = filtered.map((row) =>
      [
        row.user.name,
        row.user.rollNumber,
        row.user.email,
        row.user.department,
        row.event.title,
        row.registrationId,
        row.status,
        row.attendance,
        row.registeredAt,
      ]
        .map((value) => `"${String(value || "").replace(/"/g, '""')}"`)
        .join(",")
    );
    const blob = new Blob([[header.join(","), ...lines].join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "registrations.csv";
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students, events, IDs…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All statuses</option>
          {STATUSES.map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <select
          value={attendance}
          onChange={(event) => setAttendance(event.target.value)}
          className="field w-auto py-2 text-[0.78rem]"
        >
          <option value="all">All attendance</option>
          {["present", "absent", "unmarked"].map((value) => (
            <option key={value} value={value}>
              {value}
            </option>
          ))}
        </select>
        <button type="button" onClick={exportCsv} className="btn btn-secondary btn-sm">
          <Download size={13} /> Export CSV
        </button>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {registrations.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No registrations match this view.
        </div>
      ) : (
        <>
          <div className="hidden overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015] md:block">
            <table className="table-console">
              <thead>
                <tr>
                  <th>Student</th>
                  <th>Event</th>
                  <th>Registration</th>
                  <th>Status</th>
                  <th>Attendance</th>
                  <th>Registered</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.id}>
                    <td>
                      <div className="flex items-center gap-2.5">
                        <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/60 to-blue-500/60 text-[0.6rem] font-bold text-white">
                          {initials(row.user.name)}
                        </span>
                        <span className="min-w-0">
                          <span className="block truncate text-[0.8rem] font-medium text-white">{row.user.name}</span>
                          <span className="text-[0.66rem] text-mist">
                            {row.user.rollNumber || row.user.email}
                          </span>
                        </span>
                      </div>
                    </td>
                    <td>
                      <Link
                        href={`${eventBasePath}/${row.event.id}`}
                        className="block max-w-[200px] truncate text-[0.78rem] text-white/85 hover:text-violet-300"
                      >
                        {row.event.title}
                      </Link>
                      <span className="text-[0.64rem] text-mist">
                        {row.event.category} · {formatDate(row.event.startAt)}
                      </span>
                    </td>
                    <td className="font-mono text-[0.7rem] text-mist">{row.registrationId}</td>
                    <td>
                      <StatusBadge status={row.status} kind="registration" />
                    </td>
                    <td>
                      <span className={cn("badge", ATTENDANCE_TONE[row.attendance] || ATTENDANCE_TONE.unmarked)}>
                        {row.attendance}
                      </span>
                    </td>
                    <td className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(row.registeredAt)}</td>
                    <td>
                      <div className="flex justify-end">
                        <Link href={`${eventBasePath}/${row.event.id}`} className="btn btn-ghost btn-sm">
                          Manage <ArrowUpRight size={12} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="space-y-2.5 md:hidden">
            {filtered.map((row) => (
              <div key={row.id} className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="truncate text-[0.82rem] font-medium text-white">{row.user.name}</p>
                    <p className="text-[0.68rem] text-mist">
                      {row.user.rollNumber || row.user.email}
                    </p>
                  </div>
                  <StatusBadge status={row.status} kind="registration" />
                </div>
                <p className="mt-2 truncate text-[0.74rem] text-white/80">{row.event.title}</p>
                <p className="text-[0.66rem] text-mist">
                  {formatDate(row.event.startAt)} · {row.registrationId}
                </p>
                <div className="mt-2.5 flex items-center justify-between gap-2">
                  <span className={cn("badge", ATTENDANCE_TONE[row.attendance] || ATTENDANCE_TONE.unmarked)}>
                    {row.attendance}
                  </span>
                  <Link href={`${eventBasePath}/${row.event.id}`} className="btn btn-ghost btn-sm">
                    Manage <ArrowUpRight size={12} />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
