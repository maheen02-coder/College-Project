"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2, QrCode } from "lucide-react";

export default function VerifyForm({ sampleId = "" }) {
  const router = useRouter();
  const [value, setValue] = useState("");
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState("");

  const submit = (event) => {
    event.preventDefault();
    const id = value.trim().toUpperCase();
    if (!id) {
      setError("Enter a certificate ID to verify.");
      return;
    }
    setError("");
    startTransition(() => router.push(`/verify/${encodeURIComponent(id)}`));
  };

  return (
    <div className="card p-6 sm:p-8">
      <form onSubmit={submit} className="flex flex-col gap-3 sm:flex-row">
        <div className="relative flex-1">
          <QrCode size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
          <input
            value={value}
            onChange={(event) => {
              setValue(event.target.value.toUpperCase());
              setError("");
            }}
            placeholder="e.g. KIPS-CERT-4F7K2A"
            className="field pl-10 font-mono tracking-wide"
            aria-label="Certificate ID"
          />
        </div>
        <button type="submit" disabled={pending} className="btn btn-primary sm:w-auto">
          {pending ? <Loader2 size={15} className="animate-spin" /> : null}
          Verify certificate <ArrowRight size={15} />
        </button>
      </form>
      {error ? <p className="mt-2 text-[0.76rem] text-rose">{error}</p> : null}
      {sampleId ? (
        <button
          type="button"
          onClick={() => setValue(sampleId)}
          className="mt-3 text-[0.72rem] font-medium text-mist transition hover:text-purple"
        >
          Try a sample on file: <span className="font-mono text-purple">{sampleId}</span>
        </button>
      ) : null}
    </div>
  );
}
