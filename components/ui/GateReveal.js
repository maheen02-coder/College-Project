"use client";

import { useRef } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import usePrefersReducedMotion from "@/components/ui/usePrefersReducedMotion";

export default function GateReveal({ children, className = "" }) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 88%", "center 55%"] });
  const progress = useSpring(scrollYProgress, { stiffness: 90, damping: 26, mass: 0.35 });

  const leftX = useTransform(progress, [0, 1], ["0%", "-104%"]);
  const rightX = useTransform(progress, [0, 1], ["0%", "104%"]);
  const panelOpacity = useTransform(progress, [0.85, 1], [1, 0]);
  const contentOpacity = useTransform(progress, [0, 0.7], [0.45, 1]);
  const contentScale = useTransform(progress, [0, 1], [0.955, 1]);

  return (
    <div ref={ref} className={`relative overflow-hidden rounded-[1.5rem] ${className}`}>
      <motion.div style={reduced ? undefined : { opacity: contentOpacity, scale: contentScale }}>
        {children}
      </motion.div>
      {reduced ? null : (
        <div aria-hidden="true" className="pointer-events-none absolute inset-0 z-10">
          <motion.div style={{ x: leftX, opacity: panelOpacity }} className="gate-panel gate-panel-left" />
          <motion.div style={{ x: rightX, opacity: panelOpacity }} className="gate-panel gate-panel-right" />
        </div>
      )}
    </div>
  );
}
