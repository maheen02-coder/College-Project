import { cn } from "@/lib/utils";

const TONES = {
  violet: "border-violet-400/20 bg-violet-500/[0.07] text-violet-300",
  blue: "border-blue-400/20 bg-blue-500/[0.07] text-blue-300",
  emerald: "border-emerald-400/20 bg-emerald-500/[0.07] text-emerald-300",
  amber: "border-amber-400/20 bg-amber-500/[0.07] text-amber-300",
  rose: "border-rose-400/20 bg-rose-500/[0.07] text-rose-300",
  slate: "border-white/10 bg-white/[0.04] text-white/70",
};

export default function StatCard({ icon: Icon, label, value, hint, tone = "violet" }) {
  return (
    <div className="rounded-2xl border border-white/[0.06] bg-white/[0.02] p-4 sm:p-5">
      <div className="flex items-start justify-between gap-3">
        <p className="text-[0.66rem] font-medium uppercase tracking-[0.16em] text-mist">{label}</p>
        {Icon ? (
          <span className={cn("grid h-8 w-8 shrink-0 place-items-center rounded-lg border", TONES[tone])}>
            <Icon size={14} />
          </span>
        ) : null}
      </div>
      <p className="mt-3 font-display text-[1.65rem] font-semibold leading-none text-white">{value}</p>
      {hint ? <p className="mt-2 text-[0.7rem] text-mist">{hint}</p> : null}
    </div>
  );
}
