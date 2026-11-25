"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Download, ExternalLink, Search } from "lucide-react";
import StatusBadge from "@/components/ui/StatusBadge";
import { formatDate, initials } from "@/lib/utils";

const TYPES = ["participation", "winner", "runner_up", "achievement"];

export default function CertificateTable({ certificates }) {
  const [query, setQuery] = useState("");
  const [type, setType] = useState("all");
  const [status, setStatus] = useState("all");

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return certificates.filter((cert) => {
      if (type !== "all" && cert.type !== type) return false;
      if (status !== "all" && cert.status !== status) return false;
      if (!q) return true;
      return [cert.recipientName, cert.user?.name, cert.user?.rollNumber, cert.certificateId, cert.activityTitle]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });
  }, [certificates, query, type, status]);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative w-full sm:w-72">
          <Search size={14} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search recipient, activity, ID…"
            className="field py-2 pl-9 text-[0.78rem]"
          />
        </div>
        <select value={type} onChange={(event) => setType(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All types</option>
          {TYPES.map((value) => (
            <option key={value} value={value}>
              {value.replace(/_/g, " ")}
            </option>
          ))}
        </select>
        <select value={status} onChange={(event) => setStatus(event.target.value)} className="field w-auto py-2 text-[0.78rem]">
          <option value="all">All states</option>
          <option value="valid">Valid</option>
          <option value="revoked">Revoked</option>
        </select>
        <span className="ml-auto text-[0.72rem] text-mist">
          {filtered.length} of {certificates.length}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/10 px-6 py-12 text-center text-[0.8rem] text-mist">
          No certificates match this view.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-white/[0.06] bg-white/[0.015]">
          <table className="table-console">
            <thead>
              <tr>
                <th>Recipient</th>
                <th>Type</th>
                <th>Activity</th>
                <th>Certificate ID</th>
                <th>Issued</th>
                <th>State</th>
                <th className="text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((cert) => (
                <tr key={cert.id}>
                  <td>
                    <div className="flex items-center gap-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-amber-500/50 to-violet-500/50 text-[0.6rem] font-bold text-white">
                        {initials(cert.recipientName || cert.user?.name || "?")}
                      </span>
                      <span className="min-w-0">
                        <span className="block truncate text-[0.8rem] font-medium text-white">
                          {cert.recipientName || cert.user?.name}
                        </span>
                        <span className="text-[0.66rem] text-mist">{cert.user?.rollNumber || cert.user?.email || "—"}</span>
                      </span>
                    </div>
                  </td>
                  <td>
                    <StatusBadge status={cert.type} kind="certificate" />
                  </td>
                  <td>
                    <p className="max-w-[200px] truncate text-[0.76rem] text-white/85">{cert.activityTitle}</p>
                    <p className="text-[0.64rem] capitalize text-mist">{cert.activityKind}</p>
                  </td>
                  <td className="font-mono text-[0.7rem] text-mist">{cert.certificateId}</td>
                  <td className="whitespace-nowrap text-[0.72rem] text-mist">{formatDate(cert.issuedAt)}</td>
                  <td>
                    <span className={cert.status === "valid" ? "badge badge-emerald" : "badge badge-rose"}>
                      {cert.status}
                    </span>
                  </td>
                  <td>
                    <div className="flex items-center justify-end gap-1.5">
                      {cert.status === "valid" ? (
                        <a
                          href={`/api/certificates/${cert.id}/download`}
                          className="btn btn-ghost btn-sm"
                          aria-label="Download certificate"
                        >
                          <Download size={12} />
                        </a>
                      ) : null}
                      <Link
                        href={`/verify/${cert.certificateId}`}
                        className="btn btn-ghost btn-sm"
                        aria-label="Verify certificate"
                      >
                        <ExternalLink size={12} />
                      </Link>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
