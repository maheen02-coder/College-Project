"use client";

import { useMemo, useState } from "react";
import { Award, Search, Trophy } from "lucide-react";
import { formatDate, initials } from "@/lib/utils";

const SORTS = [
  ["activity", "Most active"],
  ["registrations", "Event registrations"],
  ["entries", "Competition entries"],
  ["certificates", "Certificates"],
  ["name", "Name A–Z"],
  ["recent", "Recently joined"],
];

export default function ParticipantsTable({ students }) {
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState("activity");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    const rows = students.filter((student) =>
      [student.name, student.email, student.rollNumber, student.department, student.program]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
    const sorters = {
      activity: (a, b) =>
        b.registrations + b.entries + b.certificates - (a.registrations + a.entries + a.certificates),
      registrations: (a, b) => b.registrations - a.registrations,
      entries: (a, b) => b.entries - a.entries,
      certificates: (a, b) => b.certificates - a.certificates,
      name: (a, b) => a.name.localeCompare(b.name),
      recent: (a, b) => new Date(b.createdAt) - new Date(a.createdAt),
    };
    return [...rows].sort(sorters[sort] || sorters.activity);
  }, [students, query, sort]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search students…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select value={sort} onChange={(event) => setSort(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          {SORTS.map(([value, label]) => (
            <option key={value} value={value}>
              Sort: {label}
            </option>
          ))}
        </select>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {students.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No students match this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <table className="table-console">
            <thead>
              <tr>
                <th>Student</th>
                <th>Department</th>
                <th className="text-center">Registrations</th>
                <th className="text-center">Entries</th>
                <th className="text-center">Certificates</th>
                <th>Joined</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((student) => (
                <tr key={student.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-violet-500/60 to-blue-500/60 text-[0.6rem] font-bold text-white">
                        {initials(student.name)}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8rem] font-medium text-white">{student.name}</span>
                        <span className="text-[0.66rem] text-mist">
                          {student.rollNumber || student.email}
                        </span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <p className="text-[0.76rem] text-white/80">{student.department || "—"}</p>
                    <p className="text-[0.64rem] text-mist">
                      {student.program || "Programme not set"}
                      {student.semester ? ` · ${student.semester}` : ""}
                    </p>
                  </td>
                  <td className="text-center font-mono text-[0.8rem] text-white/85">{student.registrations}</td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1 font-mono text-[0.8rem] text-blue-200">
                      <Trophy size={11} /> {student.entries}
                    </span>
                  </td>
                  <td className="text-center">
                    <span className="inline-flex items-center gap-1 font-mono text-[0.8rem] text-amber-200">
                      <Award size={11} /> {student.certificates}
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(student.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
