"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  ArrowUpRight,
  CalendarDays,
  ExternalLink,
  Mail,
  MessagesSquare,
  Plus,
  RefreshCw,
  Save,
  Star,
  Trash2,
  UserPlus,
  Users,
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
import { SOCIETY_CATEGORIES, SOCIETY_ROLES, SOCIETY_ROLE_META } from "@/lib/constants";
import { cn, formatDate, initials } from "@/lib/utils";

const EMPTY_FORM = {
  name: "",
  tagline: "",
  description: "",
  purpose: "",
  activities: "",
  category: "General",
  color: "#7c3aed",
  logo: "",
  cover: "",
  foundedYear: "",
  email: "",
  meetingSchedule: "",
  featured: false,
  isActive: true,
};

function SocietyMark({ society }) {
  if (society?.logo) {
    return <img src={society.logo} alt="" className="h-16 w-16 rounded-2xl border border-line bg-white object-cover" />;
  }
  return (
    <span
      className="grid h-16 w-16 place-items-center rounded-2xl text-lg font-bold text-white"
      style={{ backgroundColor: society?.color || "#6d28d9" }}
    >
      {initials(society?.name || "") || <Users size={20} />}
    </span>
  );
}

export default function AdminSocietyDetailPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();

  const societyApi = useApi(id ? `/api/societies/${id}` : null);
  const membersApi = useApi(id ? `/api/societies/${id}/members` : null);
  const groupsApi = useApi(id ? `/api/groups?society=${id}` : null);
  const studentsApi = useApi("/api/users?role=student&limit=100");

  const society = societyApi.data?.item || null;
  const members = membersApi.data?.items || [];
  const groups = groupsApi.data?.groups || [];
  const students = studentsApi.data?.users || [];

  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");

  const [addOpen, setAddOpen] = useState(false);
  const [memberForm, setMemberForm] = useState({ userId: "", role: "member", responsibilities: "", phone: "" });
  const [memberSaving, setMemberSaving] = useState(false);
  const [memberError, setMemberError] = useState("");
  const [busyMemberId, setBusyMemberId] = useState("");
  const [removeTarget, setRemoveTarget] = useState(null);
  const [removing, setRemoving] = useState(false);

  useEffect(() => {
    const item = societyApi.data?.item;
    if (!item) return;
    setForm({
      name: item.name || "",
      tagline: item.tagline || "",
      description: item.description || "",
      purpose: item.purpose || "",
      activities: (item.activities || []).join("\n"),
      category: item.category || "General",
      color: item.color || "#7c3aed",
      logo: item.logo || "",
      cover: item.cover || "",
      foundedYear: item.foundedYear == null ? "" : String(item.foundedYear),
      email: item.email || "",
      meetingSchedule: item.meetingSchedule || "",
      featured: Boolean(item.featured),
      isActive: Boolean(item.isActive),
    });
  }, [societyApi.data]);

  const availableStudents = useMemo(
    () => students.filter((student) => !members.some((member) => member.userId === student.id)),
    [students, members]
  );

  const setField = (key, value) => setForm((current) => ({ ...current, [key]: value }));

  const saveSociety = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      await fetchJson(`/api/societies/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          tagline: form.tagline,
          description: form.description,
          purpose: form.purpose,
          activities: form.activities,
          category: form.category,
          color: form.color,
          logo: form.logo,
          cover: form.cover,
          foundedYear: form.foundedYear === "" ? null : Number(form.foundedYear),
          email: form.email,
          meetingSchedule: form.meetingSchedule,
          featured: form.featured,
          isActive: form.isActive,
        }),
      });
      toast("Society profile saved.", "success");
      await societyApi.reload();
    } catch (err) {
      setFormError(err.message || "Could not save the society.");
    } finally {
      setSaving(false);
    }
  };

  const openAddMember = () => {
    setMemberForm({ userId: availableStudents[0]?.id || "", role: "member", responsibilities: "", phone: "" });
    setMemberError("");
    setAddOpen(true);
  };

  const addMember = async (event) => {
    event.preventDefault();
    if (memberSaving) return;
    if (!memberForm.userId) {
      setMemberError("Choose a verified student.");
      return;
    }
    setMemberSaving(true);
    setMemberError("");
    try {
      await fetchJson(`/api/societies/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(memberForm),
      });
      toast("Member added to the society.", "success");
      setAddOpen(false);
      await Promise.all([membersApi.reload(), societyApi.reload()]);
    } catch (err) {
      setMemberError(err.message || "Could not add the member.");
    } finally {
      setMemberSaving(false);
    }
  };

  const changeRole = async (member, role) => {
    setBusyMemberId(member.id);
    try {
      await fetchJson(`/api/members/${member.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role }),
      });
      toast(`${member.name} is now ${SOCIETY_ROLE_META[role]?.label || role}.`, "success");
      await membersApi.reload();
    } catch (err) {
      toast(err.message || "Could not change the role.", "error");
    } finally {
      setBusyMemberId("");
    }
  };

  const removeMember = async () => {
    if (!removeTarget) return;
    setRemoving(true);
    try {
      await fetchJson(`/api/members/${removeTarget.id}`, { method: "DELETE" });
      toast(`${removeTarget.name} removed from the society.`, "success");
      setRemoveTarget(null);
      await Promise.all([membersApi.reload(), societyApi.reload()]);
    } catch (err) {
      toast(err.message || "Could not remove the member.", "error");
    } finally {
      setRemoving(false);
    }
  };

  if (societyApi.loading && !society) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-40 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (societyApi.error || !society) {
    return (
      <div className="space-y-4">
        <ConsoleHeading eyebrow="Societies" title="Society" description="Could not load this society." />
        <Alert tone="error">{societyApi.error || "Society not found."}</Alert>
        <Link href="/admin/societies" className="btn btn-secondary btn-sm">
          <ArrowLeft size={13} /> Back to societies
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/societies" className="btn btn-ghost btn-sm">
          <ArrowLeft size={13} /> Societies
        </Link>
        <span className="text-mist">/</span>
        <span className="truncate text-[0.78rem] font-medium text-ink">{society.name}</span>
      </div>

      <ConsoleHeading
        eyebrow="Society profile"
        title={society.name}
        description={society.tagline || "Membership, profile details and the groups attached to this society."}
        actions={
          <>
            {society.slug ? (
              <a href={`/societies/${society.slug}`} target="_blank" rel="noreferrer" className="btn btn-secondary btn-sm">
                <ExternalLink size={13} /> Public page
              </a>
            ) : null}
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => Promise.all([societyApi.reload(), membersApi.reload(), groupsApi.reload()])}>
              <RefreshCw size={13} /> Refresh
            </button>
          </>
        }
      />

      <div className="card overflow-hidden">
        <div
          className="h-24 w-full"
          style={{
            background: society.cover
              ? `linear-gradient(90deg, rgba(255,255,255,0.75), rgba(255,255,255,0.25)), url("${society.cover}") center/cover`
              : `linear-gradient(120deg, ${society.color || "#6d28d9"}22, #2563eb18)`,
          }}
        />
        <div className="flex flex-col gap-4 px-5 pb-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="-mt-8 flex items-end gap-3">
            <div className="rounded-2xl border-4 border-white bg-white shadow-sm">
              <SocietyMark society={society} />
            </div>
            <div className="pb-0.5">
              <div className="flex flex-wrap items-center gap-1.5">
                <h3 className="text-[1.05rem] font-semibold text-ink">{society.name}</h3>
                {society.featured ? <Star size={14} className="fill-amber-400 text-amber-500" /> : null}
                <span className={cn("badge", society.isActive ? "badge-emerald" : "badge-slate")}>
                  {society.isActive ? "Active" : "Archived"}
                </span>
              </div>
              <p className="mt-0.5 text-[0.75rem] text-mist">{society.tagline || "No tagline"}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="badge badge-violet">{society.category || "General"}</span>
            {society.foundedYear ? (
              <span className="badge badge-slate">Founded {society.foundedYear}</span>
            ) : null}
            {society.meetingSchedule ? (
              <span className="inline-flex items-center gap-1 text-[0.72rem] text-mist">
                <CalendarDays size={13} /> {society.meetingSchedule}
              </span>
            ) : null}
            {society.email ? (
              <span className="inline-flex items-center gap-1 text-[0.72rem] text-mist">
                <Mail size={13} /> {society.email}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Active members" value={members.length || society.memberCount || 0} icon="students" hint="Verified students" />
        <StatTile label="Upcoming events" value={(society.events || []).length} icon="events" tone="blue" hint="Next on the calendar" />
        <StatTile label="Recruitments" value={(society.recruitments || []).length} icon="applications" tone="emerald" hint="Recent rounds" />
        <StatTile label="Group rooms" value={groups.length} icon="societies" tone="amber" hint="Chat spaces" />
      </div>

      <Panel
        title="Members"
        description="Roles here power society leadership badges and points."
        actions={
          <button type="button" className="btn btn-primary btn-sm" onClick={openAddMember}>
            <UserPlus size={13} /> Add member
          </button>
        }
      >
        {membersApi.error ? (
          <div className="p-4">
            <Alert tone="error">{membersApi.error}</Alert>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="table-console">
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Role</th>
                  <th>Joined</th>
                  <th>Status</th>
                  <th className="text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {membersApi.loading ? (
                  <tr>
                    <td colSpan={5} className="!py-10 text-center text-[0.8rem] text-mist">Loading members…</td>
                  </tr>
                ) : members.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="!py-10 text-center text-[0.8rem] text-mist">
                      No members yet. Add the first student.
                    </td>
                  </tr>
                ) : (
                  members.map((member) => (
                    <tr key={member.id}>
                      <td>
                        <div className="flex items-center gap-2.5">
                          {member.avatar ? (
                            <img src={member.avatar} alt="" className="h-8 w-8 rounded-full border border-line object-cover" />
                          ) : (
                            <span className="grid h-8 w-8 place-items-center rounded-full bg-lavender text-[0.64rem] font-bold text-purple">
                              {initials(member.name)}
                            </span>
                          )}
                          <div className="min-w-0">
                            <p className="truncate text-[0.8rem] font-semibold text-ink">{member.name}</p>
                            <p className="text-[0.66rem] text-mist">{member.roleLabel || SOCIETY_ROLE_META[member.role]?.label || member.role}</p>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="flex items-center gap-2">
                          <StatusBadge status={member.role} kind="society_role" />
                          <select
                            className="field !w-auto !py-1.5 text-[0.72rem]"
                            value={member.role}
                            disabled={busyMemberId === member.id}
                            onChange={(event) => changeRole(member, event.target.value)}
                            aria-label={`Change role for ${member.name}`}
                          >
                            {SOCIETY_ROLES.map((role) => (
                              <option key={role} value={role}>{SOCIETY_ROLE_META[role]?.label || role}</option>
                            ))}
                          </select>
                        </div>
                      </td>
                      <td className="whitespace-nowrap text-[0.74rem]">{formatDate(member.joinedAt)}</td>
                      <td><span className="badge badge-emerald">Active</span></td>
                      <td className="text-right">
                        <button
                          type="button"
                          className="btn btn-ghost btn-sm !text-rose-600"
                          onClick={() => setRemoveTarget(member)}
                        >
                          <Trash2 size={13} /> Remove
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      <div className="grid gap-5 xl:grid-cols-[1.55fr_1fr]">
        <Panel title="Edit society" description="Changes go live on the public society page immediately.">
          <form onSubmit={saveSociety} className="space-y-4 p-5">
            {formError ? <Alert tone="error">{formError}</Alert> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <FormField label="Name">
                <input className="field" value={form.name} onChange={(e) => setField("name", e.target.value)} required />
              </FormField>
              <FormField label="Tagline">
                <input className="field" maxLength={140} value={form.tagline} onChange={(e) => setField("tagline", e.target.value)} />
              </FormField>
              <FormField label="Description" className="sm:col-span-2">
                <textarea className="field min-h-[80px]" value={form.description} onChange={(e) => setField("description", e.target.value)} required />
              </FormField>
              <FormField label="Purpose" className="sm:col-span-2">
                <textarea className="field min-h-[56px]" value={form.purpose} onChange={(e) => setField("purpose", e.target.value)} />
              </FormField>
              <FormField label="Activities" className="sm:col-span-2" hint="One per line.">
                <textarea className="field min-h-[64px]" value={form.activities} onChange={(e) => setField("activities", e.target.value)} />
              </FormField>
              <FormField label="Category">
                <select className="field" value={form.category} onChange={(e) => setField("category", e.target.value)}>
                  {SOCIETY_CATEGORIES.map((option) => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </select>
              </FormField>
              <FormField label="Accent colour">
                <div className="flex items-center gap-2">
                  <input type="color" value={form.color} onChange={(e) => setField("color", e.target.value)} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
                  <input className="field" value={form.color} onChange={(e) => setField("color", e.target.value)} />
                </div>
              </FormField>
              <FormField label="Logo URL">
                <input className="field" value={form.logo} onChange={(e) => setField("logo", e.target.value)} />
              </FormField>
              <FormField label="Cover URL">
                <input className="field" value={form.cover} onChange={(e) => setField("cover", e.target.value)} />
              </FormField>
              <FormField label="Founded year">
                <input type="number" min="1900" max="2100" className="field" value={form.foundedYear} onChange={(e) => setField("foundedYear", e.target.value)} />
              </FormField>
              <FormField label="Contact email">
                <input type="email" className="field" value={form.email} onChange={(e) => setField("email", e.target.value)} />
              </FormField>
              <FormField label="Meeting schedule" className="sm:col-span-2">
                <input className="field" value={form.meetingSchedule} onChange={(e) => setField("meetingSchedule", e.target.value)} />
              </FormField>
            </div>
            <div className="grid gap-2 sm:grid-cols-2">
              <Toggle checked={form.featured} onChange={(value) => setField("featured", value)} label="Featured" description="Highlight publicly." />
              <Toggle checked={form.isActive} onChange={(value) => setField("isActive", value)} label="Active" description="Visible to students." />
            </div>
            <div className="flex justify-end">
              <button type="submit" className="btn btn-primary btn-sm" disabled={saving}>
                <Save size={13} /> {saving ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </Panel>

        <div className="space-y-5">
          <Panel
            title="Group rooms"
            description="Chat groups owned by this society."
            actions={
              <Link href="/admin/groups" className="btn btn-ghost btn-sm">
                All groups <ArrowUpRight size={12} />
              </Link>
            }
          >
            <div className="divide-y divide-line">
              {groupsApi.error ? (
                <div className="p-4">
                  <Alert tone="warning">{groupsApi.error}</Alert>
                </div>
              ) : groupsApi.loading ? (
                <p className="px-4 py-6 text-center text-[0.76rem] text-mist">Loading groups…</p>
              ) : groups.length === 0 ? (
                <p className="px-4 py-6 text-center text-[0.76rem] text-mist">No groups for this society.</p>
              ) : (
                groups.map((group) => (
                  <Link key={group.id} href={`/admin/groups/${group.id}`} className="flex items-center gap-3 px-4 py-3 transition hover:bg-lavender/30">
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg" style={{ backgroundColor: `${group.color || "#6d28d9"}1a`, color: group.color || "#6d28d9" }}>
                      <MessagesSquare size={14} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[0.8rem] font-semibold text-ink">{group.name}</p>
                      <p className="text-[0.66rem] text-mist">
                        {group.memberCount} member{group.memberCount === 1 ? "" : "s"} · {group.lastMessagePreview || "No messages"}
                      </p>
                    </div>
                    {group.isArchived ? <span className="badge badge-slate">Archived</span> : null}
                    <ArrowUpRight size={13} className="shrink-0 text-mist" />
                  </Link>
                ))
              )}
            </div>
          </Panel>

          <Panel title="Recruitments" description="Most recent recruitment rounds.">
            <div className="divide-y divide-line">
              {(society.recruitments || []).length === 0 ? (
                <p className="px-4 py-6 text-center text-[0.76rem] text-mist">No recruitments yet.</p>
              ) : (
                society.recruitments.map((recruitment) => (
                  <Link key={recruitment.id} href={`/admin/recruitment/${recruitment.id}`} className="flex items-center justify-between gap-2 px-4 py-3 transition hover:bg-lavender/30">
                    <div className="min-w-0">
                      <p className="truncate text-[0.8rem] font-semibold text-ink">{recruitment.title}</p>
                      <p className="text-[0.66rem] text-mist">
                        {recruitment.closesAt ? `Closes ${formatDate(recruitment.closesAt)}` : "No closing date"}
                      </p>
                    </div>
                    <StatusBadge status={recruitment.status} kind="recruitment" />
                  </Link>
                ))
              )}
            </div>
            <Link href="/admin/recruitment" className="btn btn-secondary btn-sm m-4 justify-center">
              <Plus size={13} /> Manage recruitment
            </Link>
          </Panel>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => (memberSaving ? null : setAddOpen(false))}
        title="Add society member"
        description="Only verified students can be added. Adding an existing member updates their role."
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddOpen(false)} disabled={memberSaving}>
              Cancel
            </button>
            <button type="submit" form="add-member-form" className="btn btn-primary btn-sm" disabled={memberSaving}>
              {memberSaving ? "Adding…" : "Add member"}
            </button>
          </>
        }
      >
        <form id="add-member-form" onSubmit={addMember} className="space-y-3">
          {memberError ? <Alert tone="error">{memberError}</Alert> : null}
          {studentsApi.error ? <Alert tone="warning">{studentsApi.error}</Alert> : null}
          <FormField label="Student">
            <select
              className="field"
              value={memberForm.userId}
              onChange={(e) => setMemberForm((current) => ({ ...current, userId: e.target.value }))}
              required
            >
              <option value="">Choose a verified student…</option>
              {availableStudents.map((student) => (
                <option key={student.id} value={student.id}>
                  {student.name} · {student.matricRollNumber || student.email}
                  {student.verificationStatus !== "verified" ? " (unverified)" : ""}
                </option>
              ))}
            </select>
            <span className="mt-1 block text-[0.7rem] text-mist">
              {availableStudents.length === 0
                ? "Every verified student is already a member."
                : "Existing members are hidden — change their role in the table instead."}
            </span>
          </FormField>
          <FormField label="Role">
            <select
              className="field"
              value={memberForm.role}
              onChange={(e) => setMemberForm((current) => ({ ...current, role: e.target.value }))}
            >
              {SOCIETY_ROLES.map((role) => (
                <option key={role} value={role}>{SOCIETY_ROLE_META[role]?.label || role}</option>
              ))}
            </select>
          </FormField>
          <FormField label="Responsibilities" hint="Optional — visible to admins only.">
            <textarea
              className="field min-h-[60px]"
              value={memberForm.responsibilities}
              onChange={(e) => setMemberForm((current) => ({ ...current, responsibilities: e.target.value }))}
            />
          </FormField>
          <FormField label="Phone">
            <input
              className="field"
              value={memberForm.phone}
              onChange={(e) => setMemberForm((current) => ({ ...current, phone: e.target.value }))}
              placeholder="03xx-xxxxxxx"
            />
          </FormField>
        </form>
      </Modal>

      <Modal
        open={Boolean(removeTarget)}
        onClose={() => (removing ? null : setRemoveTarget(null))}
        title="Remove member"
        description={removeTarget ? `${removeTarget.name} will lose their ${SOCIETY_ROLE_META[removeTarget.role]?.label || removeTarget.role} role.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setRemoveTarget(null)} disabled={removing}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={removeMember} disabled={removing}>
              {removing ? "Removing…" : "Remove member"}
            </button>
          </>
        }
      >
        <Alert tone="warning">The membership is marked removed, not deleted — the history stays for reporting.</Alert>
      </Modal>
    </div>
  );
}
