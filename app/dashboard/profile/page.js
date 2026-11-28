"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  BadgeCheck,
  CalendarDays,
  GraduationCap,
  Lock,
  Mail,
  Percent,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UserRound,
} from "lucide-react";
import { Alert, ConsoleHeading, FormField, Panel, Skeleton, fetchJson, useApi } from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import { ErrorState } from "@/components/dashboard/common";
import { CLASS_YEARS, DEPARTMENTS, INTEREST_OPTIONS, SKILL_OPTIONS } from "@/lib/constants";
import { formatDate, initials } from "@/lib/utils";

function buildForm(user) {
  return {
    name: user?.name || "",
    phone: user?.phone || "",
    bio: user?.bio || "",
    avatar: user?.avatar || "",
    skills: user?.skills || [],
    interests: user?.interests || [],
    matricRollNumber: user?.matricRollNumber || "",
    marksObtained: user?.matricMarks ?? "",
    totalMarks: user?.matricTotalMarks ?? "",
    classYear: user?.classYear || "",
    section: user?.section || "",
    department: user?.department || "",
  };
}

function ChipPicker({ options, selected, onToggle, disabled = false }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const active = selected.includes(option);
        return (
          <button
            key={option}
            type="button"
            disabled={disabled}
            onClick={() => onToggle(option)}
            className={`rounded-full border px-3 py-1.5 text-[0.72rem] font-medium transition disabled:cursor-not-allowed disabled:opacity-60 ${
              active
                ? "border-violet-300 bg-lilac text-purple"
                : "border-line bg-white text-mist hover:border-violet-200 hover:text-ink"
            }`}
          >
            {option}
          </button>
        );
      })}
    </div>
  );
}

