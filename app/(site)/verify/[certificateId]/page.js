import Link from "next/link";
import QRCode from "qrcode";
import {
  ArrowLeft,
  BadgeCheck,
  CalendarDays,
  Download,
  ShieldAlert,
  ShieldCheck,
  ShieldX,
  UserRound,
} from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import { connectDB } from "@/lib/db";
import { getSessionUser } from "@/lib/auth";
import Certificate from "@/lib/models/Certificate";
import Institute from "@/lib/models/Institute";
import { CERTIFICATE_TYPE_META } from "@/lib/constants";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }) {
  const { certificateId } = await params;
  return {
    title: `Verify ${decodeURIComponent(certificateId).toUpperCase()}`,
    description: "Public verification of a KIPS College certificate.",
  };
}

export default async function VerifyCertificatePage({ params }) {
  const { certificateId } = await params;
  const normalized = decodeURIComponent(certificateId).trim().toUpperCase();

  await connectDB();
  const certificate = await Certificate.findOne({ certificateId: normalized }).lean();
  const institute = certificate ? await Institute.findById(certificate.institute).lean() : null;
  const user = await getSessionUser();

  const verifyUrl = `${process.env.APP_URL || "http://localhost:3005"}/verify/${normalized}`;
  const qr = certificate
    ? await QRCode.toDataURL(verifyUrl, { width: 240, margin: 1, color: { dark: "#171332", light: "#ffffff" } })
    : null;

  const valid = certificate?.status === "valid";
  const meta = certificate ? CERTIFICATE_TYPE_META[certificate.type] || {} : {};
  const canDownload = Boolean(certificate && user && (String(certificate.user) === String(user.id) || ["admin", "superadmin"].includes(user.role)));

  return (
    <div>
      <PageHeader
        eyebrow="Certificate verification"
        title={certificate ? (valid ? "Certificate verified" : "Certificate revoked") : "Certificate not found"}
        description={
          certificate
            ? `Record ${normalized} checked against the ${institute?.name || "KIPS College"} certificate ledger.`
            : "We could not find this certificate ID in the campus ledger."
        }
        breadcrumb={[{ label: "Verify", href: "/verify" }, { label: normalized }]}
      >
        <span className={`chip ${valid ? "bg-emerald/10 text-emerald" : certificate ? "bg-rose/10 text-rose" : "bg-lavender text-mist"}`}>
          {valid ? <ShieldCheck size={13} /> : certificate ? <ShieldX size={13} /> : <ShieldAlert size={13} />}
          {valid ? "Valid" : certificate ? "Revoked" : "Not found"}
        </span>
      </PageHeader>

      <div className="container-x py-12">
        <Link href="/verify" className="inline-flex items-center gap-1.5 text-[0.76rem] font-semibold text-mist transition hover:text-purple">
          <ArrowLeft size={14} /> Verify another certificate
        </Link>

        {certificate ? (
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_0.9fr]">
            <div className="card overflow-hidden">
              <div className={`h-1.5 w-full ${valid ? "bg-gradient-to-r from-emerald to-blue" : "bg-rose"}`} />
              <div className="p-7 sm:p-10">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-purple">
                    {institute?.name || "KIPS College"}
                  </p>
                  <span className={`badge ${valid ? "badge-emerald" : "badge-rose"}`}>
                    {valid ? <BadgeCheck size={12} /> : <ShieldX size={12} />}
                    {valid ? "Verified certificate" : "Revoked"}
                  </span>
                </div>

                <p className="mt-8 text-[0.8rem] uppercase tracking-[0.18em] text-mist">{meta.title || "Certificate"}</p>
                <h1 className="mt-2 font-display text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  {certificate.recipientName}
                </h1>
                <p className="mt-3 max-w-xl text-[0.92rem] leading-relaxed text-ink-2/90">
                  {meta.action || "in recognition of"} <span className="font-semibold text-ink">{certificate.activityTitle}</span>
                  {certificate.reason ? `. ${certificate.reason}` : "."}
                </p>

                <div className="mt-8 grid gap-4 sm:grid-cols-3">
                  <div className="rounded-xl bg-lavender/70 px-4 py-3">
                    <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Certificate ID</p>
                    <p className="mt-1 font-mono text-[0.78rem] font-semibold text-ink">{certificate.certificateId}</p>
                  </div>
                  <div className="rounded-xl bg-lavender/70 px-4 py-3">
                    <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Issued on</p>
                    <p className="mt-1 text-[0.8rem] font-semibold text-ink">{formatDate(certificate.issuedAt)}</p>
                  </div>
                  <div className="rounded-xl bg-lavender/70 px-4 py-3">
                    <p className="text-[0.62rem] uppercase tracking-[0.12em] text-mist">Issued by</p>
                    <p className="mt-1 truncate text-[0.8rem] font-semibold text-ink">{certificate.issuedByName || "Campus office"}</p>
                  </div>
                </div>

                <div className="mt-8 flex flex-wrap items-center gap-3 border-t border-line pt-6">
                  <span className="inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
                    <ShieldCheck size={14} className="text-emerald" /> Checked live against the certificate ledger
                  </span>
                  {canDownload && valid ? (
                    <a href={`/api/certificates/${certificate._id}/download`} className="btn btn-primary btn-sm ml-auto">
                      <Download size={14} /> Download PDF
                    </a>
                  ) : (
                    <Link href="/login" className="btn btn-secondary btn-sm ml-auto">
                      Sign in to download
                    </Link>
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="card p-6 text-center">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-mist">Scan to verify</p>
                {qr ? <img src={qr} alt="Verification QR code" className="mx-auto mt-3 h-44 w-44 rounded-xl" /> : null}
                <p className="mt-3 break-all font-mono text-[0.68rem] text-mist">{verifyUrl}</p>
              </div>

              <div className="card p-5">
                <p className="text-[0.64rem] font-bold uppercase tracking-[0.14em] text-mist">Recipient</p>
                <p className="mt-2 flex items-center gap-2 text-[0.86rem] font-semibold text-ink">
                  <UserRound size={15} className="text-purple" /> {certificate.recipientName}
                </p>
                <p className="mt-2 flex items-center gap-2 text-[0.78rem] text-mist">
                  <CalendarDays size={14} className="text-blue" /> {formatDate(certificate.issuedAt)}
                </p>
              </div>

              {!valid ? (
                <div className="rounded-xl border border-rose/30 bg-rose/5 px-4 py-3.5 text-[0.78rem] text-rose">
                  This certificate has been revoked and should not be relied on. Contact the campus office for details.
                </div>
              ) : null}
            </div>
          </div>
        ) : (
          <div className="card mx-auto mt-6 max-w-xl p-10 text-center">
            <span className="mx-auto grid h-16 w-16 place-items-center rounded-2xl bg-rose/10 text-rose">
              <ShieldX size={28} />
            </span>
            <h2 className="mt-4 font-display text-xl font-bold text-ink">No certificate matches this ID</h2>
            <p className="mt-2 text-sm leading-relaxed text-mist">
              Double-check the ID printed on the certificate (<span className="font-mono">KIPS-CERT-XXXXXX</span>) or scan its QR code.
              If it still fails, the certificate may be invalid.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/verify" className="btn btn-primary btn-sm">Try again</Link>
              <Link href="/" className="btn btn-ghost btn-sm">Back home</Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
