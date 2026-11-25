import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { truncate } from "@/lib/utils";
import Group from "@/lib/models/Group";
import GroupMember from "@/lib/models/GroupMember";
import Message from "@/lib/models/Message";
import UploadedFile from "@/lib/models/UploadedFile";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function serializeMessage(message) {
  const senderPopulated = typeof message.sender?.name === "string";
  return {
    id: String(message._id),
    body: message.body || "",
    sender: senderPopulated
      ? {
          id: String(message.sender._id),
          name: message.sender.name,
          avatar: message.sender.avatar || "",
        }
      : {
          id: message.sender ? String(message.sender) : "",
          name: message.senderName || "Unknown",
          avatar: "",
        },
    senderName: message.senderName || (senderPopulated ? message.sender.name : ""),
    attachments: (message.attachments || [])
      .filter((file) => file && typeof file.name === "string")
      .map((file) => ({
        id: String(file._id),
        name: file.name,
        mimeType: file.mimeType || "application/octet-stream",
        size: file.size || 0,
      })),
    replyTo:
      message.replyTo && typeof message.replyTo.body === "string"
        ? {
            id: String(message.replyTo._id),
            body: message.replyTo.body,
            senderName: message.replyTo.senderName || "",
          }
        : null,
    pinned: Boolean(message.pinned),
    isAnnouncement: Boolean(message.isAnnouncement),
    createdAt: iso(message.createdAt),
  };
}

async function populateMessage(query) {
  return query
    .populate("sender", "name avatar")
    .populate("attachments", "name mimeType size")
    .populate("replyTo", "body senderName")
    .lean();
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!group) return fail("Group not found.", 404);

  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  const member = Boolean(membership) || (group.memberIds || []).some(
    (value) => String(value) === String(user.id)
  );
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_groups");
  if (!member && !adminAccess) return fail("You are not a member of this group.", 403);

  const { searchParams } = new URL(request.url);
  const after = searchParams.get("after") || "";
  const rawLimit = Number(searchParams.get("limit"));
  const limit = Math.min(
    Math.max(Number.isFinite(rawLimit) && rawLimit > 0 ? Math.floor(rawLimit) : 40, 1),
    80
  );

  let afterDate = null;
  if (after) {
    if (mongoose.isValidObjectId(after)) {
      const cursor = await Message.findOne({ _id: after, group: group._id })
        .select("createdAt")
        .lean();
      if (cursor) afterDate = cursor.createdAt;
    } else {
      const parsedDate = new Date(after);
      if (!Number.isNaN(parsedDate.getTime())) afterDate = parsedDate;
    }
    if (!afterDate) return fail("Invalid message cursor.", 422);
  }

  const query = { institute: group.institute, group: group._id };
  if (afterDate) query.createdAt = { $gt: afterDate };

  const rows = await populateMessage(Message.find(query).sort({ createdAt: -1 }).limit(limit));
  rows.reverse();

  const pinnedRows = await populateMessage(
    Message.find({ group: group._id, pinned: true }).sort({ createdAt: -1 }).limit(20)
  );

  let unread = null;
  if (!after && member) {
    const now = new Date();
    const role = (group.moderators || []).some((value) => String(value) === String(user.id))
      ? "moderator"
      : "member";
    await GroupMember.updateOne(
      { group: group._id, user: user.id },
      {
        $set: { lastReadAt: now },
        $setOnInsert: { institute: group.institute, role },
      },
      { upsert: true }
    );
    unread = 0;
  }

  return ok({
    messages: rows.map(serializeMessage),
    pinned: pinnedRows.map(serializeMessage),
    ...(unread === null ? {} : { unread }),
  });
}

