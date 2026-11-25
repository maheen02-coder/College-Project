import Link from "next/link";
import { ArrowLeft, BadgeCheck, CalendarDays, ShieldCheck, Sparkles, Trophy } from "lucide-react";
import Brand from "@/components/ui/Brand";
import { getInstitute } from "@/lib/queries";

const FEATURES = [
  { icon: CalendarDays, title: "Every campus moment", body: "Events, workshops and cultural nights curated by your college." },
  { icon: Trophy, title: "Compete and climb", body: "Enter solo or team competitions, track results and win certificates." },
  { icon: ShieldCheck, title: "Verified participation", body: "QR-checked attendance and certificates with public verification." },
];

export default async function AuthLayout({ children }) {
  const institute = await getInstitute();

  return (
    <div className="relative min-h-screen overflow-hidden bg-ivory">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-32 top-0 h-[420px] w-[420px] rounded-full bg-[#ddd6fe]/60 blur-[120px]" />
        <div className="absolute -right-20 bottom-0 h-[360px] w-[360px] rounded-full bg-[#bfdbfe]/60 blur-[120px]" />
        <div className="bg-dots absolute inset-0 opacity-60" />
      </div>

      <div className="container-x relative grid min-h-screen items-center gap-12 py-12 lg:grid-cols-[1.02fr_0.98fr]">
        <div className="hidden lg:block">
          <Brand institute={institute} />

          <p className="eyebrow mt-14">KIPS College · Campus Event Hub</p>
          <h1 className="mt-4 max-w-xl text-balance font-display text-[2.8rem] font-bold leading-[1.05] tracking-tight text-ink">
            Your campus.
            <br />
            Your events.
            <br />
            <span className="heading-gradient">Your record.</span>
          </h1>
          <p className="mt-5 max-w-md text-[0.92rem] leading-relaxed text-mist">
            One account for every event, society, competition and certificate across campus — with a verified
            academic identity behind it.
          </p>

          <div className="mt-9 space-y-4">
            {FEATURES.map((feature) => (
              <div key={feature.title} className="flex items-start gap-3.5">
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-xl bg-white text-purple shadow-[0_10px_24px_-16px_rgba(23,19,50,0.5)]">
                  <feature.icon size={17} />
                </span>
                <div>
                  <p className="font-display text-[0.9rem] font-bold text-ink">{feature.title}</p>
                  <p className="mt-0.5 max-w-sm text-[0.78rem] leading-relaxed text-mist">{feature.body}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-10 flex items-center gap-2 rounded-xl border border-line bg-white/80 px-4 py-3 text-[0.72rem] text-mist">
            <BadgeCheck size={15} className="text-emerald" />
            Verified by {institute?.name || "KIPS College"} · academic records stay private
          </div>
        </div>

        <div className="w-full max-w-md justify-self-center lg:justify-self-end">
          <div className="mb-6 flex items-center justify-between lg:hidden">
            <Brand institute={institute} compact />
            <Link href="/" className="text-[0.74rem] font-semibold text-mist transition hover:text-purple">
              Back home
            </Link>
          </div>
          {children}
          <Link
            href="/"
            className="mx-auto mt-6 flex w-fit items-center gap-1.5 text-[0.74rem] text-mist transition hover:text-purple"
          >
            <ArrowLeft size={12} /> Back to campus home
          </Link>
        </div>
      </div>
    </div>
  );
}
