"use client";

import { motion } from "framer-motion";
import usePrefersReducedMotion from "@/components/ui/usePrefersReducedMotion";

export default function Reveal({
  children,
  delay = 0,
  y = 26,
  once = true,
  className = "",
  as = "div",
  blur = false,
  scale = 1,
}) {
  const reduced = usePrefersReducedMotion();
  const MotionTag = motion[as] || motion.div;
  if (reduced) return <div className={className}>{children}</div>;

  return (
    <MotionTag
      className={className}
      initial={{
        opacity: 0,
        y,
        ...(blur ? { filter: "blur(10px)" } : null),
        ...(scale !== 1 ? { scale } : null),
      }}
      whileInView={{
        opacity: 1,
        y: 0,
        ...(blur ? { filter: "blur(0px)" } : null),
        ...(scale !== 1 ? { scale: 1 } : null),
      }}
      viewport={{ once, margin: "-60px" }}
      transition={{ duration: blur ? 0.85 : 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </MotionTag>
  );
}
