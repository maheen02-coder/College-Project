"use client";

import { useEffect, useRef } from "react";

export default function Spotlight() {
  const ref = useRef(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!window.matchMedia("(pointer: fine)").matches) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const el = ref.current;
    if (!el) return;

    const pos = { x: window.innerWidth / 2, y: window.innerHeight * 0.3 };
    const target = { ...pos };
    let frame = null;

    const render = () => {
      frame = null;
      pos.x += (target.x - pos.x) * 0.08;
      pos.y += (target.y - pos.y) * 0.08;
      el.style.transform = `translate3d(${pos.x - 320}px, ${pos.y - 320}px, 0)`;
      // Stop the loop once the glow reaches the pointer to save idle GPU work.
      if (Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) > 0.1) {
        frame = requestAnimationFrame(render);
      }
    };

    const start = () => {
      if (frame === null) frame = requestAnimationFrame(render);
    };

    const onMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      el.style.opacity = "1";
      start();
    };
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
    };
  }, []);

  return (
    <div
      ref={ref}
      aria-hidden="true"
      className="pointer-events-none fixed left-0 top-0 z-0 h-[640px] w-[640px] rounded-full opacity-0 transition-opacity duration-700"
      style={{
        background:
          "radial-gradient(circle, rgba(124,58,237,0.07) 0%, rgba(37,99,235,0.045) 38%, transparent 64%)",
      }}
    />
  );
}
