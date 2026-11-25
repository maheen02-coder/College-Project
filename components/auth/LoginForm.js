"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";

const DEMOS = [
  { role: "Student", email: "demo@kips.edu.pk", password: "Student@123" },
  { role: "Super admin", email: "admin@kips.edu.pk", password: "Admin@123" },
  { role: "Recruitment", email: "recruitment@kips.edu.pk", password: "Admin@123" },
  { role: "Events", email: "events@kips.edu.pk", password: "Admin@123" },
  { role: "Societies", email: "societies@kips.edu.pk", password: "Admin@123" },
];

function dashboardFor(role) {
  if (role === "admin" || role === "superadmin") return "/admin";
  return "/dashboard";
}

export default function LoginForm({ next = "" }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not sign you in.");
        return;
      }
      const target = next && next.startsWith("/") ? next : dashboardFor(data.user.role);
      router.replace(target);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-7 sm:p-8">
      <p className="eyebrow">Student & staff access</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Welcome back</h2>
      <p className="mt-1.5 text-[0.84rem] text-mist">Sign in to manage your events, entries and certificates.</p>

      <form onSubmit={submit} className="mt-7 space-y-4">
        <div>
          <label htmlFor="email" className="label">College email</label>
          <div className="relative">
            <Mail size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              autoComplete="email"
              placeholder="you@kips.edu.pk"
              className="field pl-10"
            />
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between">
            <label htmlFor="password" className="label mb-0">Password</label>
            <span className="text-[0.68rem] text-mist">Contact the activities office to reset</span>
          </div>
          <div className="relative">
            <Lock size={15} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-mist" />
            <input
              id="password"
              type={show ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              autoComplete="current-password"
              placeholder="Your password"
              className="field px-10"
            />
            <button
              type="button"
              onClick={() => setShow((value) => !value)}
              aria-label={show ? "Hide password" : "Show password"}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-mist transition hover:text-purple"
            >
              {show ? <EyeOff size={15} /> : <Eye size={15} />}
            </button>
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose/30 bg-rose/5 px-3.5 py-2.5 text-[0.78rem] text-rose">{error}</p>
        ) : null}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={15} className="animate-spin" /> : null}
          {loading ? "Signing in…" : "Sign in"}
          {!loading ? <ArrowRight size={15} /> : null}
        </button>
      </form>

      <div className="mt-6 rounded-2xl border border-line bg-lavender/60 p-3.5">
        <p className="text-[0.62rem] font-bold uppercase tracking-[0.16em] text-mist">Demo accounts</p>
        <div className="mt-2 flex flex-wrap gap-1.5">
          {DEMOS.map((demo) => (
            <button
              key={demo.role}
              type="button"
              onClick={() => {
                setEmail(demo.email);
                setPassword(demo.password);
                setError("");
              }}
              className="chip transition hover:border-purple/50 hover:text-purple"
            >
              {demo.role}
            </button>
          ))}
        </div>
      </div>

      <p className="mt-5 text-center text-[0.78rem] text-mist">
        New to campus?{" "}
        <Link href="/signup" className="font-semibold text-purple">
          Create your student account
        </Link>
      </p>
    </div>
  );
}
