"use client";

import { useEffect, useRef, useState } from "react";
import { useInView, useReducedMotion } from "framer-motion";
import { Award, BadgeCheck, CalendarDays, ClipboardCheck, GraduationCap, Trophy, Users } from "lucide-react";

const ICONS = {
  students: GraduationCap,
  verified: BadgeCheck,
  users: Users,
  events: CalendarDays,
  registrations: ClipboardCheck,
  certificates: Award,
  types: Trophy,
};

export default function StatCounter({ value = 0, label, suffix = "", icon, hint }) {
  const Icon = typeof icon === "string" ? ICONS[icon] : icon;
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(reduced ? value : 0);

  useEffect(() => {
    if (!inView || reduced) return;
    const duration = 1400;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(value * eased));
      if (progress < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [inView, value, reduced]);

  return (
    <div ref={ref} className="stat-card flex flex-col items-center gap-1 px-4 py-5 text-center">
      {Icon ? (
        <span className="mb-1 grid h-10 w-10 place-items-center rounded-xl bg-lilac text-purple">
          <Icon size={18} />
        </span>
      ) : null}
      <span className="font-display text-3xl font-bold tracking-tight text-ink">
        {display.toLocaleString()}
        {suffix}
      </span>
      <span className="text-[0.72rem] font-semibold uppercase tracking-[0.14em] text-mist">{label}</span>
      {hint ? <span className="mt-0.5 text-[0.68rem] text-mist">{hint}</span> : null}
    </div>
  );
}
