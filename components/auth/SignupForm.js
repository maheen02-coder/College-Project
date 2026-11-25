"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldCheck } from "lucide-react";
import { CLASS_YEARS, DEPARTMENTS } from "@/lib/constants";

const INITIAL = {
  fullName: "",
  matricRollNumber: "",
  marksObtained: "",
  totalMarks: "",
  classYear: CLASS_YEARS[0],
  section: "",
  department: DEPARTMENTS[0],
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
};

function strength(password) {
  let score = 0;
  if (password.length >= 8) score += 1;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[^A-Za-z0-9]/.test(password) || password.length >= 12) score += 1;
  return score;
}

export default function SignupForm() {
  const router = useRouter();
  const [form, setForm] = useState(INITIAL);
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));
  const percentage = useMemo(() => {
    const obtained = Number(form.marksObtained);
    const total = Number(form.totalMarks);
    if (!total || Number.isNaN(obtained) || Number.isNaN(total) || total <= 0) return null;
    return Math.round((obtained / total) * 1000) / 10;
  }, [form.marksObtained, form.totalMarks]);
  const score = strength(form.password);

  const submit = async (event) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (percentage !== null && (percentage < 0 || percentage > 100)) {
      setError("Marks obtained cannot exceed total marks.");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Could not create your account.");
        return;
      }
      router.replace("/dashboard");
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card p-7 sm:p-8">
      <p className="eyebrow">Student registration</p>
      <h2 className="mt-2 font-display text-2xl font-bold tracking-tight text-ink">Create your account</h2>
      <p className="mt-1.5 text-[0.84rem] text-mist">
        Your academic details are verified once by the campus office, then locked.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <div>
          <label className="label" htmlFor="fullName">Full name</label>
          <input id="fullName" value={form.fullName} onChange={(event) => update("fullName", event.target.value)} required className="field" placeholder="As printed on your college record" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="matricRollNumber">Matric roll number</label>
            <input id="matricRollNumber" value={form.matricRollNumber} onChange={(event) => update("matricRollNumber", event.target.value.toUpperCase())} required className="field font-mono" placeholder="e.g. 123456" />
          </div>
          <div>
            <label className="label" htmlFor="phone">Phone</label>
            <input id="phone" value={form.phone} onChange={(event) => update("phone", event.target.value)} required className="field" placeholder="03xx-xxxxxxx" />
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-3">
          <div>
            <label className="label" htmlFor="marksObtained">Marks obtained</label>
            <input id="marksObtained" type="number" min="0" value={form.marksObtained} onChange={(event) => update("marksObtained", event.target.value)} required className="field" placeholder="e.g. 1020" />
          </div>
          <div>
            <label className="label" htmlFor="totalMarks">Total marks</label>
            <input id="totalMarks" type="number" min="1" value={form.totalMarks} onChange={(event) => update("totalMarks", event.target.value)} required className="field" placeholder="e.g. 1100" />
          </div>
          <div>
            <label className="label">Percentage</label>
            <div className="field flex items-center justify-between bg-lavender/60">
              <span className="font-semibold text-ink">{percentage !== null ? `${percentage}%` : "—"}</span>
              <span className="text-[0.68rem] text-mist">auto</span>
            </div>
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="classYear">Class / year</label>
            <select id="classYear" value={form.classYear} onChange={(event) => update("classYear", event.target.value)} className="field">
              {CLASS_YEARS.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="section">Section</label>
            <input id="section" value={form.section} onChange={(event) => update("section", event.target.value.toUpperCase())} required maxLength={3} className="field" placeholder="e.g. A" />
          </div>
        </div>

        <div>
          <label className="label" htmlFor="department">Department / group</label>
          <select id="department" value={form.department} onChange={(event) => update("department", event.target.value)} className="field">
            {DEPARTMENTS.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="email">College email</label>
          <input id="email" type="email" value={form.email} onChange={(event) => update("email", event.target.value)} required className="field" placeholder="you@kips.edu.pk" />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <label className="label" htmlFor="password">Password</label>
            <div className="relative">
              <input
                id="password"
                type={show ? "text" : "password"}
                value={form.password}
                onChange={(event) => update("password", event.target.value)}
                required
                className="field pr-10"
                placeholder="Min. 8 characters"
              />
              <button type="button" onClick={() => setShow((value) => !value)} aria-label="Toggle password" className="absolute right-3 top-1/2 -translate-y-1/2 text-mist">
                {show ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
            <div className="mt-1.5 flex gap-1">
              {[1, 2, 3, 4].map((level) => (
                <span key={level} className={`h-1 flex-1 rounded-full ${score >= level ? (score >= 3 ? "bg-emerald" : "bg-amber") : "bg-line"}`} />
              ))}
            </div>
          </div>
          <div>
            <label className="label" htmlFor="confirmPassword">Confirm password</label>
            <input id="confirmPassword" type={show ? "text" : "password"} value={form.confirmPassword} onChange={(event) => update("confirmPassword", event.target.value)} required className="field" placeholder="Repeat password" />
          </div>
        </div>

        {error ? (
          <p className="rounded-xl border border-rose/30 bg-rose/5 px-3.5 py-2.5 text-[0.78rem] text-rose">{error}</p>
        ) : null}

        <button type="submit" disabled={loading} className="btn btn-primary w-full">
          {loading ? <Loader2 size={15} className="animate-spin" /> : <ShieldCheck size={15} />}
          {loading ? "Creating your account…" : "Create account"}
        </button>
        <p className="flex items-start gap-1.5 text-[0.7rem] leading-relaxed text-mist">
          <ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald" />
          Your matric details are used only for verification and never shown publicly. The campus office reviews
          new accounts before event registration unlocks.
        </p>
      </form>

      <p className="mt-5 text-center text-[0.78rem] text-mist">
        Already registered?{" "}
        <Link href="/login" className="font-semibold text-purple">Sign in</Link>
      </p>
    </div>
  );
}
