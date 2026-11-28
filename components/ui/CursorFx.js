"use client";

import { useEffect, useRef } from "react";

const TRAIL_COUNT = 6;

export default function CursorFx() {
  const ringRef = useRef(null);
  const dotRef = useRef(null);
  const trailRefs = useRef([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const finePointer = window.matchMedia("(pointer: fine)").matches;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (!finePointer || reduced) return;

    const ring = ringRef.current;
    const dot = dotRef.current;
    const trails = trailRefs.current.filter(Boolean);
    if (!ring || !dot) return;

    document.documentElement.classList.add("ceh-cursor-hide");

    const target = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const ringPos = { ...target };
    const trailPos = trails.map(() => ({ ...target }));
    let visible = false;
    let frame = null;

    const settled = () => {
      if (Math.abs(target.x - ringPos.x) + Math.abs(target.y - ringPos.y) > 0.1) return false;
      return trailPos.every((pos) => Math.abs(target.x - pos.x) + Math.abs(target.y - pos.y) <= 0.1);
    };

    const render = () => {
      frame = null;
      ringPos.x += (target.x - ringPos.x) * 0.16;
      ringPos.y += (target.y - ringPos.y) * 0.16;
      ring.style.transform = `translate3d(${ringPos.x}px, ${ringPos.y}px, 0)`;
      dot.style.transform = `translate3d(${target.x}px, ${target.y}px, 0)`;

      let prevX = target.x;
      let prevY = target.y;
      trails.forEach((el, index) => {
        const pos = trailPos[index];
        pos.x += (prevX - pos.x) * (0.32 - index * 0.035);
        pos.y += (prevY - pos.y) * (0.32 - index * 0.035);
        prevX = pos.x;
        prevY = pos.y;
        el.style.transform = `translate3d(${pos.x}px, ${pos.y}px, 0)`;
      });

      // Idle frames cost GPU time on every page; stop once the ring has settled.
      if (!settled()) frame = requestAnimationFrame(render);
    };

    const start = () => {
      if (frame === null) frame = requestAnimationFrame(render);
    };

    const onMove = (event) => {
      target.x = event.clientX;
      target.y = event.clientY;
      start();
      if (!visible) {
        visible = true;
        ring.style.opacity = "1";
        dot.style.opacity = "1";
        trails.forEach((el) => {
          el.style.opacity = "";
        });
      }
    };

    const interactiveSelector =
      "a, button, [role='button'], input, select, textarea, [data-cursor='hover'], label";

    const onOver = (event) => {
      if (event.target.closest?.(interactiveSelector)) ring.classList.add("is-active");
    };
    const onOut = (event) => {
      if (event.target.closest?.(interactiveSelector)) ring.classList.remove("is-active");
    };
    const onDown = () => ring.classList.add("is-press");
    const onUp = () => ring.classList.remove("is-press");
    const onLeave = () => {
      visible = false;
      ring.style.opacity = "0";
      dot.style.opacity = "0";
      trails.forEach((el) => {
        el.style.opacity = "0";
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    window.addEventListener("mouseover", onOver, { passive: true });
    window.addEventListener("mouseout", onOut, { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    document.addEventListener("mouseleave", onLeave);

    return () => {
      if (frame) cancelAnimationFrame(frame);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      document.removeEventListener("mouseleave", onLeave);
      document.documentElement.classList.remove("ceh-cursor-hide");
    };
  }, []);

  return (
    <div aria-hidden="true" className="hidden md:block">
      <div ref={ringRef} className="ceh-cursor-ring" style={{ opacity: 0 }} />
      <div ref={dotRef} className="ceh-cursor-dot" style={{ opacity: 0 }} />
      {Array.from({ length: TRAIL_COUNT }).map((_, index) => (
        <div
          key={index}
          ref={(el) => {
            trailRefs.current[index] = el;
          }}
          className="ceh-cursor-trail"
          style={{
            opacity: 0,
            transform: "translate3d(-100px, -100px, 0)",
            width: `${6 - index * 0.6}px`,
            height: `${6 - index * 0.6}px`,
          }}
        />
      ))}
    </div>
  );
}
