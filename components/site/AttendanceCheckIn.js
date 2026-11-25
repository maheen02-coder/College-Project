"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { CalendarDays, CheckCircle2, Loader2, MapPin, RotateCcw, Sparkles, TriangleAlert } from "lucide-react";

function formatDate(value) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-GB", {
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

export default function AttendanceCheckIn({ token, event }) {
  const [state, setState] = useState("loading");
  const [message, setMessage] = useState("");
  const [points, setPoints] = useState(0);
  const [registrationId, setRegistrationId] = useState("");
  const [already, setAlready] = useState(false);
  const started = useRef(false);

  const submit = useCallback(async () => {
    setState("loading");
    try {
      const res = await fetch("/api/attend", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setState("error");
        setMessage(data?.error || "We could not check you in. Please try again.");
        return;
      }
      const item = data?.item || {};
      setPoints(Number(item.points) || 0);
      setAlready(Boolean(item.already));
      setRegistrationId(item.registration?.registrationId || "");
      setState("success");
    } catch {
      setState("error");
      setMessage("Network error. Check your connection and try again.");
    }
  }, [token]);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    submit();
  }, [submit]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      className="card mx-auto w-full max-w-xl overflow-hidden"
    >
      <div className="border-b border-line bg-gradient-to-r from-lavender via-white to-white px-6 py-5 sm:px-8">
        <p className="eyebrow">QR attendance</p>
        <h1 className="mt-2 text-xl font-semibold text-ink sm:text-2xl">{event.title}</h1>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-[0.8rem] text-mist">
          <span className="inline-flex items-center gap-1.5">
            <CalendarDays size={14} className="text-violet" />
            {formatDate(event.startAt)}
          </span>
          <span className="inline-flex items-center gap-1.5">
            <MapPin size={14} className="text-blue" />
            {event.venue}
          </span>
        </div>
      </div>

      <div className="px-6 py-10 text-center sm:px-8">
        {state === "loading" ? (
          <div className="flex flex-col items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-lavender text-purple">
              <Loader2 size={28} className="animate-spin" />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">Checking you in…</p>
              <p className="mt-1 text-sm text-mist">Confirming your registration for this event.</p>
            </div>
          </div>
        ) : null}

        {state === "success" ? (
          <div className="flex flex-col items-center gap-4">
            <motion.span
              initial={{ scale: 0.7, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring", stiffness: 320, damping: 18 }}
              className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600 ring-1 ring-emerald-200"
            >
              <CheckCircle2 size={30} />
            </motion.span>
            <div>
              <p className="text-lg font-semibold text-ink">
                {already ? "You're already checked in" : "Attendance confirmed"}
              </p>
              <p className="mt-1 text-sm text-mist">
                {already
                  ? "This event is already marked present on your record."
                  : "Your presence has been recorded. Enjoy the event!"}
              </p>
            </div>

            <div className="flex flex-wrap items-center justify-center gap-2">
              {registrationId ? (
                <span className="badge badge-violet">ID · {registrationId}</span>
              ) : null}
              {points > 0 ? (
                <span className="badge badge-emerald">
                  <Sparkles size={12} /> +{points} points
                </span>
              ) : null}
            </div>

            <div className="mt-2 flex flex-wrap justify-center gap-2.5">
              <Link href={`/events/${event.slug}`} className="btn btn-secondary btn-sm">
                View event
              </Link>
              <Link href="/dashboard" className="btn btn-primary btn-sm">
                Go to dashboard
              </Link>
            </div>
          </div>
        ) : null}

        {state === "error" ? (
          <div className="flex flex-col items-center gap-4">
            <span className="grid h-16 w-16 place-items-center rounded-2xl bg-rose-50 text-rose-600 ring-1 ring-rose-200">
              <TriangleAlert size={28} />
            </span>
            <div>
              <p className="text-base font-semibold text-ink">Check-in unavailable</p>
              <p className="mx-auto mt-1 max-w-sm text-sm text-mist">{message}</p>
            </div>
            <div className="flex flex-wrap justify-center gap-2.5">
              <button type="button" onClick={submit} className="btn btn-primary btn-sm">
                <RotateCcw size={14} /> Try again
              </button>
              <Link href={`/events/${event.slug}`} className="btn btn-ghost btn-sm">
                View event
              </Link>
            </div>
          </div>
        ) : null}
      </div>
    </motion.div>
  );
}
