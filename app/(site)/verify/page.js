import { Fingerprint, QrCode, ShieldCheck } from "lucide-react";
import PageHeader from "@/components/site/PageHeader";
import VerifyForm from "@/components/site/VerifyForm";
import Reveal from "@/components/ui/Reveal";
import { connectDB } from "@/lib/db";
import Certificate from "@/lib/models/Certificate";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Verify a certificate",
  description: "Verify the authenticity of any KIPS College certificate using its unique ID or QR code.",
};

const STEPS = [
  { icon: QrCode, title: "Find the certificate ID", body: "Every PDF certificate carries a unique ID and QR code in its footer." },
  { icon: Fingerprint, title: "Scan or enter the ID", body: "Scan the QR with your phone camera, or type the ID exactly as printed." },
  { icon: ShieldCheck, title: "Read the verified record", body: "Recipient, award, activity and issue date are pulled live from the campus ledger." },
];

export default async function VerifyPage() {
  await connectDB();
  const latest = await Certificate.findOne({ status: "valid" }).sort({ issuedAt: -1 }).lean();

  return (
    <div>
      <PageHeader
        eyebrow="Trust & transparency"
        title="Verify a certificate"
        description="Instantly confirm that a KIPS College participation, achievement or leadership certificate is genuine."
        breadcrumb={[{ label: "Verify certificate" }]}
      >
        <span className="chip"><ShieldCheck size={13} className="text-emerald" /> Official ledger</span>
      </PageHeader>

      <div className="container-x py-12">
        <div className="mx-auto max-w-2xl">
          <VerifyForm sampleId={latest?.certificateId || ""} />
        </div>

        <div className="mt-12 grid gap-4 sm:grid-cols-3">
          {STEPS.map((step, index) => (
            <Reveal key={step.title} delay={index * 0.06} className="card p-6">
              <span className="grid h-11 w-11 place-items-center rounded-xl bg-lilac text-purple">
                <step.icon size={19} />
              </span>
              <p className="mt-4 text-[0.62rem] font-bold uppercase tracking-[0.16em] text-mist">Step {index + 1}</p>
              <h2 className="mt-1 font-display text-[0.98rem] font-bold text-ink">{step.title}</h2>
              <p className="mt-1.5 text-[0.8rem] leading-relaxed text-mist">{step.body}</p>
            </Reveal>
          ))}
        </div>

        <div className="mt-10 card mx-auto max-w-2xl p-6 text-center">
          <p className="text-[0.82rem] text-mist">
            Certificate IDs follow the format <span className="font-mono font-semibold text-purple">CEH-CERT-YYYY-XXXXX</span>.
            If a certificate returns “not found”, contact the campus office before relying on it.
          </p>
        </div>
      </div>
    </div>
  );
}
