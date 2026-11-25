"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowUpRight,
  MessageCircle,
  MessagesSquare,
  Plus,
  RefreshCw,
  Users,
} from "lucide-react";
import {
  Alert,
  ChipTabs,
  ConsoleHeading,
  FilterSelect,
  FormField,
  Modal,
  Panel,
  SearchBox,
  StatTile,
  Toolbar,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { cn, initials, timeAgo } from "@/lib/utils";

const EMPTY_FORM = {
  societyId: "",
  name: "",
  description: "",
  color: "#7c3aed",
};

export default function AdminGroupsPage() {
  const { toast } = useToast();
  const [society, setSociety] = useState("");
  const [archived, setArchived] = useState("all");
  const [q, setQ] = useState("");

  const query = new URLSearchParams();
  if (society) query.set("society", society);
  if (archived !== "all") query.set("archived", archived);

  const { data, loading, error, reload } = useApi(`/api/groups?${query.toString()}`);
  const societiesApi = useApi("/api/societies");
  const studentsApi = useApi("/api/users?role=student&limit=100");

  const groups = data?.groups || [];
  const societies = societiesApi.data?.items || [];
  const students = studentsApi.data?.users || [];

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [memberIds, setMemberIds] = useState([]);
  const [moderatorIds, setModeratorIds] = useState([]);
  const [studentFilter, setStudentFilter] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [archiveTarget, setArchiveTarget] = useState(null);
  const [archiving, setArchiving] = useState(false);

  const visibleGroups = useMemo(() => {
    const needle = q.trim().toLowerCase();
    if (!needle) return groups;
    return groups.filter((group) =>
      [group.name, group.society?.name, group.description, group.lastMessagePreview]
        .join(" ")
        .toLowerCase()
        .includes(needle)
    );
  }, [groups, q]);

  const filteredStudents = useMemo(() => {
    const verified = students.filter((student) => student.verificationStatus === "verified");
    const needle = studentFilter.trim().toLowerCase();
    if (!needle) return verified;
    return verified.filter((student) =>
      [student.name, student.matricRollNumber, student.email].join(" ").toLowerCase().includes(needle)
    );
  }, [students, studentFilter]);

  const stats = useMemo(
    () => ({
      total: groups.length,
      members: groups.reduce((sum, group) => sum + (group.memberCount || 0), 0),
      archived: groups.filter((group) => group.isArchived).length,
      active: groups.filter((group) => !group.isArchived).length,
    }),
    [groups]
  );

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, societyId: societies[0]?.id || "" });
    setMemberIds([]);
    setModeratorIds([]);
    setStudentFilter("");
    setFormError("");
    setCreateOpen(true);
  };

  const toggleMember = (studentId) => {
    const selected = memberIds.includes(studentId);
    setMemberIds(selected ? memberIds.filter((value) => value !== studentId) : [...memberIds, studentId]);
    if (selected) setModeratorIds(moderatorIds.filter((value) => value !== studentId));
  };

  const toggleModerator = (studentId) => {
    if (!memberIds.includes(studentId)) {
      setMemberIds((current) => [...current, studentId]);
    }
    setModeratorIds((current) =>
      current.includes(studentId) ? current.filter((value) => value !== studentId) : [...current, studentId]
    );
  };

  const submitCreate = async (event) => {
    event.preventDefault();
    if (saving) return;
    setSaving(true);
    setFormError("");
    try {
      await fetchJson("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          societyId: form.societyId,
          name: form.name,
          description: form.description,
          color: form.color,
          memberIds,
          moderators: moderatorIds.filter((value) => memberIds.includes(value)),
        }),
      });
      toast(`${form.name.trim()} created.`, "success", "Group added");
      setCreateOpen(false);
      setForm(EMPTY_FORM);
      await reload();
    } catch (err) {
      setFormError(err.message || "Could not create the group.");
    } finally {
      setSaving(false);
    }
  };

  const toggleArchive = async (group) => {
    setBusyId(group.id);
    try {
      await fetchJson(`/api/groups/${group.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !group.isArchived }),
      });
      toast(`${group.name} ${group.isArchived ? "restored" : "archived"}.`, "success");
      setArchiveTarget(null);
      await reload();
    } catch (err) {
      toast(err.message || "Could not update the group.", "error");
    } finally {
      setBusyId("");
      setArchiving(false);
    }
  };

  return (
    <div className="space-y-5">
      <ConsoleHeading
        eyebrow="Community"
        title="Groups & chat"
        description="Society chat rooms with membership and moderator controls. Admins can read every room."
        actions={
          <>
            <button type="button" className="btn btn-secondary btn-sm" onClick={() => reload()} disabled={loading}>
              <RefreshCw size={13} className={loading ? "animate-spin" : ""} /> Refresh
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={openCreate}>
              <Plus size={14} /> New group
            </button>
          </>
        }
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatTile label="Groups" value={stats.total} icon="societies" hint="In this view" />
        <StatTile label="Active rooms" value={stats.active} icon="students" tone="emerald" hint="Open for chat" />
        <StatTile label="Archived" value={stats.archived} icon="files" tone="amber" hint="Read-only history" />
        <StatTile label="Members" value={stats.members} icon="registrations" tone="blue" hint="Across rooms" />
      </div>

      <Panel bodyClassName="">
        <Toolbar>
          <SearchBox value={q} onChange={setQ} placeholder="Search groups…" />
          <FilterSelect
            value={society}
            onChange={setSociety}
            placeholder="All societies"
            options={societies.map((item) => ({ value: item.id, label: item.name }))}
          />
          <ChipTabs
            className="sm:ml-auto"
            value={archived}
            onChange={setArchived}
            tabs={[
              { value: "all", label: "All" },
              { value: "false", label: "Active" },
              { value: "true", label: "Archived" },
            ]}
          />
        </Toolbar>

        {error ? (
          <div className="p-4">
            <Alert tone="error">{error}</Alert>
          </div>
        ) : loading ? (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="h-44 animate-pulse rounded-2xl bg-lavender/60" />
            ))}
          </div>
        ) : visibleGroups.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-5 py-14 text-center">
            <span className="grid h-11 w-11 place-items-center rounded-2xl bg-lavender text-purple">
              <MessagesSquare size={18} />
            </span>
            <p className="text-[0.84rem] font-medium text-ink">No groups found</p>
            <p className="max-w-sm text-[0.76rem] text-mist">
              {q || society ? "Try a different search or society filter." : "Create a chat room for a society team."}
            </p>
            <button type="button" className="btn btn-primary btn-sm mt-2" onClick={openCreate}>
              <Plus size={13} /> New group
            </button>
          </div>
        ) : (
          <div className="grid gap-3 p-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleGroups.map((group) => (
              <article key={group.id} className="flex flex-col rounded-2xl border border-line bg-white p-4 transition hover:border-violet-200">
                <div className="flex items-start gap-2.5">
                  <span
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-xl"
                    style={{ backgroundColor: `${group.color || "#6d28d9"}1a`, color: group.color || "#6d28d9" }}
                  >
                    <MessagesSquare size={17} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <Link href={`/admin/groups/${group.id}`} className="truncate text-[0.88rem] font-semibold text-ink hover:text-purple">
                        {group.name}
                      </Link>
                      {group.isArchived ? <span className="badge badge-slate shrink-0">Archived</span> : null}
                    </div>
                    <p className="mt-0.5 truncate text-[0.68rem] text-mist">{group.society?.name || "No society"}</p>
                  </div>
                </div>

                <p className="mt-2.5 line-clamp-2 min-h-[2rem] text-[0.73rem] leading-relaxed text-mist">
                  {group.description || "No description."}
                </p>

                <div className="mt-2 flex items-center gap-3 text-[0.68rem] text-mist">
                  <span className="inline-flex items-center gap-1">
                    <Users size={12} /> {group.memberCount} member{group.memberCount === 1 ? "" : "s"}
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <MessageCircle size={12} /> {group.lastMessageAt ? timeAgo(group.lastMessageAt) : "No messages"}
                  </span>
                </div>
                {group.lastMessagePreview ? (
                  <p className="mt-1.5 truncate rounded-lg bg-ivory px-2 py-1 text-[0.68rem] text-mist">{group.lastMessagePreview}</p>
                ) : null}

                <div className="mt-auto flex items-center gap-1.5 pt-3">
                  <Link href={`/admin/groups/${group.id}`} className="btn btn-secondary btn-sm flex-1 justify-center">
                    Open room <ArrowUpRight size={12} />
                  </Link>
                  <button
                    type="button"
                    className={cn("btn btn-sm", group.isArchived ? "btn-ghost" : "btn-ghost !text-rose-600")}
                    disabled={busyId === group.id}
                    onClick={() => {
                      if (group.isArchived) toggleArchive(group);
                      else setArchiveTarget(group);
                    }}
                  >
                    {busyId === group.id ? "…" : group.isArchived ? "Unarchive" : "Archive"}
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </Panel>

      <Modal
        open={createOpen}
        onClose={() => (saving ? null : setCreateOpen(false))}
        title="Create a group"
        description="Groups belong to a society. Add verified students and promote moderators."
        wide
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setCreateOpen(false)} disabled={saving}>
              Cancel
            </button>
            <button type="submit" form="group-form" className="btn btn-primary btn-sm" disabled={saving}>
              {saving ? "Creating…" : `Create group${memberIds.length ? ` · ${memberIds.length} member${memberIds.length === 1 ? "" : "s"}` : ""}`}
            </button>
          </>
        }
      >
        <form id="group-form" onSubmit={submitCreate} className="space-y-3">
          {formError ? <Alert tone="error">{formError}</Alert> : null}
          {societiesApi.error ? <Alert tone="warning">{societiesApi.error}</Alert> : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <FormField label="Society">
              <select className="field" value={form.societyId} onChange={(e) => setForm((c) => ({ ...c, societyId: e.target.value }))} required>
                <option value="">Choose a society…</option>
                {societies.map((item) => (
                  <option key={item.id} value={item.id}>{item.name}</option>
                ))}
              </select>
            </FormField>
            <FormField label="Group name">
              <input className="field" value={form.name} onChange={(e) => setForm((c) => ({ ...c, name: e.target.value }))} placeholder="e.g. Media team" required />
            </FormField>
            <FormField label="Description" className="sm:col-span-2">
              <textarea className="field min-h-[56px]" value={form.description} onChange={(e) => setForm((c) => ({ ...c, description: e.target.value }))} />
            </FormField>
            <FormField label="Colour">
              <div className="flex items-center gap-2">
                <input type="color" value={form.color} onChange={(e) => setForm((c) => ({ ...c, color: e.target.value }))} className="h-9 w-12 cursor-pointer rounded-lg border border-line bg-white p-1" />
                <input className="field" value={form.color} onChange={(e) => setForm((c) => ({ ...c, color: e.target.value }))} />
              </div>
            </FormField>
          </div>

          <div className="rounded-2xl border border-line bg-ivory/60 p-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <p className="text-[0.8rem] font-semibold text-ink">Members</p>
                <p className="text-[0.68rem] text-mist">{memberIds.length} selected · {moderatorIds.length} moderator{moderatorIds.length === 1 ? "" : "s"}</p>
              </div>
              <input
                className="field !w-auto !py-1.5 text-[0.74rem]"
                placeholder="Filter students…"
                value={studentFilter}
                onChange={(event) => setStudentFilter(event.target.value)}
              />
            </div>
            {studentsApi.error ? <Alert tone="warning">{studentsApi.error}</Alert> : null}
            <div className="mt-2 max-h-56 space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-1.5">
              {studentsApi.loading ? (
                <p className="px-2 py-4 text-center text-[0.72rem] text-mist">Loading students…</p>
              ) : filteredStudents.length === 0 ? (
                <p className="px-2 py-4 text-center text-[0.72rem] text-mist">No verified students found.</p>
              ) : (
                filteredStudents.map((student) => {
                  const selected = memberIds.includes(student.id);
                  const moderator = moderatorIds.includes(student.id);
                  return (
                    <div key={student.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-lavender/40">
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 accent-violet-600"
                        checked={selected}
                        onChange={() => toggleMember(student.id)}
                        aria-label={`Add ${student.name}`}
                      />
                      <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-lavender text-[0.58rem] font-bold text-purple">
                        {initials(student.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.74rem] font-medium text-ink">{student.name}</p>
                        <p className="truncate text-[0.62rem] text-mist">{student.matricRollNumber || student.email}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => toggleModerator(student.id)}
                        className={cn(
                          "rounded-full border px-2 py-0.5 text-[0.6rem] font-semibold transition",
                          moderator
                            ? "border-amber-200 bg-amber-50 text-amber-700"
                            : "border-line text-mist hover:border-violet-200 hover:text-purple"
                        )}
                      >
                        {moderator ? "Moderator" : "Make mod"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </form>
      </Modal>

      <Modal
        open={Boolean(archiveTarget)}
        onClose={() => (archiving ? null : setArchiveTarget(null))}
        title="Archive group"
        description={archiveTarget ? `${archiveTarget.name} becomes read-only. Members keep the history.` : ""}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArchiveTarget(null)} disabled={archiving}>
              Cancel
            </button>
            <button
              type="button"
              className="btn btn-danger btn-sm"
              disabled={archiving}
              onClick={() => {
                setArchiving(true);
                toggleArchive(archiveTarget);
              }}
            >
              {archiving ? "Archiving…" : "Archive group"}
            </button>
          </>
        }
      >
        <Alert tone="warning">Archived groups cannot receive new messages. You can unarchive at any time.</Alert>
      </Modal>
    </div>
  );
}
