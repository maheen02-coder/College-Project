"use client";

import { useRef, useState } from "react";
import { ImagePlus, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function PosterField({ value, onChange }) {
  const { toast } = useToast();
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const upload = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Upload failed.", "error");
        return;
      }
      onChange(data.url);
      toast("Poster uploaded.", "success");
    } catch {
      toast("Upload failed. Please try again.", "error");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  return (
    <div>
      <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
        Poster
      </label>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="relative h-28 w-44 shrink-0 overflow-hidden rounded-xl border border-white/[0.08] bg-white/[0.02]">
          {value ? (
            <img src={value} alt="Poster preview" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full flex-col items-center justify-center gap-1 text-mist">
              <ImagePlus size={18} />
              <span className="text-[0.62rem]">No poster</span>
            </div>
          )}
        </div>
        <div className="flex-1 space-y-2">
          <input
            value={value}
            onChange={(event) => onChange(event.target.value)}
            placeholder="/uploads/posters/… or https://…"
            className="field text-[0.76rem]"
          />
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              disabled={uploading}
              className="btn btn-secondary btn-sm"
            >
              {uploading ? <Loader2 size={13} className="animate-spin" /> : <ImagePlus size={13} />}
              {uploading ? "Uploading…" : "Upload image"}
            </button>
            {value ? (
              <button
                type="button"
                onClick={() => onChange("")}
                className="text-[0.7rem] text-mist underline-offset-4 hover:text-rose-300 hover:underline"
              >
                Remove
              </button>
            ) : null}
          </div>
          <p className="text-[0.64rem] text-mist">JPG, PNG, WebP or AVIF · up to 5 MB · 16:9 recommended.</p>
          <input ref={inputRef} type="file" accept="image/*" onChange={upload} className="hidden" />
        </div>
      </div>
    </div>
  );
}
