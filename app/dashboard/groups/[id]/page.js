"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Loader2,
  Lock,
  MessagesSquare,
  Paperclip,
  Pin,
  Send,
  Shield,
  Users,
  X,
} from "lucide-react";
import { Alert, ConsoleHeading, Panel, Skeleton, fetchJson, useApi } from "@/components/layout/ui";
import { useToast } from "@/components/ui/Toast";
import { EmptyState, ErrorState, formatBytes } from "@/components/dashboard/common";
import { formatDate, formatDateTime, initials } from "@/lib/utils";

function Avatar({ person, size = "h-8 w-8 text-[0.62rem]" }) {
  return person?.avatar ? (
    <img src={person.avatar} alt="" className={`${size} shrink-0 rounded-full object-cover`} />
  ) : (
    <span className={`${size} grid shrink-0 place-items-center rounded-full bg-gradient-to-br from-violet-600 to-blue-600 font-bold text-white`}>
      {initials(person?.name || "?")}
    </span>
  );
}

export default function GroupChatPage() {
  const params = useParams();
  const groupId = params?.id;
  const { toast } = useToast();

  const { data: groupData, loading: groupLoading, error: groupError, reload: reloadGroup } = useApi(
    groupId ? `/api/groups/${groupId}` : null,
    { enabled: Boolean(groupId) }
  );
  const { data: meData } = useApi("/api/users/me");

  const [messages, setMessages] = useState([]);
  const [pinned, setPinned] = useState([]);
  const [msgLoading, setMsgLoading] = useState(true);
  const [msgError, setMsgError] = useState("");
  const [text, setText] = useState("");
  const [file, setFile] = useState(null);
  const [sending, setSending] = useState(false);
  const endRef = useRef(null);
  const fileRef = useRef(null);

  const me = meData?.user;
  const group = groupData?.group;
  const members = groupData?.members || [];
  const canPost = Boolean(groupData?.canPost) && !group?.isArchived;

  const loadMessages = useCallback(
    async ({ silent = false } = {}) => {
      if (!groupId) return;
      if (!silent) setMsgLoading(true);
      try {
        const json = await fetchJson(`/api/groups/${groupId}/messages?limit=60`);
        setMessages(json.messages || []);
        setPinned(json.pinned || []);
        setMsgError("");
      } catch (error) {
        if (!silent) setMsgError(error.message || "Could not load messages.");
      } finally {
        if (!silent) setMsgLoading(false);
      }
    },
    [groupId]
  );

  useEffect(() => {
    loadMessages();
    const timer = setInterval(() => {
      if (document.visibilityState === "visible") loadMessages({ silent: true });
    }, 8000);
    return () => clearInterval(timer);
  }, [loadMessages]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: "end" });
  }, [messages.length]);

  const sortedMembers = useMemo(
    () => [...members].sort((a, b) => (a.role === "moderator" ? -1 : b.role === "moderator" ? 1 : a.name.localeCompare(b.name))),
    [members]
  );

  const send = async (event) => {
    event.preventDefault();
    const body = text.trim();
    if (!body && !file) return;
    if (!canPost) {
      toast("This group is read-only.", "error");
      return;
    }
    setSending(true);
    try {
      let attachmentIds = [];
      if (file) {
        const form = new FormData();
        form.append("file", file);
        form.append("kind", "other");
        const uploaded = await fetchJson("/api/uploads", { method: "POST", body: form });
        attachmentIds = [uploaded.item.id];
      }
      await fetchJson(`/api/groups/${groupId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ body, attachmentIds }),
      });
      setText("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
      await loadMessages({ silent: true });
    } catch (error) {
      toast(error.message || "Could not send your message.", "error");
    } finally {
      setSending(false);
    }
  };

  if (groupLoading) {
    return (
      <div className="space-y-5">
        <Skeleton className="h-9 w-64" />
        <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
          <Skeleton className="h-[520px]" />
          <Skeleton className="h-[420px]" />
        </div>
      </div>
    );
  }

  if (groupError || !groupData || !group) {
    return (
      <Panel>
        <ErrorState message={groupError || "Group not found."} onRetry={reloadGroup} />
        <div className="pb-6 text-center">
          <Link href="/dashboard/groups" className="btn btn-ghost btn-sm">
            <ArrowLeft size={13} /> Back to groups
          </Link>
        </div>
      </Panel>
    );
  }

  return (
    <>
      <div className="mb-3">
        <Link href="/dashboard/groups" className="inline-flex items-center gap-1.5 text-[0.74rem] font-medium text-purple hover:text-blue">
          <ArrowLeft size={13} /> All groups
        </Link>
      </div>

      <ConsoleHeading
        eyebrow={groupData.society?.name || "Society group"}
        title={group.name}
        description={group.description || "Team conversation for your society."}
        actions={
          <>
            {group.isArchived ? <span className="badge badge-slate"><Lock size={11} /> Archived</span> : null}
            <span className="chip">
              <Users size={12} /> {group.memberCount} members
            </span>
          </>
        }
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_300px]">
        <Panel bodyClassName="flex h-[560px] flex-col overflow-hidden">
          {!canPost ? (
            <div className="border-b border-amber-200 bg-amber-50 px-4 py-2.5 text-[0.74rem] text-amber-700">
              {group.isArchived
                ? "This group is archived — the conversation is read-only."
                : "You can read this conversation but only members can post."}
            </div>
          ) : null}

          {pinned.length ? (
            <div className="flex items-start gap-2 border-b border-line bg-lavender/50 px-4 py-2 text-[0.72rem] text-ink-2">
              <Pin size={13} className="mt-0.5 shrink-0 text-purple" />
              <p className="line-clamp-2">
                <span className="font-semibold text-purple">Pinned: </span>
                {pinned[0].body || pinned[0].attachments?.[0]?.name || "Attachment"}
              </p>
            </div>
          ) : null}

          <div className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {msgLoading ? (
              <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, index) => (
                  <Skeleton key={index} className={`h-14 ${index % 2 ? "ml-auto w-2/3" : "w-3/4"}`} />
                ))}
              </div>
            ) : msgError ? (
              <ErrorState message={msgError} onRetry={loadMessages} />
            ) : messages.length === 0 ? (
              <EmptyState
                icon={MessagesSquare}
                title="Start the conversation"
                description="No messages yet. Send the first update to your team."
                className="py-10"
              />
            ) : (
              messages.map((message) => {
                const own = message.sender?.id === me?.id;
                return (
                  <div key={message.id} className={`flex items-end gap-2.5 ${own ? "flex-row-reverse" : ""}`}>
                    <Avatar person={message.sender} />
                    <div className={`max-w-[78%] ${own ? "items-end text-right" : ""}`}>
                      <div className={`mb-1 flex items-center gap-2 text-[0.64rem] text-mist ${own ? "justify-end" : ""}`}>
                        <span className="font-semibold text-ink-2">{own ? "You" : message.sender?.name || "Member"}</span>
                        <span>{formatDateTime(message.createdAt)}</span>
                      </div>
                      <div
                        className={`rounded-2xl px-3.5 py-2.5 text-left text-[0.82rem] leading-relaxed shadow-sm ${
                          message.isAnnouncement
                            ? "border border-amber-200 bg-amber-50 text-amber-800"
                            : own
                              ? "bg-gradient-to-br from-violet-600 to-blue-600 text-white"
                              : "border border-line bg-lavender text-ink-2"
                        }`}
                      >
                        {message.isAnnouncement ? <p className="mb-1 text-[0.62rem] font-bold uppercase tracking-[0.12em]">Announcement</p> : null}
                        {message.body ? <p className="whitespace-pre-wrap">{message.body}</p> : null}
                        {message.attachments?.length ? (
                          <div className="mt-2 space-y-1.5">
                            {message.attachments.map((attachment) => (
                              <a
                                key={attachment.id}
                                href={`/api/files/${attachment.id}/download`}
                                target="_blank"
                                rel="noreferrer"
                                className={`flex items-center gap-2 rounded-lg px-2 py-1.5 text-[0.72rem] ${
                                  own ? "bg-white/15 text-white hover:bg-white/25" : "bg-white text-ink-2 hover:bg-white/70"
                                }`}
                              >
                                <FileText size={13} />
                                <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                                <span className="opacity-70">{formatBytes(attachment.size)}</span>
                              </a>
                            ))}
                          </div>
                        ) : null}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
            <div ref={endRef} />
          </div>

          {canPost ? (
            <form onSubmit={send} className="border-t border-line bg-ivory/50 p-3">
              {file ? (
                <div className="mb-2 flex items-center gap-2 rounded-lg border border-line bg-white px-2.5 py-1.5 text-[0.72rem]">
                  <FileText size={13} className="text-purple" />
                  <span className="min-w-0 flex-1 truncate text-ink-2">{file.name}</span>
                  <span className="text-mist">{formatBytes(file.size)}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      if (fileRef.current) fileRef.current.value = "";
                    }}
                    className="rounded p-0.5 text-mist hover:text-rose-600"
                    aria-label="Remove attachment"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : null}
              <div className="flex items-end gap-2">
                <label className="grid h-9 w-9 shrink-0 cursor-pointer place-items-center rounded-full border border-line bg-white text-mist transition hover:border-violet-200 hover:text-purple" aria-label="Attach a file">
                  <Paperclip size={15} />
                  <input
                    ref={fileRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.doc,.docx,.png,.jpg,.jpeg,.webp,.txt"
                    onChange={(event) => setFile(event.target.files?.[0] || null)}
                  />
                </label>
                <textarea
                  value={text}
                  onChange={(event) => setText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      send(event);
                    }
                  }}
                  rows={1}
                  placeholder="Write a message… (Enter to send)"
                  className="field max-h-32 min-h-[2.5rem] flex-1 resize-none !py-2 text-[0.82rem]"
                />
                <button type="submit" className="btn btn-primary btn-sm h-10" disabled={sending || (!text.trim() && !file)}>
                  {sending ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />}
                  Send
                </button>
              </div>
            </form>
          ) : (
            <div className="border-t border-line bg-ivory/60 px-4 py-3 text-[0.74rem] text-mist">
              <Lock size={12} className="mr-1.5 inline" /> Posting is disabled for this group.
            </div>
          )}
        </Panel>

        <div className="space-y-5">
          <Panel title={`Members (${sortedMembers.length})`}>
            <ul className="max-h-80 divide-y divide-line overflow-y-auto">
              {sortedMembers.map((member) => (
                <li key={member.id} className="flex items-center gap-2.5 px-4 py-2.5">
                  <Avatar person={member} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[0.78rem] font-medium text-ink">
                      {member.name}
                      {member.id === me?.id ? <span className="ml-1 text-[0.64rem] font-normal text-mist">(you)</span> : null}
                    </p>
                  </div>
                  {member.role === "moderator" ? (
                    <span className="badge badge-violet"><Shield size={10} /> Moderator</span>
                  ) : (
                    <span className="badge badge-slate">Member</span>
                  )}
                </li>
              ))}
            </ul>
          </Panel>

          <Panel title="Group details">
            <dl className="space-y-2.5 p-4 text-[0.76rem]">
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Society</dt>
                <dd className="truncate font-medium text-ink">{groupData.society?.name || "—"}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Created</dt>
                <dd className="font-medium text-ink">{formatDate(group.createdAt)}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Messages</dt>
                <dd className="font-medium text-ink">{messages.length} loaded</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-mist">Status</dt>
                <dd>{group.isArchived ? <span className="badge badge-slate">Archived</span> : <span className="badge badge-emerald">Active</span>}</dd>
              </div>
            </dl>
          </Panel>

          <Alert tone="info">Messages refresh automatically every 8 seconds while this page is open.</Alert>
        </div>
      </div>
    </>
  );
}
