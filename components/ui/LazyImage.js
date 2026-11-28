"use client";

import { useEffect, useRef, useState } from "react";

// Widths must be a subset of Next's default imageSizes + deviceSizes.
const WIDTHS = [256, 384, 640, 750, 828, 1080, 1200, 1920];
const DEFAULT_SIZES = "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 92vw";

function optimizedSrcSet(src) {
  if (typeof src !== "string" || !src.startsWith("/") || /\.svg($|\?)/i.test(src)) return undefined;
  const url = encodeURI(src.replace(/%20/gi, " "));
  return WIDTHS.map((width) => `/_next/image?url=${url}&w=${width}&q=75 ${width}w`).join(", ");
}

export default function LazyImage({
  src,
  alt = "",
  className = "",
  priority = false,
  sizes = DEFAULT_SIZES,
  ...rest
}) {
  const ref = useRef(null);
  const [phase, setPhase] = useState("idle");
  const srcSet = optimizedSrcSet(src);

  useEffect(() => {
    const img = ref.current;
    if (!img) return;
    if (img.complete && img.naturalWidth > 0) {
      setPhase("done");
    } else {
      setPhase("pending");
    }
  }, [src]);

  return (
    <img
      ref={ref}
      src={src}
      srcSet={srcSet}
      sizes={srcSet ? sizes : undefined}
      alt={alt}
      loading={priority ? "eager" : "lazy"}
      decoding="async"
      fetchPriority={priority ? "high" : "auto"}
      data-fade={phase === "pending" ? "pending" : undefined}
      onLoad={() => setPhase("done")}
      onError={() => setPhase("done")}
      className={`lazy-img ${className}`}
      {...rest}
    />
  );
}