const sendSchema = z.object({
  body: z.string().trim().max(4000).optional().default(""),
  attachmentIds: z.array(z.string()).optional().default([]),
  replyToId: z.string().optional().default(""),
  isAnnouncement: z.boolean().optional().default(false),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  const payload = await readJson(request);
  const parsed = sendSchema.safeParse(payload);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!data.body && !data.attachmentIds.length) {
    return fail("Write a message or attach a file.", 422);
  }

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId });
  if (!group) return fail("Group not found.", 404);

  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  const member = Boolean(membership) || (group.memberIds || []).some(
    (value) => String(value) === String(user.id)
  );
  if (!member) return fail("You must be a member of this group to post.", 403);
  if (group.isArchived) return fail("This group is archived.", 409);

  const attachmentIds = [...new Set(data.attachmentIds.map(String))];
  if (!attachmentIds.every((value) => mongoose.isValidObjectId(value))) {
    return fail("One or more attachments are invalid.", 422);
  }
  if (attachmentIds.length) {
    const files = await UploadedFile.find({
      _id: { $in: attachmentIds },
      user: user.id,
      institute: user.instituteId,
    })
      .select("_id")
      .lean();
    if (files.length !== attachmentIds.length) {
      return fail("Attachments must be files you uploaded.", 403);
    }
  }

  const isModerator =
    (group.moderators || []).some((value) => String(value) === String(user.id)) ||
    membership?.role === "moderator";
  const canAnnounce =
    isModerator || (isAdmin(user) && hasAdminPermission(user, "manage_groups"));
  if (data.isAnnouncement && !canAnnounce) {
    return fail("Only moderators can post announcements.", 403);
  }

  let replyToId;
  if (data.replyToId) {
    if (!mongoose.isValidObjectId(data.replyToId)) {
      return fail("Invalid reply target.", 422);
    }
    const reply = await Message.findOne({ _id: data.replyToId, group: group._id })
      .select("_id")
      .lean();
    if (!reply) return fail("The message you are replying to was not found.", 404);
    replyToId = reply._id;
  }

  const message = await Message.create({
    institute: group.institute,
    group: group._id,
    sender: user.id,
    senderName: user.name,
    body: data.body,
    attachments: attachmentIds,
    replyTo: replyToId,
    isAnnouncement: data.isAnnouncement,
  });

  const preview = truncate(data.body || "Attachment", 120);
  await Group.updateOne(
    { _id: group._id },
    { $set: { lastMessageAt: new Date(), lastMessagePreview: preview } }
  );

  const memberRows = await GroupMember.find({ group: group._id }).select("user").lean();
  const recipients = [
    ...new Set([
      ...(group.memberIds || []).map(String),
      ...memberRows.map((row) => String(row.user)),
    ]),
  ].filter((value) => value !== String(user.id));
  if (recipients.length) {
    await notifyMany(
      recipients.map((userId) => ({
        institute: group.institute,
        user: userId,
        type: "group",
        title: `New message in ${group.name}`,
        message: preview,
        link: `/dashboard/groups?group=${group._id}`,
      }))
    );
  }

  const created = await populateMessage(Message.findById(message._id));

  return ok({ message: serializeMessage(created) }, { status: 201 });
}

const pinSchema = z.object({
  messageId: z.string().min(1, "Select a message."),
  pinned: z.boolean(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  const payload = await readJson(request);
  const parsed = pinSchema.safeParse(payload);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  if (!mongoose.isValidObjectId(parsed.data.messageId)) {
    return fail("Invalid message.", 422);
  }

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!group) return fail("Group not found.", 404);

  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  const isModerator =
    (group.moderators || []).some((value) => String(value) === String(user.id)) ||
    membership?.role === "moderator";
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_groups");
  if (!adminAccess && !isModerator) {
    return fail("Only group moderators can pin messages.", 403);
  }

  const updated = await Message.findOneAndUpdate(
    { _id: parsed.data.messageId, group: group._id },
    { $set: { pinned: parsed.data.pinned } },
    { returnDocument: "after" }
  ).lean();
  if (!updated) return fail("Message not found.", 404);

  await logActivity({
    institute: group.institute,
    actor: user,
    action: parsed.data.pinned ? "message.pinned" : "message.unpinned",
    entityType: "Message",
    entityId: updated._id,
    summary: `${parsed.data.pinned ? "Pinned" : "Unpinned"} a message in ${group.name}.`,
  });

  return ok({ updated: true });
}
