"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useScroll, useSpring, useTransform } from "framer-motion";
import { ArrowRight, BadgeCheck, CalendarDays, MapPin, Sparkles, Trophy, Users } from "lucide-react";
import Magnetic from "@/components/ui/Magnetic";
import LazyImage from "@/components/ui/LazyImage";
import usePrefersReducedMotion from "@/components/ui/usePrefersReducedMotion";
import { formatDate, formatTime } from "@/lib/utils";

const EASE = [0.22, 1, 0.36, 1];

function SplitHeading({ text, ready, delay = 0, stagger = 0.018 }) {
  const words = text.split(" ");
  let offset = 0;

  return (
    <span className="block" aria-hidden="true">
      {words.map((word, wordIndex) => {
        const start = offset;
        offset += word.length;
        return (
          <span key={`${word}-${wordIndex}`}>
            <span className="hero-word">
              {Array.from(word).map((char, charIndex) => (
                <motion.span
                  key={charIndex}
                  className="hero-char"
                  initial={{ opacity: 0, y: "0.55em", scale: 0.96 }}
                  animate={ready ? { opacity: 1, y: 0, scale: 1 } : { opacity: 0, y: "0.55em", scale: 0.96 }}
                  transition={{
                    duration: 0.72,
                    delay: delay + (start + charIndex) * stagger,
                    ease: EASE,
                  }}
                >
                  {char}
                </motion.span>
              ))}
            </span>
            {wordIndex < words.length - 1 ? " " : null}
          </span>
        );
      })}
    </span>
  );
}

