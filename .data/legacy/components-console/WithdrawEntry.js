"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function WithdrawEntry({ entryId, label = "Withdraw entry" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [confirm, setConfirm] = useState(false);

  const withdraw = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/entries/${entryId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not withdraw entry.", "error");
        return;
      }
      toast("Entry withdrawn.", "info");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setLoading(false);
      setConfirm(false);
    }
  };

  if (!confirm) {
    return (
      <button type="button" onClick={() => setConfirm(true)} className="btn btn-ghost btn-sm">
        <XCircle size={13} /> {label}
      </button>
    );
  }

  return (
    <span className="inline-flex items-center gap-2">
      <button type="button" onClick={withdraw} disabled={loading} className="btn btn-danger btn-sm">
        {loading ? <Loader2 size={13} className="animate-spin" /> : null} Confirm withdraw
      </button>
      <button type="button" onClick={() => setConfirm(false)} className="btn btn-ghost btn-sm">
        Keep
      </button>
    </span>
  );
}
