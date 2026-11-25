"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Award, BadgeCheck, Download, ExternalLink, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import { ChipTabs, ConsoleHeading, Panel, Skeleton, StatTile, Toolbar, useApi } from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { EmptyState, ErrorState } from "@/components/dashboard/common";
import { CERTIFICATE_TYPE_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

const TONE_ACCENT = {
  violet: "from-violet-500/15 to-blue-500/5 text-purple",
  amber: "from-amber-400/20 to-amber-100/30 text-amber-600",
  blue: "from-blue-500/15 to-sky-100/40 text-blue-600",
  emerald: "from-emerald-500/15 to-emerald-100/30 text-emerald-600",
};

export default function CertificatesPage() {
  const { data, loading, error, reload } = useApi("/api/certificates");
  const [type, setType] = useState("all");

  const certificates = useMemo(() => data?.certificates || [], [data]);
  const valid = certificates.filter((cert) => cert.status === "valid");
  const awards = certificates.filter((cert) => cert.type !== "participation");

  const counts = useMemo(() => {
    const map = { all: certificates.length };
    for (const cert of certificates) map[cert.type] = (map[cert.type] || 0) + 1;
    return map;
  }, [certificates]);

  const tabs = [
    { value: "all", label: `All (${counts.all || 0})` },
    ...Object.keys(counts)
      .filter((key) => key !== "all" && counts[key])
      .map((key) => ({ value: key, label: `${CERTIFICATE_TYPE_META[key]?.label || key} (${counts[key]})` })),
  ];

  const filtered = type === "all" ? certificates : certificates.filter((cert) => cert.type === type);

  return (
    <>
      <ConsoleHeading
        eyebrow="Achievement wallet"
        title="Certificates"
        description="QR-verifiable certificates for verified participation, volunteering and competition results."
        actions={
          <Link href="/verify" className="btn btn-secondary btn-sm">
            <ShieldCheck size={14} /> Verify a certificate
          </Link>
        }
      />

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <StatTile label="Total certificates" value={certificates.length} icon="certificates" tone="purple" hint="Issued to your account" />
        <StatTile label="Valid records" value={valid.length} icon="analytics" tone="emerald" hint="Ready to download and verify" />
        <StatTile label="Awards & positions" value={awards.length} icon="competitions" tone="amber" hint="Beyond participation" />
      </div>

      <Panel bodyClassName="p-0">
        <Toolbar>
          <span className="inline-flex items-center gap-2 text-[0.78rem] font-medium text-ink">
            <Award size={15} className="text-purple" /> Filter by type
          </span>
          <div className="sm:ml-auto">
            <ChipTabs tabs={tabs} value={type} onChange={setType} />
          </div>
        </Toolbar>

        {loading ? (
          <div className="grid gap-4 p-5 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <Skeleton key={index} className="h-64" />
            ))}
          </div>
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : filtered.length === 0 ? (
          <EmptyState
            icon={Award}
            title={certificates.length === 0 ? "No certificates yet" : "No certificates of this type"}
            description={
              certificates.length === 0
                ? "Attend events, volunteer with societies and compete to start your verified collection."
                : "Try another certificate type filter."
            }
            action={
              certificates.length === 0 ? (
                <>
                  <Link href="/events" className="btn btn-secondary btn-sm">Attend an event</Link>
                  <Link href="/competitions" className="btn btn-primary btn-sm">Enter a competition</Link>
                </>
              ) : (
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => setType("all")}>
                  Show all
                </button>
              )
            }
          />
        ) : (
          <div className="grid gap-4 p-4 sm:p-5 md:grid-cols-2 xl:grid-cols-3">
            {filtered.map((cert) => {
              const meta = CERTIFICATE_TYPE_META[cert.type] || { label: cert.type, tone: "violet" };
              const accent = TONE_ACCENT[meta.tone] || TONE_ACCENT.violet;
              const revoked = cert.status !== "valid";
              return (
                <article key={cert.id} className={`card relative overflow-hidden bg-gradient-to-br p-4 ${accent}`}>
                  <div className="flex items-start justify-between gap-2">
                    <span className="grid h-10 w-10 place-items-center rounded-xl bg-white/80 text-current shadow-sm">
                      {cert.type === "winner" || cert.type === "runner_up" ? <Trophy size={17} /> : <Award size={17} />}
                    </span>
                    <div className="flex flex-col items-end gap-1">
                      <StatusBadge status={cert.type} kind="certificate" />
                      {revoked ? <span className="badge badge-rose">Revoked</span> : <span className="badge badge-emerald"><BadgeCheck size={10} /> Valid</span>}
                    </div>
                  </div>

                  <p className="mt-4 text-[0.62rem] font-semibold uppercase tracking-[0.16em] text-mist">{cert.activityKind || "Activity"}</p>
                  <h2 className="mt-1 line-clamp-2 font-display text-[1rem] font-semibold leading-snug text-ink">{cert.activityTitle}</h2>
                  <p className="mt-1 text-[0.72rem] text-mist">Issued {formatDate(cert.issuedAt)}</p>
                  <p className="mt-0.5 font-mono text-[0.66rem] text-mist">{cert.certificateId}</p>

                  <div className="mt-4 flex items-center gap-2 border-t border-line/80 pt-3">
                    {!revoked ? (
                      <a href={`/api/certificates/${cert.id}/download`} className="btn btn-primary btn-sm flex-1">
                        <Download size={13} /> Download PDF
                      </a>
                    ) : (
                      <span className="btn btn-ghost btn-sm flex-1 cursor-not-allowed opacity-60">Download unavailable</span>
                    )}
                    <Link href={`/verify/${cert.certificateId}`} className="btn btn-ghost btn-sm" aria-label="Verify certificate">
                      <ExternalLink size={13} />
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </Panel>

      <p className="mt-5 flex items-center gap-2 text-[0.72rem] text-mist">
        <Sparkles size={13} className="text-purple" />
        Every certificate PDF embeds a QR code that resolves to its public verification record.
      </p>
    </>
  );
}
