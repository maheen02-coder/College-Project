"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, XCircle } from "lucide-react";
import { useToast } from "@/components/ui/Toast";

export default function CancelRegistration({ registrationId, size = "sm" }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const onCancel = async () => {
    if (!window.confirm("Cancel your registration for this event?")) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/registrations/${registrationId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not cancel registration.", "error");
        return;
      }
      toast("Registration cancelled.", "info");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onCancel}
      disabled={loading}
      className={`btn btn-danger ${size === "sm" ? "btn-sm" : ""} w-full`}
    >
      {loading ? <Loader2 size={13} className="animate-spin" /> : <XCircle size={13} />}
      Cancel registration
    </button>
  );
}
