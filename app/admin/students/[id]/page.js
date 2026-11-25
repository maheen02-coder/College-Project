"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  GraduationCap,
  Mail,
  Phone,
  RefreshCw,
  Save,
  ShieldCheck,
  UserRound,
  XCircle,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FormField,
  Modal,
  Panel,
  Skeleton,
  StatTile,
  Toggle,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import StatusBadge from "@/components/ui/StatusBadge";
import { useToast } from "@/components/ui/Toast";
import {
  ADMIN_PERMISSIONS,
  ADMIN_ROLE_PRESETS,
  VERIFICATION_STATUS_META,
} from "@/lib/constants";
import { formatDate, formatDateTime, initials } from "@/lib/utils";

const ROLE_LABEL = { student: "Student", admin: "Administrator", superadmin: "Super Admin", organizer: "Organizer" };

export default function AdminStudentDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();
  const { data, loading, error, reload } = useApi(id ? `/api/users/${id}` : null);

  const user = data?.user;
  const staff = user ? ["admin", "superadmin"].includes(user.role) : false;

  const [verification, setVerification] = useState(null);
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [confirmDeactivate, setConfirmDeactivate] = useState(false);
  const [adminForm, setAdminForm] = useState(null);

  useEffect(() => {
    if (!user) return;
    setAdminForm({
      name: user.name || "",
      phone: user.phone || "",
      adminRole: user.adminRole || "",
      adminPermissions: user.adminPermissions || [],
      isActive: Boolean(user.isActive),
    });
  }, [user]);

  const roleLabel = useMemo(() => {
    if (!user) return "";
    if (user.adminRole && ADMIN_ROLE_PRESETS[user.adminRole]) return ADMIN_ROLE_PRESETS[user.adminRole].label;
    if (user.adminRole) return user.adminRole.replace(/_/g, " ");
    return ROLE_LABEL[user.role] || user.role;
  }, [user]);

  const runVerification = async () => {
    if (!verification) return;
    setSaving(true);
    try {
      await fetchJson(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: verification, note: note.trim() }),
      });
      toast(verification === "verify" ? "Student verified." : "Verification rejected.", verification === "verify" ? "success" : "info");
      setVerification(null);
      setNote("");
      await reload();
    } catch (err) {
      toast(err.message || "Could not update verification.", "error");
    } finally {
      setSaving(false);
    }
  };

  const setAccount = async (isActive) => {
    setSaving(true);
    try {
      await fetchJson(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive }),
      });
      toast(isActive ? "Account reactivated." : "Account deactivated.", isActive ? "success" : "info");
      setConfirmDeactivate(false);
      await reload();
    } catch (err) {
      toast(err.message || "Could not update the account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const saveAdmin = async (event) => {
    event.preventDefault();
    if (!adminForm) return;
    setSaving(true);
    try {
      await fetchJson(`/api/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: adminForm.name.trim(),
          phone: adminForm.phone.trim(),
          adminRole: adminForm.adminRole.trim(),
          adminPermissions: adminForm.adminPermissions,
        }),
      });
      toast("Staff account updated.", "success");
      await reload();
    } catch (err) {
      toast(err.message || "Could not update this staff account.", "error");
    } finally {
      setSaving(false);
    }
  };

  const togglePermission = (permission) => {
    setAdminForm((current) => {
      if (!current) return current;
      const has = current.adminPermissions.includes(permission);
      return {
        ...current,
        adminPermissions: has
          ? current.adminPermissions.filter((item) => item !== permission)
          : [...current.adminPermissions, permission],
      };
    });
  };

  if (loading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-20 w-full" />
        <div className="grid gap-4 lg:grid-cols-3">
          <Skeleton className="h-72" />
          <Skeleton className="h-72 lg:col-span-2" />
        </div>
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }

  if (error || !user) {
    return (
      <div className="space-y-5">
        <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-purple hover:underline">
          <ArrowLeft size={14} /> Back to students
        </Link>
        <Panel>
          <div className="px-5 py-8">
            <Alert tone="error">{error || "This account could not be found."}</Alert>
            <button type="button" onClick={reload} className="btn btn-secondary btn-sm mt-4">
              <RefreshCw size={14} /> Try again
            </button>
          </div>
        </Panel>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <Link href="/admin/students" className="inline-flex items-center gap-1.5 text-[0.78rem] font-semibold text-purple hover:underline">
        <ArrowLeft size={14} /> Back to students
      </Link>

      <ConsoleHeading
        eyebrow={staff ? "Staff record" : "Student record"}
        title={user.name}
        description={`${user.email}${user.matricRollNumber ? ` · ${user.matricRollNumber}` : ""}${user.classYear ? ` · ${user.classYear}` : ""}`}
        actions={
          <>
            <StatusBadge status={user.verificationStatus} kind="verification" />
            {!staff && user.verificationStatus !== "verified" ? (
              <button type="button" onClick={() => setVerification("verify")} className="btn btn-primary btn-sm">
                <CheckCircle2 size={14} /> Verify
              </button>
            ) : null}
            {!staff && user.verificationStatus !== "rejected" ? (
              <button type="button" onClick={() => setVerification("reject")} className="btn btn-danger btn-sm">
                <XCircle size={14} /> Reject
              </button>
            ) : null}
            <button type="button" onClick={reload} className="btn btn-ghost btn-sm !px-2.5" title="Refresh" aria-label="Refresh">
              <RefreshCw size={14} />
            </button>
          </>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Panel title="Profile" description="Account identity and access.">
          <div className="space-y-4 px-5 py-5">
            <div className="flex items-center gap-3">
              <span className="grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-blue-600 font-display text-lg font-bold text-white">
                {initials(user.name)}
              </span>
              <div className="min-w-0">
                <p className="truncate text-[0.95rem] font-semibold text-ink">{user.name}</p>
                <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-purple">{roleLabel}</p>
                <span className={`badge mt-1 ${user.isActive ? "badge-emerald" : "badge-slate"}`}>
                  {user.isActive ? "Active account" : "Deactivated"}
                </span>
              </div>
            </div>

            <div className="space-y-2.5 border-t border-line pt-4 text-[0.8rem]">
              <p className="flex items-center gap-2 text-ink-2">
                <Mail size={14} className="shrink-0 text-mist" />
                <a href={`mailto:${user.email}`} className="truncate hover:text-purple">{user.email}</a>
              </p>
              <p className="flex items-center gap-2 text-ink-2">
                <Phone size={14} className="shrink-0 text-mist" />
                {user.phone ? <a href={`tel:${user.phone}`} className="hover:text-purple">{user.phone}</a> : <span className="text-mist">No phone on file</span>}
              </p>
              <p className="flex items-center gap-2 text-ink-2">
                <UserRound size={14} className="shrink-0 text-mist" />
                <span>Joined {formatDate(user.createdAt)}</span>
              </p>
              <p className="flex items-center gap-2 text-ink-2">
                <ShieldCheck size={14} className="shrink-0 text-mist" />
                <span>Last login {user.lastLoginAt ? formatDateTime(user.lastLoginAt) : "—"}</span>
              </p>
            </div>

            <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3">
              <p className="text-[0.66rem] font-semibold uppercase tracking-[0.12em] text-mist">Verification</p>
              <div className="mt-1.5 flex flex-wrap items-center gap-2">
                <StatusBadge status={user.verificationStatus} kind="verification" />
                {user.verifiedAt ? <span className="text-[0.7rem] text-mist">on {formatDate(user.verifiedAt)}</span> : null}
              </div>
              {user.verificationNote ? (
                <p className="mt-2 rounded-lg bg-white px-2.5 py-2 text-[0.72rem] leading-relaxed text-ink-2">{user.verificationNote}</p>
              ) : null}
            </div>
          </div>
        </Panel>

        {staff ? (
          <Panel title="Staff access" description="Edit the admin role and granular permissions." className="lg:col-span-2">
            <form onSubmit={saveAdmin} className="space-y-4 px-5 py-5">
              <div className="grid gap-3 sm:grid-cols-2">
                <FormField label="Full name">
                  <input
                    value={adminForm?.name || ""}
                    onChange={(event) => setAdminForm((current) => ({ ...current, name: event.target.value }))}
                    className="field"
                    required
                    minLength={2}
                  />
                </FormField>
                <FormField label="Phone">
                  <input
                    value={adminForm?.phone || ""}
                    onChange={(event) => setAdminForm((current) => ({ ...current, phone: event.target.value }))}
                    className="field"
                    placeholder="+92 300 0000000"
                  />
                </FormField>
              </div>

              <FormField label="Admin role" hint="Preset slug such as student_admin or a custom role name.">
                <input
                  value={adminForm?.adminRole || ""}
                  onChange={(event) => {
                    const value = event.target.value;
                    setAdminForm((current) => ({
                      ...current,
                      adminRole: value,
                      adminPermissions: ADMIN_ROLE_PRESETS[value]
                        ? [...ADMIN_ROLE_PRESETS[value].permissions]
                        : current.adminPermissions,
                    }));
                  }}
                  className="field"
                  placeholder="student_admin"
                  list="admin-role-presets"
                />
                <datalist id="admin-role-presets">
                  {Object.entries(ADMIN_ROLE_PRESETS).map(([slug, preset]) => (
                    <option key={slug} value={slug}>{preset.label}</option>
                  ))}
                </datalist>
              </FormField>

              <div>
                <p className="label">Permissions ({adminForm?.adminPermissions.length || 0})</p>
                <div className="grid max-h-64 gap-1.5 overflow-y-auto rounded-xl border border-line bg-ivory/50 p-2.5 sm:grid-cols-2">
                  {ADMIN_PERMISSIONS.map((permission) => (
                    <label key={permission} className="flex cursor-pointer items-center gap-2 rounded-lg px-2 py-1.5 text-[0.76rem] text-ink-2 transition hover:bg-white">
                      <input
                        type="checkbox"
                        checked={Boolean(adminForm?.adminPermissions.includes(permission))}
                        onChange={() => togglePermission(permission)}
                        className="h-3.5 w-3.5 accent-violet-600"
                      />
                      <span>{ADMIN_PERMISSION_META[permission]}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-between gap-3 border-t border-line pt-4">
                <Toggle
                  checked={Boolean(adminForm?.isActive)}
                  onChange={(next) => (next ? setAccount(true) : setConfirmDeactivate(true))}
                  label="Account active"
                  description="Inactive staff cannot sign in to the console."
                />
                <button type="submit" disabled={saving} className="btn btn-primary btn-sm">
                  <Save size={14} /> {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </form>
          </Panel>
        ) : (
          <Panel title="Academic record" description="Matriculation and class placement on file." className="lg:col-span-2">
            <div className="grid gap-4 px-5 py-5 sm:grid-cols-2">
              <div className="rounded-xl border border-line bg-ivory/60 px-4 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Matric roll number</p>
                <p className="mt-1 font-mono text-[0.92rem] font-semibold text-ink">{user.matricRollNumber || "—"}</p>
              </div>
              <div className="rounded-xl border border-line bg-ivory/60 px-4 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Matric percentage</p>
                <p className="mt-1 font-display text-[1.1rem] font-bold text-ink">
                  {user.matricPercentage != null ? `${user.matricPercentage}%` : "—"}
                </p>
                <p className="text-[0.68rem] text-mist">
                  {user.matricMarks != null ? `${user.matricMarks} / ${user.matricTotalMarks ?? "—"} marks` : "Marks not recorded"}
                </p>
              </div>
              <div className="rounded-xl border border-line px-4 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Class year</p>
                <p className="mt-1 text-[0.86rem] font-medium text-ink">{user.classYear || "—"}</p>
              </div>
              <div className="rounded-xl border border-line px-4 py-3">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Section</p>
                <p className="mt-1 text-[0.86rem] font-medium text-ink">{user.section || "—"}</p>
              </div>
              <div className="rounded-xl border border-line px-4 py-3 sm:col-span-2">
                <p className="text-[0.64rem] font-semibold uppercase tracking-[0.12em] text-mist">Department</p>
                <p className="mt-1 inline-flex items-center gap-2 text-[0.86rem] font-medium text-ink">
                  <GraduationCap size={15} className="text-purple" /> {user.department || "—"}
                </p>
              </div>
              {user.skills?.length ? (
                <div className="sm:col-span-2">
                  <p className="label">Skills</p>
                  <div className="flex flex-wrap gap-1.5">
                    {user.skills.map((skill) => (
                      <span key={skill} className="chip">{skill}</span>
                    ))}
                  </div>
                </div>
              ) : null}
              {user.bio ? (
                <p className="rounded-xl bg-lavender/60 px-3.5 py-3 text-[0.78rem] leading-relaxed text-ink-2 sm:col-span-2">{user.bio}</p>
              ) : null}
            </div>
          </Panel>
        )}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Applications" value={user.applicationsCount || 0} icon="applications" hint="Recruitment submissions" />
        <StatTile label="Achievements" value={user.achievementsCount || 0} icon="competitions" tone="amber" hint="Results on record" />
        <StatTile label="Certificates" value={user.certificatesCount || 0} icon="certificates" tone="emerald" hint="Issued documents" />
        <StatTile label="Points" value={user.points || 0} icon="analytics" tone="blue" hint="Participation score" />
      </div>

      <div className="grid gap-4 xl:grid-cols-[1.5fr_1fr]">
        <Panel
          title="Society memberships"
          description={`${user.memberships?.length || 0} membership record${(user.memberships?.length || 0) === 1 ? "" : "s"}`}
        >
          <div className="divide-y divide-line">
            {user.memberships?.length ? (
              user.memberships.map((membership) => (
                <div key={membership.id} className="flex flex-wrap items-center justify-between gap-2 px-5 py-3">
                  <div className="flex min-w-0 items-center gap-2.5">
                    <span
                      className="h-2.5 w-2.5 shrink-0 rounded-full"
                      style={{ backgroundColor: membership.society?.color || "#6d28d9" }}
                    />
                    <div className="min-w-0">
                      <p className="truncate text-[0.82rem] font-semibold text-ink">{membership.society?.name || "Society"}</p>
                      <p className="text-[0.68rem] text-mist">Joined {formatDate(membership.joinedAt)}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusBadge status={membership.role} kind="society_role" />
                    <span className={`badge ${membership.status === "active" ? "badge-emerald" : "badge-slate"}`}>{membership.status}</span>
                  </div>
                </div>
              ))
            ) : (
              <p className="px-5 py-10 text-center text-[0.8rem] text-mist">No society memberships yet.</p>
            )}
          </div>
        </Panel>

        {!staff ? (
          <div className="space-y-4">
            <Panel title="Verification decision" description="Approve or reject the student's matric record.">
              <div className="space-y-3 px-5 py-4">
                <div className="flex items-center justify-between rounded-xl border border-line bg-ivory/60 px-3.5 py-2.5">
                  <span className="text-[0.74rem] text-mist">Current state</span>
                  <StatusBadge status={user.verificationStatus} kind="verification" />
                </div>
                <label className="block">
                  <span className="label">Reviewer note</span>
                  <textarea
                    value={note}
                    onChange={(event) => setNote(event.target.value)}
                    rows={3}
                    maxLength={300}
                    placeholder="Attach a short note for the student…"
                    className="field resize-none"
                  />
                </label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setVerification("verify")} className="btn btn-primary btn-sm flex-1 justify-center">
                    <CheckCircle2 size={14} /> Verify
                  </button>
                  <button type="button" onClick={() => setVerification("reject")} className="btn btn-danger btn-sm flex-1 justify-center">
                    <XCircle size={14} /> Reject
                  </button>
                </div>
                <p className="text-[0.68rem] text-mist">Requires the Student verification permission.</p>
              </div>
            </Panel>

            <Panel title="Account access" description="Deactivating blocks sign-in without deleting records.">
              <div className="px-5 py-4">
                <Toggle
                  checked={Boolean(user.isActive)}
                  onChange={(next) => (next ? setAccount(true) : setConfirmDeactivate(true))}
                  label={user.isActive ? "Account is active" : "Account is deactivated"}
                  description={user.isActive ? "The student can sign in and register for events." : "The student cannot sign in until reactivated."}
                />
              </div>
            </Panel>
          </div>
        ) : (
          <Panel title="Account access" description="Staff accounts can be deactivated without deleting activity.">
            <div className="px-5 py-4">
              <Toggle
                checked={Boolean(user.isActive)}
                onChange={(next) => (next ? setAccount(true) : setConfirmDeactivate(true))}
                label={user.isActive ? "Account is active" : "Account is deactivated"}
                description={user.isActive ? "This staff member can access the console." : "This staff member is locked out."}
              />
            </div>
          </Panel>
        )}
      </div>

      <Modal
        open={Boolean(verification)}
        onClose={() => (saving ? null : setVerification(null))}
        title={verification === "verify" ? "Verify student" : "Reject verification"}
        description={verification === "verify" ? "Unlock registrations and certificates for this student." : "The student will be notified to correct their details."}
        footer={
          <>
            <button type="button" onClick={() => setVerification(null)} disabled={saving} className="btn btn-ghost btn-sm">
              Cancel
            </button>
            <button
              type="button"
              onClick={runVerification}
              disabled={saving}
              className={verification === "verify" ? "btn btn-primary btn-sm" : "btn btn-danger btn-sm"}
            >
              {saving ? "Saving…" : verification === "verify" ? "Confirm verification" : "Confirm rejection"}
            </button>
          </>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-line bg-ivory/60 px-3.5 py-3 text-[0.8rem] text-ink-2">
            <p className="font-semibold text-ink">{user.name}</p>
            <p className="text-[0.72rem] text-mist">
              {user.matricRollNumber || "No matric roll"} · {user.matricPercentage != null ? `${user.matricPercentage}%` : "No percentage"} ·{" "}
              {VERIFICATION_STATUS_META[user.verificationStatus]?.label}
            </p>
          </div>
          <label className="block">
            <span className="label">Note (optional)</span>
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              maxLength={300}
              className="field resize-none"
              placeholder="Record what was checked or what needs fixing…"
            />
          </label>
        </div>
      </Modal>

      <Modal
        open={confirmDeactivate}
        onClose={() => (saving ? null : setConfirmDeactivate(false))}
        title="Deactivate account"
        description="This blocks sign-in immediately. Records and history stay intact."
        footer={
          <>
            <button type="button" onClick={() => setConfirmDeactivate(false)} disabled={saving} className="btn btn-ghost btn-sm">
              Keep active
            </button>
            <button type="button" onClick={() => setAccount(false)} disabled={saving} className="btn btn-danger btn-sm">
              {saving ? "Saving…" : "Deactivate account"}
            </button>
          </>
        }
      >
        <Alert tone="warning">
          <strong>{user.name}</strong> will not be able to sign in or register for events until an admin reactivates the account.
        </Alert>
      </Modal>
    </div>
  );
}