export default function ProfilePage() {
  const { toast } = useToast();
  const { data, loading, error, reload, setData } = useApi("/api/users/me");
  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);

  const user = data?.user;

  useEffect(() => {
    if (user && !form) setForm(buildForm(user));
  }, [user, form]);

  const verified = user?.verificationStatus === "verified";

  const percentage = useMemo(() => {
    const marks = Number(form?.marksObtained);
    const total = Number(form?.totalMarks);
    if (!form || form.marksObtained === "" || form.totalMarks === "" || !Number.isFinite(marks) || !Number.isFinite(total) || total <= 0) {
      return null;
    }
    return Math.round((marks / total) * 1000) / 10;
  }, [form]);

  const set = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const toggle = (key, value) =>
    setForm((current) => ({
      ...current,
      [key]: current[key].includes(value) ? current[key].filter((item) => item !== value) : [...current[key], value],
    }));

  const reset = () => {
    setForm(buildForm(user));
    toast("Unsaved changes discarded.", "info");
  };

  const save = async (event) => {
    event.preventDefault();
    if (!form) return;
    if (form.name.trim().length < 2) {
      toast("Enter your full name (at least 2 characters).", "error");
      return;
    }
    const hasMarks = form.marksObtained !== "" || form.totalMarks !== "";
    if (!verified && hasMarks) {
      if (form.marksObtained === "" || form.totalMarks === "") {
        toast("Provide both marks obtained and total marks.", "error");
        return;
      }
      if (Number(form.marksObtained) > Number(form.totalMarks)) {
        toast("Marks obtained cannot exceed total marks.", "error");
        return;
      }
    }

    const payload = {
      name: form.name.trim(),
      phone: form.phone.trim(),
      bio: form.bio.trim(),
      avatar: form.avatar.trim(),
      skills: form.skills,
      interests: form.interests,
    };

    if (!verified) {
      if (form.matricRollNumber.trim()) payload.matricRollNumber = form.matricRollNumber.trim().toUpperCase();
      if (form.marksObtained !== "" && form.totalMarks !== "") {
        payload.marksObtained = Number(form.marksObtained);
        payload.totalMarks = Number(form.totalMarks);
      }
      if (form.classYear) payload.classYear = form.classYear;
      if (form.section.trim()) payload.section = form.section.trim();
      if (form.department) payload.department = form.department;
    }

    setSaving(true);
    try {
      const result = await fetchJson("/api/users/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      setData({ user: result.user });
      setForm(buildForm(result.user));
      toast("Your profile has been updated.", "success", "Profile saved");
    } catch (err) {
      toast(err.message || "Could not save your profile.", "error");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-56" />
        <div className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
          <div className="space-y-5">
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </div>
          <Skeleton className="h-96" />
        </div>
      </div>
    );
  }

  if (error || !user || !form) {
    return (
      <Panel>
        <ErrorState message={error || "Could not load your profile."} onRetry={reload} />
      </Panel>
    );
  }

  const academicStarted = Boolean(user.matricRollNumber || user.classYear || user.department || user.matricMarks);

  return (
    <>
      <ConsoleHeading
        eyebrow="Account"
        title="Profile & academics"
        description="Keep your student record current — this is the name and roll number printed on your certificates."
        actions={<StatusBadge status={user.verificationStatus} kind="verification" />}
      />

      <form onSubmit={save} className="grid gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="space-y-5">
          <Panel title="Profile details" description="Visible to societies you interact with.">
            <div className="space-y-4 p-5">
              <div className="flex items-center gap-3 rounded-xl border border-line bg-lavender/40 px-3.5 py-3">
                {form.avatar ? (
                  <img loading="lazy" decoding="async" src={form.avatar} alt="" className="h-12 w-12 rounded-full object-cover" />
                ) : (
                  <span className="grid h-12 w-12 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 text-sm font-bold text-white">
                    {initials(form.name || user.name)}
                  </span>
                )}
                <div className="min-w-0">
                  <p className="truncate text-[0.88rem] font-semibold text-ink">{form.name || user.name}</p>
                  <p className="truncate text-[0.72rem] text-mist">{user.email}</p>
                </div>
                <span className="badge badge-violet ml-auto capitalize">{user.role}</span>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Full name">
                  <input className="field" value={form.name} onChange={(event) => set("name", event.target.value)} placeholder="Your full name" />
                </FormField>
                <FormField label="Phone" hint="Include your country code if outside Pakistan.">
                  <input className="field" value={form.phone} onChange={(event) => set("phone", event.target.value)} placeholder="+92 300 0000000" />
                </FormField>
              </div>

              <FormField label="Avatar URL" hint="Paste a hosted image URL. Leave blank to use your initials.">
                <input className="field" value={form.avatar} onChange={(event) => set("avatar", event.target.value)} placeholder="https://…" />
              </FormField>

              <FormField label="Bio" hint={`${form.bio.length}/600 characters`}>
                <textarea
                  className="field min-h-[96px] resize-y"
                  maxLength={600}
                  value={form.bio}
                  onChange={(event) => set("bio", event.target.value)}
                  placeholder="A short introduction — your interests, strengths and what you want to build."
                />
              </FormField>

              <div>
                <p className="label">Skills</p>
                <ChipPicker options={SKILL_OPTIONS} selected={form.skills} onToggle={(value) => toggle("skills", value)} />
              </div>
              <div>
                <p className="label">Interests</p>
                <ChipPicker options={INTEREST_OPTIONS} selected={form.interests} onToggle={(value) => toggle("interests", value)} />
              </div>
            </div>
          </Panel>

          <Panel
            title="Academic record"
            description="Matriculation details used to verify your student account."
            actions={verified ? <span className="badge badge-emerald"><Lock size={10} /> Locked</span> : null}
          >
            <div className="space-y-4 p-5">
              {verified ? (
                <Alert tone="success">
                  <span className="inline-flex items-center gap-1.5 font-medium"><Lock size={13} /> Locked after verification.</span>{" "}
                  Academic details cannot be edited once your account is verified. Contact the activities office for corrections.
                </Alert>
              ) : (
                <Alert tone="info">Academic details are reviewed by the activities office. Make sure they match your result card.</Alert>
              )}

              <div className="grid gap-4 sm:grid-cols-2">
                <FormField label="Matric roll number">
                  <input
                    className="field uppercase"
                    disabled={verified}
                    value={form.matricRollNumber}
                    onChange={(event) => set("matricRollNumber", event.target.value)}
                    placeholder="e.g. 123456"
                  />
                </FormField>
                <FormField label="Section" hint="Up to 3 characters.">
                  <input
                    className="field"
                    maxLength={3}
                    disabled={verified}
                    value={form.section}
                    onChange={(event) => set("section", event.target.value)}
                    placeholder="A"
                  />
                </FormField>
                <FormField label="Marks obtained">
                  <input
                    type="number"
                    min="0"
                    className="field"
                    disabled={verified}
                    value={form.marksObtained}
                    onChange={(event) => set("marksObtained", event.target.value)}
                    placeholder="e.g. 850"
                  />
                </FormField>
                <FormField label="Total marks">
                  <input
                    type="number"
                    min="1"
                    className="field"
                    disabled={verified}
                    value={form.totalMarks}
                    onChange={(event) => set("totalMarks", event.target.value)}
                    placeholder="e.g. 1100"
                  />
                </FormField>
                <FormField label="Class year">
                  <select className="field" disabled={verified} value={form.classYear} onChange={(event) => set("classYear", event.target.value)}>
                    <option value="">Select class year</option>
                    {CLASS_YEARS.map((year) => (
                      <option key={year} value={year}>{year}</option>
                    ))}
                  </select>
                </FormField>
                <FormField label="Department">
                  <select className="field" disabled={verified} value={form.department} onChange={(event) => set("department", event.target.value)}>
                    <option value="">Select department</option>
                    {DEPARTMENTS.map((department) => (
                      <option key={department} value={department}>{department}</option>
                    ))}
                  </select>
                </FormField>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-line bg-lavender/40 px-3.5 py-3">
                <span className="inline-flex items-center gap-1.5 text-[0.76rem] font-medium text-ink-2">
                  <Percent size={14} className="text-purple" /> Percentage preview
                </span>
                <span className="font-display text-lg font-bold text-purple">
                  {percentage === null ? "—" : `${percentage}%`}
                </span>
              </div>
            </div>
          </Panel>
        </div>

        <div className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <Panel title="Student identity">
            <div className="space-y-3 p-5">
              <div className="flex items-center gap-2 text-[0.78rem]">
                <UserRound size={14} className="text-purple" />
                <span className="text-mist">Name</span>
                <span className="ml-auto max-w-[60%] truncate font-medium text-ink">{user.name}</span>
              </div>
              <div className="flex items-center gap-2 text-[0.78rem]">
                <Mail size={14} className="text-purple" />
                <span className="text-mist">Email</span>
                <span className="ml-auto max-w-[60%] truncate font-medium text-ink">{user.email}</span>
              </div>
              <div className="flex items-center gap-2 text-[0.78rem]">
                <GraduationCap size={14} className="text-purple" />
                <span className="text-mist">Campus</span>
                <span className="ml-auto truncate font-medium text-ink">{user.instituteShort || user.instituteName || "KIPS"}</span>
              </div>
              <div className="flex items-center gap-2 text-[0.78rem]">
                <CalendarDays size={14} className="text-purple" />
                <span className="text-mist">Joined</span>
                <span className="ml-auto font-medium text-ink">{user.createdAt ? formatDate(user.createdAt) : "—"}</span>
              </div>
              <div className="flex items-center justify-between gap-2 border-t border-line pt-3 text-[0.78rem]">
                <span className="inline-flex items-center gap-1.5 text-mist"><Sparkles size={13} className="text-purple" /> Points</span>
                <span className="font-display text-lg font-bold text-purple">{user.points || 0}</span>
              </div>
            </div>
          </Panel>

          <Panel title="Verification">
            <div className="space-y-3 p-5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[0.78rem] text-mist">Status</span>
                <StatusBadge status={user.verificationStatus} kind="verification" />
              </div>
              {user.verificationStatus === "rejected" ? (
                <Alert tone="error">
                  {user.verificationNote || "Your verification was rejected. Update your academic details and try again."}
                </Alert>
              ) : null}
              {user.verificationStatus === "pending" ? (
                <Alert tone="warning">Your record is awaiting review by the activities office.</Alert>
              ) : null}
              {verified ? (
                <Alert tone="success">
                  <span className="inline-flex items-center gap-1.5"><BadgeCheck size={13} /> Your student record is verified.</span>
                </Alert>
              ) : null}

              {academicStarted ? (
                <div className="space-y-2 rounded-xl border border-line bg-lavender/40 px-3.5 py-3 text-[0.74rem]">
                  <p className="text-[0.62rem] font-bold uppercase tracking-[0.14em] text-mist">Submitted record</p>
                  {[
                    ["Roll number", user.matricRollNumber || "—"],
                    ["Class year", user.classYear || "—"],
                    ["Section", user.section || "—"],
                    ["Department", user.department || "—"],
                    ["Matric", user.matricPercentage != null ? `${user.matricPercentage}%` : "—"],
                  ].map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-3">
                      <span className="text-mist">{label}</span>
                      <span className="truncate text-right font-medium text-ink-2">{value}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-[0.74rem] leading-relaxed text-mist">
                  Complete your academic record to submit your account for verification.
                </p>
              )}
            </div>
          </Panel>

          <Panel title="Save changes">
            <div className="space-y-3 p-5">
              <p className="text-[0.74rem] leading-relaxed text-mist">
                Your profile name appears on certificates and society records. Academic fields lock permanently after verification.
              </p>
              <div className="flex items-center gap-2">
                <button type="submit" className="btn btn-primary btn-sm flex-1" disabled={saving}>
                  <Save size={13} /> {saving ? "Saving…" : "Save profile"}
                </button>
                <button type="button" className="btn btn-ghost btn-sm" onClick={reset} disabled={saving}>
                  <RotateCcw size={13} /> Reset
                </button>
              </div>
              <Link href="/dashboard/certificates" className="inline-flex items-center gap-1.5 text-[0.72rem] font-medium text-purple hover:text-blue">
                <ShieldCheck size={13} /> View your certificates
              </Link>
            </div>
          </Panel>
        </div>
      </form>
    </>
  );
}
