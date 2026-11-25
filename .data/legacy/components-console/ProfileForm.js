"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Lock, Save } from "lucide-react";
import { useToast } from "@/components/ui/Toast";
import { DEPARTMENTS } from "@/lib/constants";

export default function ProfileForm({ user }) {
  const router = useRouter();
  const { toast } = useToast();
  const [form, setForm] = useState({
    name: user.name || "",
    rollNumber: user.rollNumber || "",
    department: user.department || "",
    program: user.program || "",
    semester: user.semester || "",
    phone: user.phone || "",
    bio: user.bio || "",
    skills: (user.skills || []).join(", "),
  });
  const [passwords, setPasswords] = useState({ currentPassword: "", newPassword: "", confirm: "" });
  const [saving, setSaving] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  const update = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveProfile = async (event) => {
    event.preventDefault();
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          skills: form.skills
            .split(",")
            .map((skill) => skill.trim())
            .filter(Boolean)
            .slice(0, 12),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not update profile.", "error");
        return;
      }
      toast("Profile updated.", "success");
      router.refresh();
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSaving(false);
    }
  };

  const savePassword = async (event) => {
    event.preventDefault();
    if (passwords.newPassword.length < 8) {
      toast("New password must be at least 8 characters.", "error");
      return;
    }
    if (passwords.newPassword !== passwords.confirm) {
      toast("New passwords do not match.", "error");
      return;
    }
    setSavingPassword(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: passwords.currentPassword,
          newPassword: passwords.newPassword,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast(data.error || "Could not change password.", "error");
        return;
      }
      toast("Password changed.", "success");
      setPasswords({ currentPassword: "", newPassword: "", confirm: "" });
    } catch {
      toast("Something went wrong.", "error");
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <div className="space-y-6">
      <form onSubmit={saveProfile} className="panel p-5 sm:p-6">
        <h2 className="font-display text-base font-semibold text-white">Profile details</h2>
        <p className="mt-0.5 text-[0.76rem] text-mist">This information appears on your certificates.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Full name
            </label>
            <input value={form.name} onChange={(e) => update("name", e.target.value)} required className="field" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Roll number
            </label>
            <input value={form.rollNumber} onChange={(e) => update("rollNumber", e.target.value)} className="field" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Semester
            </label>
            <input value={form.semester} onChange={(e) => update("semester", e.target.value)} className="field" />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Department
            </label>
            <select value={form.department} onChange={(e) => update("department", e.target.value)} className="field">
              <option value="">Select department</option>
              {DEPARTMENTS.map((department) => (
                <option key={department}>{department}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Programme
            </label>
            <input value={form.program} onChange={(e) => update("program", e.target.value)} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Phone
            </label>
            <input value={form.phone} onChange={(e) => update("phone", e.target.value)} className="field" />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Skills <span className="normal-case tracking-normal">(comma separated)</span>
            </label>
            <input
              value={form.skills}
              onChange={(e) => update("skills", e.target.value)}
              placeholder="React, public speaking, design"
              className="field"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={3}
              maxLength={400}
              className="field resize-none"
              placeholder="A short line about what you're into on campus."
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
            {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
            {saving ? "Saving…" : "Save profile"}
          </button>
        </div>
      </form>

      <form onSubmit={savePassword} className="panel p-5 sm:p-6">
        <h2 className="flex items-center gap-2 font-display text-base font-semibold text-white">
          <Lock size={15} className="text-violet-300" /> Change password
        </h2>
        <p className="mt-0.5 text-[0.76rem] text-mist">Use at least 8 characters.</p>

        <div className="mt-5 grid gap-4 sm:grid-cols-3">
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Current password
            </label>
            <input
              type="password"
              value={passwords.currentPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, currentPassword: e.target.value }))}
              required
              autoComplete="current-password"
              className="field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              New password
            </label>
            <input
              type="password"
              value={passwords.newPassword}
              onChange={(e) => setPasswords((p) => ({ ...p, newPassword: e.target.value }))}
              required
              minLength={8}
              autoComplete="new-password"
              className="field"
            />
          </div>
          <div>
            <label className="mb-1.5 block text-[0.7rem] font-medium uppercase tracking-[0.14em] text-mist">
              Confirm new password
            </label>
            <input
              type="password"
              value={passwords.confirm}
              onChange={(e) => setPasswords((p) => ({ ...p, confirm: e.target.value }))}
              required
              autoComplete="new-password"
              className="field"
            />
          </div>
        </div>

        <div className="mt-5 flex justify-end">
          <button type="submit" disabled={savingPassword} className="btn btn-secondary btn-sm">
            {savingPassword ? <Loader2 size={14} className="animate-spin" /> : <Lock size={14} />}
            {savingPassword ? "Updating…" : "Update password"}
          </button>
        </div>
      </form>
    </div>
  );
}
