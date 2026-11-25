"use client";

import { useState } from "react";
import { Check, Copy, Link2 } from "lucide-react";

export default function CopyButton({ value, label = "Copy link", copiedLabel = "Copied" }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button type="button" onClick={copy} className="btn btn-ghost btn-sm w-full">
      {copied ? <Check size={13} className="text-emerald-600" /> : <Copy size={13} />}
      {copied ? copiedLabel : label}
    </button>
  );
}

export function CopyInline({ value, children }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          setTimeout(() => setCopied(false), 1600);
        } catch {
          /* clipboard unavailable */
        }
      }}
      className="inline-flex items-center gap-1.5 text-[0.72rem] text-violet-600 transition hover:text-ink"
    >
      {copied ? <Check size={12} /> : <Link2 size={12} />}
      {children || (copied ? "Copied" : "Copy")}
    </button>
  );
}
