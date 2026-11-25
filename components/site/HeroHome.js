"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Sparkles, Trophy, Users } from "lucide-react";
import Magnetic from "@/components/ui/Magnetic";
import { formatDate, formatTime } from "@/lib/utils";

export default function HeroHome({ nextEvent, stats = {}, openCompetitions = 0 }) {
  const ref = useRef(null);
  const reduced = useReducedMotion();
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const imageX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const imageY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const cardX = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const cardY = useTransform(sy, [-0.5, 0.5], [12, -12]);

  const onMove = (event) => {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <section ref={ref} onMouseMove={onMove} className="relative overflow-hidden bg-ivory">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-6 h-80 w-80 rounded-full bg-[#ddd6fe]/70 blur-[110px]" />
        <div className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[#bfdbfe]/70 blur-[110px]" />
        <div className="bg-dots absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
      </div>

      <div className="container-x relative grid items-center gap-14 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div>
          <motion.span
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="chip"
          >
            <Sparkles size={13} className="text-amber" />
            KIPS College · Campus Event Hub
          </motion.span>

          <motion.h1
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.08 }}
            className="mt-5 text-balance font-display text-[2.6rem] font-bold leading-[1.06] tracking-tight text-ink sm:text-[3.4rem]"
          >
            Your campus life,
            <br />
            <span className="heading-gradient">beautifully connected.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.16 }}
            className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-mist"
          >
            Discover events, join societies, enter competitions and collect verified certificates — one elegant
            home for everything happening at KIPS College.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 22 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, delay: 0.24 }}
            className="mt-8 flex flex-wrap items-center gap-3"
          >
            <Magnetic>
              <Link href="/events" className="btn btn-primary btn-lg">
                Explore events <ArrowRight size={16} />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/societies" className="btn btn-secondary btn-lg">
                Join a society
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, delay: 0.38 }}
            className="mt-10 flex flex-wrap gap-x-8 gap-y-4"
          >
            {[
              { label: "Verified students", value: stats.verifiedStudents ?? 0, icon: BadgeCheck },
              { label: "Societies", value: stats.societies ?? 0, icon: Users },
              { label: "Certificates issued", value: stats.certificates ?? 0, icon: Trophy },
            ].map((item) => (
              <div key={item.label} className="flex items-center gap-2.5">
                <span className="grid h-9 w-9 place-items-center rounded-xl bg-white text-purple shadow-[0_8px_20px_-12px_rgba(23,19,50,0.4)]">
                  <item.icon size={16} />
                </span>
                <span>
                  <span className="block font-display text-lg font-bold leading-none text-ink">
                    {Number(item.value).toLocaleString()}
                  </span>
                  <span className="mt-1 block text-[0.66rem] uppercase tracking-[0.12em] text-mist">{item.label}</span>
                </span>
              </div>
            ))}
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative mx-auto w-full max-w-[540px]"
        >
          <motion.div style={reduced ? undefined : { x: imageX, y: imageY }} className="relative">
            <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-[#c4b5fd]/60 via-transparent to-[#93c5fd]/60 blur-2xl" />
            <div className="relative overflow-hidden rounded-[1.9rem] border border-white/70 bg-white shadow-[0_50px_90px_-45px_rgba(76,29,149,0.5)]">
              <img
                src="/2campus.jfif"
                alt="KIPS College campus"
                className="h-[330px] w-full object-cover sm:h-[380px]"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-[#171332]/55 via-transparent to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between gap-3 rounded-2xl bg-white/92 px-4 py-3 backdrop-blur-md">
                <span className="flex items-center gap-2 text-[0.72rem] font-semibold text-ink">
                  <MapPin size={14} className="text-purple" /> Main Campus · KIPS College
                </span>
                <span className="rounded-full bg-emerald/10 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.1em] text-emerald">
                  Live
                </span>
              </div>
            </div>
          </motion.div>

          {nextEvent ? (
            <motion.div
              style={reduced ? undefined : { x: cardX, y: cardY }}
              className="absolute -left-3 top-8 hidden w-[230px] rounded-2xl border border-line bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgba(23,19,50,0.5)] backdrop-blur sm:block"
            >
              <p className="text-[0.6rem] font-bold uppercase tracking-[0.16em] text-purple">Next event</p>
              <p className="mt-1.5 line-clamp-2 font-display text-[0.86rem] font-bold leading-snug text-ink">
                {nextEvent.title}
              </p>
              <div className="mt-2 flex items-center gap-2 text-[0.66rem] text-mist">
                <CalendarDays size={12} className="text-blue" />
                {formatDate(nextEvent.startAt)} · {formatTime(nextEvent.startAt)}
              </div>
              <span className="mt-2.5 inline-flex items-center gap-1 rounded-full bg-lavender px-2 py-1 text-[0.6rem] font-semibold text-purple">
                <Users size={10} /> {nextEvent.registeredCount || 0} registered
              </span>
            </motion.div>
          ) : null}

          <motion.div
            style={reduced ? undefined : { x: cardX, y: cardY }}
            className="absolute -bottom-5 right-0 w-[210px] rounded-2xl border border-line bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgba(23,19,50,0.5)] backdrop-blur"
          >
            <div className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-emerald/10 text-emerald">
                <BadgeCheck size={15} />
              </span>
              <div>
                <p className="font-display text-[0.8rem] font-bold text-ink">Verified record</p>
                <p className="text-[0.62rem] text-mist">QR-checked certificates</p>
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between text-[0.65rem] text-mist">
              <span>Open competitions</span>
              <span className="font-bold text-ink">{openCompetitions}</span>
            </div>
          </motion.div>
        </motion.div>
      </div>
    </section>
  );
}
