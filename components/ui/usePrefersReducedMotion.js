"use client";

import { useEffect, useState } from "react";

// Resolves after mount so server HTML and the first client render match;
// framer-motion's useReducedMotion() reads the media query during hydration.
export default function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReduced(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  return reduced;
}