export default function HeroHome({ nextEvent, stats = {}, openCompetitions = 0 }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const [ready, setReady] = useState(false);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const sx = useSpring(mx, { stiffness: 90, damping: 18 });
  const sy = useSpring(my, { stiffness: 90, damping: 18 });
  const glowX = useSpring(0, { stiffness: 55, damping: 20, mass: 0.6 });
  const glowY = useSpring(0, { stiffness: 55, damping: 20, mass: 0.6 });
  const imageX = useTransform(sx, [-0.5, 0.5], [-14, 14]);
  const imageY = useTransform(sy, [-0.5, 0.5], [-10, 10]);
  const cardX = useTransform(sx, [-0.5, 0.5], [18, -18]);
  const cardY = useTransform(sy, [-0.5, 0.5], [12, -12]);

  const { scrollYProgress } = useScroll({ target: ref, offset: ["start start", "end start"] });
  const scrollY = useTransform(scrollYProgress, [0, 1], [0, 70]);
  const scrollScale = useTransform(scrollYProgress, [0, 1], [1, 1.05]);
  const blobUp = useTransform(scrollYProgress, [0, 1], [0, -80]);
  const blobDown = useTransform(scrollYProgress, [0, 1], [0, 60]);

  useEffect(() => {
    if (reduced) {
      setReady(true);
      return;
    }
    const intro = document.getElementById("ceh-intro");
    if (!intro || intro.getAttribute("data-state") === "open") {
      setReady(true);
      return;
    }
    const onOpen = () => setReady(true);
    window.addEventListener("ceh:intro-open", onOpen);
    const fallback = window.setTimeout(onOpen, 8000);
    return () => {
      window.removeEventListener("ceh:intro-open", onOpen);
      window.clearTimeout(fallback);
    };
  }, [reduced]);

  const enter = (delay, y = 18, scale = 1) => {
    const to = { opacity: 1, y: 0, ...(scale !== 1 ? { scale: 1 } : null) };
    if (reduced) return { initial: false, animate: to, transition: { duration: 0 } };
    const from = { opacity: 0, y, ...(scale !== 1 ? { scale } : null) };
    return {
      initial: from,
      animate: ready ? to : from,
      transition: { duration: 0.85, delay, ease: EASE },
    };
  };

  const onMove = (event) => {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    mx.set((event.clientX - rect.left) / rect.width - 0.5);
    my.set((event.clientY - rect.top) / rect.height - 0.5);
    glowX.set((event.clientX - rect.left - rect.width / 2) * 0.32);
    glowY.set((event.clientY - rect.top - rect.height / 2) * 0.32);
  };

  return (
    <section ref={ref} onMouseMove={onMove} className="hero-shell relative overflow-hidden bg-ivory">
      <div aria-hidden="true" className="pointer-events-none absolute inset-0">
        <motion.div
          style={reduced ? undefined : { y: blobUp }}
          className="absolute -left-24 top-6 h-80 w-80 rounded-full bg-[#ddd6fe]/70 blur-[110px]"
        />
        <motion.div
          style={reduced ? undefined : { y: blobDown }}
          className="absolute right-0 top-24 h-72 w-72 rounded-full bg-[#bfdbfe]/70 blur-[110px]"
        />
        <div className="hero-veil" />
        <div className="bg-dots absolute inset-0 opacity-70 [mask-image:radial-gradient(ellipse_70%_60%_at_50%_40%,black,transparent)]" />
        {reduced ? null : <motion.div className="hero-glow" style={{ x: glowX, y: glowY }} />}
      </div>

      <div className="container-x relative z-10 grid items-center gap-14 py-16 lg:grid-cols-[1.02fr_0.98fr] lg:py-24">
        <div>
          {reduced ? null : (
            <motion.span
              aria-hidden="true"
              className="hero-rule"
              initial={{ opacity: 0, scaleX: 0 }}
              animate={ready ? { opacity: 1, scaleX: 1 } : { opacity: 0, scaleX: 0 }}
              transition={{ duration: 1.1, delay: 0.04, ease: EASE }}
            />
          )}

          <motion.span {...enter(0.06, 14)} className="chip hero-chip">
            <Sparkles size={13} className="text-amber" />
            KIPS College · Campus Event Hub
          </motion.span>

          <h1
            aria-label="Your campus life, beautifully connected."
            className="mt-5 text-balance font-display text-[2.6rem] font-bold leading-[1.06] tracking-tight text-ink sm:text-[3.4rem]"
          >
            {reduced ? (
              <span className="block">Your campus life,</span>
            ) : (
              <SplitHeading text="Your campus life," ready={ready} delay={0.14} />
            )}
            {reduced ? (
              <span aria-hidden="true" className="heading-gradient hero-accent block">
                beautifully connected.
              </span>
            ) : (
              <motion.span
                aria-hidden="true"
                className="heading-gradient hero-accent block"
                initial={{ opacity: 0, y: 22, clipPath: "inset(0 100% 0 0)" }}
                animate={ready ? { opacity: 1, y: 0, clipPath: "inset(0 0% 0 0)" } : {}}
                transition={{ duration: 0.95, delay: 0.5, ease: EASE }}
              >
                beautifully connected.
              </motion.span>
            )}
          </h1>

          <motion.p {...enter(0.34, 20)} className="mt-5 max-w-xl text-[0.95rem] leading-relaxed text-mist">
            Discover events, join societies, enter competitions and collect verified certificates — one elegant
            home for everything happening at KIPS College.
          </motion.p>

          <motion.div {...enter(0.44, 20)} className="mt-8 flex flex-wrap items-center gap-3">
            <Magnetic>
              <Link href="/events" className="btn btn-primary btn-lg hero-cta">
                Explore events <ArrowRight size={16} />
              </Link>
            </Magnetic>
            <Magnetic>
              <Link href="/societies" className="btn btn-secondary btn-lg">
                Join a society
              </Link>
            </Magnetic>
          </motion.div>

          <motion.div {...enter(0.56, 14)} className="mt-10 flex flex-wrap gap-x-8 gap-y-4">
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

        <motion.div {...enter(0.3, 24, 0.96)} className="relative mx-auto w-full max-w-[540px]">
          <motion.div style={reduced ? undefined : { y: scrollY, scale: scrollScale }}>
            <motion.div style={reduced ? undefined : { x: imageX, y: imageY }} className="relative">
              <div className="absolute -inset-3 rounded-[2.2rem] bg-gradient-to-br from-[#c4b5fd]/55 via-[#f2e3bd]/45 to-[#93c5fd]/55 blur-2xl" />
              <div className="hero-frame relative overflow-hidden rounded-[1.9rem] border border-white/80 bg-white">
                <LazyImage
                  priority
                  src="/2campus.jfif"
                  alt="KIPS College campus"
                  className="h-[330px] w-full object-cover sm:h-[380px]"
                  sizes="(min-width: 1024px) 540px, 92vw"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#171332]/55 via-transparent to-transparent" />
                <span className="hero-photo-sheen" aria-hidden="true" />
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
          </motion.div>

          {nextEvent ? (
            <motion.div
              style={reduced ? undefined : { x: cardX, y: cardY }}
              className="hero-card absolute -left-3 top-8 hidden w-[230px] rounded-2xl border border-line bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgba(23,19,50,0.5)] backdrop-blur sm:block"
            >
              <span className="hero-card-rule" aria-hidden="true" />
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
            className="hero-card absolute -bottom-5 right-0 w-[210px] rounded-2xl border border-line bg-white/95 p-4 shadow-[0_30px_60px_-30px_rgba(23,19,50,0.5)] backdrop-blur"
          >
            <span className="hero-card-rule" aria-hidden="true" />
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
