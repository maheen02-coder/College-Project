"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  Archive,
  Download,
  Lock,
  Megaphone,
  MessagesSquare,
  Paperclip,
  Pin,
  RefreshCw,
  Send,
  Shield,
  ShieldOff,
  Trash2,
  UserPlus,
} from "lucide-react";
import {
  Alert,
  ConsoleHeading,
  FormField,
  Modal,
  Panel,
  Skeleton,
  fetchJson,
  useApi,
} from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { cn, formatDateTime, initials, timeAgo } from "@/lib/utils";

export default function AdminGroupRoomPage() {
  const params = useParams();
  const id = params?.id;
  const { toast } = useToast();

  const groupApi = useApi(id ? `/api/groups/${id}` : null);
  const messagesApi = useApi(id ? `/api/groups/${id}/messages?limit=60` : null);
  const meApi = useApi("/api/auth/me");
  const studentsApi = useApi("/api/users?role=student&limit=100");

  const group = groupApi.data?.group;
  const society = groupApi.data?.society;
  const members = groupApi.data?.members || [];
  const moderators = groupApi.data?.moderators || [];
  const messages = messagesApi.data?.messages || [];
  const pinned = messagesApi.data?.pinned || [];
  const me = meApi.data?.user;
  const archived = Boolean(group?.isArchived);
  const canPost = Boolean(groupApi.data?.canPost);

  const [draft, setDraft] = useState("");
  const [announcement, setAnnouncement] = useState(false);
  const [sending, setSending] = useState(false);

  const [addOpen, setAddOpen] = useState(false);
  const [addIds, setAddIds] = useState([]);
  const [addSaving, setAddSaving] = useState(false);
  const [addError, setAddError] = useState("");

  const [busyMemberId, setBusyMemberId] = useState("");
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiving, setArchiving] = useState(false);
  const [joining, setJoining] = useState(false);

  const scroller = useRef(null);

  useEffect(() => {
    if (!id) return;
    const timer = setInterval(async () => {
      try {
        const json = await fetchJson(`/api/groups/${id}/messages?limit=60`);
        messagesApi.setData(json);
      } catch {
        /* polling silently fails */
      }
    }, 10000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  useEffect(() => {
    const node = scroller.current;
    if (node) node.scrollTop = node.scrollHeight;
  }, [messages.length]);

  const availableStudents = useMemo(
    () =>
      (studentsApi.data?.users || []).filter(
        (student) =>
          student.verificationStatus === "verified" && !members.some((member) => member.id === student.id)
      ),
    [studentsApi.data, members]
  );

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim() || sending) return;
    setSending(true);
    try {
      await fetchJson(`/api/groups/${id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body: draft.trim(), isAnnouncement: announcement }),
      });
      setDraft("");
      setAnnouncement(false);
      await Promise.all([messagesApi.reload(), groupApi.reload()]);
    } catch (err) {
      toast(err.message || "Could not send the message.", "error");
    } finally {
      setSending(false);
    }
  };

  const joinGroup = async () => {
    if (!me?.id) return;
    setJoining(true);
    try {
      await fetchJson(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: [me.id] }),
      });
      toast("You joined the group and can now post.", "success");
      await groupApi.reload();
    } catch (err) {
      toast(err.message || "Could not join this group.", "error");
    } finally {
      setJoining(false);
    }
  };

  const toggleModerator = async (member) => {
    const isModerator = moderators.includes(member.id);
    const nextModerators = isModerator
      ? moderators.filter((value) => value !== member.id)
      : [...moderators, member.id];
    setBusyMemberId(member.id);
    try {
      await fetchJson(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ moderators: nextModerators }),
      });
      toast(`${member.name} ${isModerator ? "is no longer a moderator" : "is now a moderator"}.`, "success");
      await groupApi.reload();
    } catch (err) {
      toast(err.message || "Could not update moderators.", "error");
    } finally {
      setBusyMemberId("");
    }
  };

  const removeMember = async (member) => {
    setBusyMemberId(member.id);
    try {
      await fetchJson(`/api/groups/${id}/members`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: member.id }),
      });
      toast(`${member.name} removed from the group.`, "success");
      await groupApi.reload();
    } catch (err) {
      toast(err.message || "Could not remove the member.", "error");
    } finally {
      setBusyMemberId("");
    }
  };

  const addMembers = async () => {
    if (!addIds.length || addSaving) return;
    setAddSaving(true);
    setAddError("");
    try {
      const result = await fetchJson(`/api/groups/${id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: addIds }),
      });
      toast(`${result.added ?? addIds.length} member${(result.added ?? addIds.length) === 1 ? "" : "s"} added.`, "success");
      setAddOpen(false);
      setAddIds([]);
      await groupApi.reload();
    } catch (err) {
      setAddError(err.message || "Could not add members.");
    } finally {
      setAddSaving(false);
    }
  };

  const toggleArchive = async () => {
    setArchiving(true);
    try {
      await fetchJson(`/api/groups/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isArchived: !archived }),
      });
      toast(archived ? "Group restored." : "Group archived.", "success");
      setArchiveOpen(false);
      await groupApi.reload();
    } catch (err) {
      toast(err.message || "Could not update the group.", "error");
    } finally {
      setArchiving(false);
    }
  };

  if (groupApi.loading && !group) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-9 w-52" />
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  if (groupApi.error || !group) {
    return (
      <div className="space-y-4">
        <ConsoleHeading eyebrow="Groups" title="Group room" description="Could not load this group." />
        <Alert tone="error">{groupApi.error || "Group not found."}</Alert>
        <Link href="/admin/groups" className="btn btn-secondary btn-sm">
          <ArrowLeft size={13} /> Back to groups
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2">
        <Link href="/admin/groups" className="btn btn-ghost btn-sm">
          <ArrowLeft size={13} /> Groups
        </Link>
        <span className="text-mist">/</span>
        <span className="truncate text-[0.78rem] font-medium text-ink">{group.name}</span>
      </div>

      <ConsoleHeading
        eyebrow={society?.name || "Society group"}
        title={group.name}
        description={group.description || "Group chat room with membership controls."}
        actions={
          <>
            {archived ? <span className="badge badge-slate">Archived</span> : <span className="badge badge-emerald">Active</span>}
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              onClick={() => Promise.all([groupApi.reload(), messagesApi.reload()])}
            >
              <RefreshCw size={13} /> Refresh
            </button>
            {archived ? (
              <button type="button" className="btn btn-secondary btn-sm" onClick={toggleArchive} disabled={archiving}>
                <Archive size={13} /> {archiving ? "Restoring…" : "Unarchive"}
              </button>
            ) : (
              <button type="button" className="btn btn-danger btn-sm" onClick={() => setArchiveOpen(true)}>
                <Archive size={13} /> Archive
              </button>
            )}
          </>
        }
      />

      {society ? (
        <div className="flex flex-wrap items-center gap-2 text-[0.74rem] text-mist">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2 w-2 rounded-full" style={{ backgroundColor: society.color || "#6d28d9" }} />
            {society.name}
          </span>
          <span>·</span>
          <span>{group.memberCount} member{group.memberCount === 1 ? "" : "s"}</span>
          <span>·</span>
          <span>{group.lastMessageAt ? `Last activity ${timeAgo(group.lastMessageAt)}` : "No messages yet"}</span>
          {society.id ? (
            <Link href={`/admin/societies/${society.id}`} className="ml-auto text-[0.74rem] font-semibold text-purple hover:underline">
              Manage society
            </Link>
          ) : null}
        </div>
      ) : null}

      <div className="grid gap-5 xl:grid-cols-[1.65fr_1fr]">
        <Panel
          title="Room"
          description="Messages update every 10 seconds."
          bodyClassName="flex flex-col"
          actions={pinned.length ? <span className="badge badge-violet"><Pin size={10} /> {pinned.length} pinned</span> : null}
        >
          {pinned.length ? (
            <div className="border-b border-line bg-lilac/50 px-4 py-2.5">
              <p className="flex items-center gap-1.5 text-[0.64rem] font-semibold uppercase tracking-[0.1em] text-purple">
                <Pin size={11} /> Pinned
              </p>
              <p className="mt-1 line-clamp-2 text-[0.74rem] text-ink">{pinned[pinned.length - 1]?.body}</p>
            </div>
          ) : null}

          <div ref={scroller} className="max-h-[460px] min-h-[280px] space-y-3 overflow-y-auto bg-ivory/40 px-4 py-4">
            {messagesApi.error ? (
              <Alert tone="error">{messagesApi.error}</Alert>
            ) : messagesApi.loading && messages.length === 0 ? (
              <p className="py-10 text-center text-[0.78rem] text-mist">Loading messages…</p>
            ) : messages.length === 0 ? (
              <div className="flex flex-col items-center gap-2 py-12 text-center">
                <span className="grid h-10 w-10 place-items-center rounded-xl bg-lavender text-purple">
                  <MessagesSquare size={17} />
                </span>
                <p className="text-[0.8rem] font-medium text-ink">No messages yet</p>
                <p className="text-[0.72rem] text-mist">Start the conversation below.</p>
              </div>
            ) : (
              messages.map((message) => {
                const mine = message.sender?.id && me?.id && message.sender.id === me.id;
                return (
                  <div key={message.id} className={cn("flex items-start gap-2.5", mine && "flex-row-reverse")}>
                    <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lavender text-[0.6rem] font-bold text-purple">
                      {initials(message.sender?.name || "")}
                    </span>
                    <div className={cn("max-w-[78%] rounded-2xl border px-3 py-2", mine ? "border-violet-200 bg-lilac" : "border-line bg-white")}>
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="text-[0.7rem] font-semibold text-ink">{mine ? "You" : message.sender?.name || "Member"}</span>
                        <span className="text-[0.62rem] text-mist">{formatDateTime(message.createdAt)}</span>
                        {message.isAnnouncement ? (
                          <span className="badge badge-amber"><Megaphone size={9} /> Announcement</span>
                        ) : null}
                      </div>
                      {message.body ? (
                        <p className="mt-1 whitespace-pre-wrap text-[0.78rem] leading-relaxed text-ink">{message.body}</p>
                      ) : null}
                      {message.attachments?.length ? (
                        <div className="mt-1.5 space-y-1">
                          {message.attachments.map((file) => (
                            <a
                              key={file.id}
                              href={`/api/files/${file.id}/download`}
                              target="_blank"
                              rel="noreferrer"
                              className="flex items-center gap-1.5 rounded-lg border border-line bg-white px-2 py-1 text-[0.68rem] text-purple hover:underline"
                            >
                              <Paperclip size={11} /> {file.name} <Download size={10} />
                            </a>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          <div className="border-t border-line p-3.5">
            {archived ? (
              <Alert tone="warning">
                <span className="inline-flex items-center gap-1.5"><Lock size={13} /> This group is archived. Unarchive it to post again.</span>
              </Alert>
            ) : !canPost ? (
              <div className="space-y-2">
                <Alert tone="info">
                  Only group members can post. Admins can join to participate in this room.
                </Alert>
                <button type="button" className="btn btn-secondary btn-sm" onClick={joinGroup} disabled={joining || !me?.id}>
                  <UserPlus size={13} /> {joining ? "Joining…" : "Join group to post"}
                </button>
              </div>
            ) : (
              <form onSubmit={sendMessage} className="space-y-2">
                <textarea
                  className="field min-h-[64px]"
                  value={draft}
                  onChange={(event) => setDraft(event.target.value)}
                  placeholder={`Message ${group.name}…`}
                  maxLength={4000}
                />
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label className="inline-flex items-center gap-1.5 text-[0.72rem] text-mist">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-violet-600"
                      checked={announcement}
                      onChange={(event) => setAnnouncement(event.target.checked)}
                    />
                    <Megaphone size={12} /> Post as announcement
                  </label>
                  <button type="submit" className="btn btn-primary btn-sm" disabled={sending || !draft.trim()}>
                    <Send size={13} /> {sending ? "Sending…" : "Send message"}
                  </button>
                </div>
              </form>
            )}
          </div>
        </Panel>

        <div className="space-y-5">
          <Panel
            title={`Members (${members.length})`}
            description="Moderators can post announcements and manage the room."
            actions={
              <button type="button" className="btn btn-primary btn-sm" onClick={() => { setAddIds([]); setAddError(""); setAddOpen(true); }}>
                <UserPlus size={13} /> Add
              </button>
            }
          >
            <div className="max-h-[420px] divide-y divide-line overflow-y-auto">
              {members.length === 0 ? (
                <p className="px-4 py-8 text-center text-[0.76rem] text-mist">No members in this group yet.</p>
              ) : (
                members.map((member) => {
                  const isModerator = moderators.includes(member.id) || member.role === "moderator";
                  return (
                    <div key={member.id} className="flex items-center gap-2.5 px-4 py-2.5">
                      <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lavender text-[0.6rem] font-bold text-purple">
                        {initials(member.name)}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-[0.78rem] font-medium text-ink">{member.name}</p>
                        <span className={cn("badge mt-0.5", isModerator ? "badge-amber" : "badge-slate")}>
                          {isModerator ? "Moderator" : "Member"}
                        </span>
                      </div>
                      <div className="flex shrink-0 items-center gap-1">
                        <button
                          type="button"
                          className={cn("grid h-7 w-7 place-items-center rounded-lg border border-line transition", isModerator ? "text-amber-600 hover:bg-amber-50" : "text-mist hover:text-purple")}
                          onClick={() => toggleModerator(member)}
                          disabled={busyMemberId === member.id}
                          title={isModerator ? "Remove moderator" : "Make moderator"}
                        >
                          {isModerator ? <ShieldOff size={13} /> : <Shield size={13} />}
                        </button>
                        <button
                          type="button"
                          className="grid h-7 w-7 place-items-center rounded-lg border border-line text-mist transition hover:border-rose-200 hover:text-rose-600"
                          onClick={() => removeMember(member)}
                          disabled={busyMemberId === member.id}
                          title={`Remove ${member.name}`}
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Panel>

          <Panel title="Room summary">
            <div className="grid grid-cols-2 gap-px bg-line">
              <div className="bg-white px-4 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mist">Members</p>
                <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">{members.length}</p>
              </div>
              <div className="bg-white px-4 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mist">Moderators</p>
                <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">{moderators.length}</p>
              </div>
              <div className="bg-white px-4 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mist">Messages</p>
                <p className="mt-0.5 text-[0.9rem] font-semibold text-ink">{messages.length}</p>
              </div>
              <div className="bg-white px-4 py-3">
                <p className="text-[0.6rem] font-semibold uppercase tracking-[0.1em] text-mist">Created</p>
                <p className="mt-0.5 text-[0.78rem] font-semibold text-ink">{formatDateTime(group.createdAt)}</p>
              </div>
            </div>
          </Panel>
        </div>
      </div>

      <Modal
        open={addOpen}
        onClose={() => (addSaving ? null : setAddOpen(false))}
        title="Add members"
        description="Only verified students can join a group."
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setAddOpen(false)} disabled={addSaving}>
              Cancel
            </button>
            <button type="button" className="btn btn-primary btn-sm" onClick={addMembers} disabled={addSaving || !addIds.length}>
              {addSaving ? "Adding…" : `Add ${addIds.length || ""}`.trim()}
            </button>
          </>
        }
      >
        <div className="space-y-2">
          {addError ? <Alert tone="error">{addError}</Alert> : null}
          {studentsApi.error ? <Alert tone="warning">{studentsApi.error}</Alert> : null}
          <FormField label="Students">
            <div className="max-h-64 space-y-1 overflow-y-auto rounded-xl border border-line bg-white p-1.5">
              {studentsApi.loading ? (
                <p className="px-2 py-4 text-center text-[0.72rem] text-mist">Loading students…</p>
              ) : availableStudents.length === 0 ? (
                <p className="px-2 py-4 text-center text-[0.72rem] text-mist">Every verified student is already in this group.</p>
              ) : (
                availableStudents.map((student) => (
                  <label key={student.id} className="flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.76rem] text-ink hover:bg-lavender/40">
                    <input
                      type="checkbox"
                      className="h-3.5 w-3.5 accent-violet-600"
                      checked={addIds.includes(student.id)}
                      onChange={() =>
                        setAddIds((current) =>
                          current.includes(student.id)
                            ? current.filter((value) => value !== student.id)
                            : [...current, student.id]
                        )
                      }
                    />
                    <span className="min-w-0 flex-1 truncate">{student.name}</span>
                    <span className="truncate text-[0.64rem] text-mist">{student.matricRollNumber || student.email}</span>
                  </label>
                ))
              )}
            </div>
          </FormField>
        </div>
      </Modal>

      <Modal
        open={archiveOpen}
        onClose={() => (archiving ? null : setArchiveOpen(false))}
        title="Archive group"
        description={`${group.name} becomes read-only for all members.`}
        footer={
          <>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => setArchiveOpen(false)} disabled={archiving}>
              Cancel
            </button>
            <button type="button" className="btn btn-danger btn-sm" onClick={toggleArchive} disabled={archiving}>
              {archiving ? "Archiving…" : "Archive group"}
            </button>
          </>
        }
      >
        <Alert tone="warning">No new messages can be posted. Unarchive anytime from this page.</Alert>
      </Modal>
    </div>
  );
}
