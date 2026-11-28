"use client";

import { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import usePrefersReducedMotion from "@/components/ui/usePrefersReducedMotion";

export default function TiltCard({
  children,
  className = "",
  intensity = 7,
  glare = true,
  radius = "1.25rem",
}) {
  const ref = useRef(null);
  const reduced = usePrefersReducedMotion();
  const x = useMotionValue(0.5);
  const y = useMotionValue(0.5);

  const springX = useSpring(x, { stiffness: 170, damping: 22 });
  const springY = useSpring(y, { stiffness: 170, damping: 22 });

  const rotateX = useTransform(springY, [0, 1], [intensity, -intensity]);
  const rotateY = useTransform(springX, [0, 1], [-intensity, intensity]);

  const onMouseMove = (event) => {
    if (reduced) return;
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (event.clientX - rect.left) / rect.width;
    const py = (event.clientY - rect.top) / rect.height;
    x.set(px);
    y.set(py);
    ref.current.style.setProperty("--mx", `${px * 100}%`);
    ref.current.style.setProperty("--my", `${py * 100}%`);
  };

  const onMouseLeave = () => {
    x.set(0.5);
    y.set(0.5);
  };

  return (
    <div className="[perspective:1100px]" style={{ borderRadius: radius }}>
      <motion.div
        ref={ref}
        onMouseMove={onMouseMove}
        onMouseLeave={onMouseLeave}
        style={reduced ? undefined : { rotateX, rotateY, transformStyle: "preserve-3d", borderRadius: radius }}
        className={`relative h-full ${className}`}
      >
        {children}
        {glare ? (
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 z-[2] opacity-0 transition-opacity duration-300 hover:opacity-100"
            style={{
              borderRadius: radius,
              background:
                "radial-gradient(420px circle at var(--mx, 50%) var(--my, 50%), rgba(255,255,255,0.09), transparent 58%)",
            }}
          />
        ) : null}
      </motion.div>
    </div>
  );
}
