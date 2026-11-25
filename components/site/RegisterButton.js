"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, CheckCircle2, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";

export default function RegisterButton({
  eventId,
  eventSlug,
  phase,
  isAuthed,
  size = "sm",
  variant = "primary",
  label = "Register Now",
  className = "",
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [registered, setRegistered] = useState(false);

  const disabled = phase !== "registration_open" || registered;
  const text = registered
    ? "Registered"
    : phase === "upcoming"
      ? "Opening Soon"
      : phase === "registration_closed"
        ? "Registration Closed"
        : phase === "cancelled"
          ? "Cancelled"
          : phase === "completed"
            ? "Completed"
            : phase === "ongoing"
              ? "In Progress"
              : label;

  const onClick = async () => {
    if (disabled) return;
    if (!isAuthed) {
      router.push(`/login?next=/events/${eventSlug}`);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventId }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 401) {
          router.push(`/login?next=/events/${eventSlug}`);
          return;
        }
        toast(data.error || "Registration failed.", "error");
        return;
      }
      setRegistered(true);
      toast(`Registration confirmed · ${data.registration.registrationId}`, "success", "You are in!");
      router.refresh();
    } catch {
      toast("Something went wrong. Please try again.", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled || loading}
      className={cn(
        "btn btn-sm",
        variant === "primary" ? "btn-primary" : "btn-secondary",
        disabled && "pointer-events-none opacity-60",
        className
      )}
    >
      {loading ? (
        <Loader2 size={14} className="animate-spin" />
      ) : registered ? (
        <CheckCircle2 size={14} />
      ) : null}
      {text}
      {!disabled && !loading && !registered ? <ArrowRight size={14} /> : null}
    </button>
  );
}
