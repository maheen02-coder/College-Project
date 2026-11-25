import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import Group from "@/lib/models/Group";
import GroupMember from "@/lib/models/GroupMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

async function canManageGroup(group, user) {
  if (isAdmin(user) && hasAdminPermission(user, "manage_groups")) return true;
  if ((group.moderators || []).some((value) => String(value) === String(user.id))) return true;
  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  return membership?.role === "moderator";
}

async function listMembers(groupId) {
  const rows = await GroupMember.find({ group: groupId }).populate("user", "name avatar").lean();
  return rows
    .filter((row) => row.user)
    .map((row) => ({
      id: String(row.user._id),
      name: row.user.name,
      avatar: row.user.avatar || "",
      role: row.role,
      joinedAt: iso(row.joinedAt),
      lastReadAt: iso(row.lastReadAt),
    }));
}

const addSchema = z.object({
  userIds: z.array(z.string()).optional().default([]),
  emails: z
    .array(z.string().trim().toLowerCase().email("Enter a valid email."))
    .optional()
    .default([]),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  const body = await readJson(request);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!data.userIds.length && !data.emails.length) {
    return fail("Select at least one student to add.", 422);
  }

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId });
  if (!group) return fail("Group not found.", 404);
  if (!(await canManageGroup(group, user))) {
    return fail("Only group moderators can manage members.", 403);
  }

  const userIds = [...new Set(data.userIds.map(String))];
  if (!userIds.every((value) => mongoose.isValidObjectId(value))) {
    return fail("One or more selected students are invalid.", 422);
  }

  const users = userIds.length
    ? await User.find({
        _id: { $in: userIds },
        institute: user.instituteId,
        verificationStatus: "verified",
      })
        .select("name email")
        .lean()
    : [];
  if (users.length !== userIds.length) {
    return fail("Selected accounts must be verified students of this institute.", 422);
  }

  if (data.emails.length) {
    const matches = await User.find({
      institute: user.instituteId,
      email: { $in: data.emails },
      verificationStatus: "verified",
    })
      .select("name email")
      .lean();
    const foundEmails = new Set(matches.map((item) => item.email));
    const missing = data.emails.filter((email) => !foundEmails.has(email));
    if (missing.length) {
      return fail(`No verified account found for ${missing.join(", ")}.`, 422);
    }
    users.push(...matches);
  }

  const uniqueUsers = [...new Map(users.map((item) => [String(item._id), item])).values()];
  const existingIds = new Set((group.memberIds || []).map(String));
  const newIds = uniqueUsers
    .map((item) => String(item._id))
    .filter((value) => !existingIds.has(value));

  if (!newIds.length) {
    return ok({ members: await listMembers(group._id), added: 0 });
  }

  await Group.updateOne({ _id: group._id }, { $addToSet: { memberIds: { $each: newIds } } });

  const existingRows = await GroupMember.find({ group: group._id, user: { $in: newIds } })
    .select("user")
    .lean();
  const rowUserIds = new Set(existingRows.map((row) => String(row.user)));
  const missing = newIds.filter((value) => !rowUserIds.has(value));
  if (missing.length) {
    await GroupMember.insertMany(
      missing.map((userId) => ({
        institute: group.institute,
        group: group._id,
        user: userId,
        role: "member",
      }))
    );
  }

  const newSet = new Set(newIds);
  const added = uniqueUsers.filter((item) => newSet.has(String(item._id)));
  if (added.length) {
    await notifyMany(
      added.map((item) => ({
        institute: group.institute,
        user: item._id,
        type: "group",
        title: `Added to ${group.name}`,
        message: `You were added to the ${group.name} group.`,
        link: `/dashboard/groups?group=${group._id}`,
      }))
    );
  }

  await logActivity({
    institute: group.institute,
    actor: user,
    action: "group.member_added",
    entityType: "Group",
    entityId: group._id,
    summary: `Added ${added.length} member${added.length === 1 ? "" : "s"} to ${group.name}.`,
  });

  return ok({ members: await listMembers(group._id), added: added.length });
}

const removeSchema = z.object({
  userId: z.string().min(1, "Select a member to remove."),
});

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  const body = await readJson(request);
  const parsed = removeSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  if (!mongoose.isValidObjectId(parsed.data.userId)) {
    return fail("Invalid member.", 422);
  }

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId });
  if (!group) return fail("Group not found.", 404);
  if (!(await canManageGroup(group, user))) {
    return fail("Only group moderators can manage members.", 403);
  }

  const targetId = parsed.data.userId;
  const isMember =
    (group.memberIds || []).some((value) => String(value) === targetId) ||
    Boolean(await GroupMember.exists({ group: group._id, user: targetId }));
  if (!isMember) return fail("Member not found in this group.", 404);

  const target = await User.findOne({ _id: targetId, institute: user.instituteId })
    .select("name")
    .lean();
  if (!target) return fail("Member not found.", 404);

  await Group.updateOne(
    { _id: group._id },
    {
      $pull: {
        memberIds: new mongoose.Types.ObjectId(targetId),
        moderators: new mongoose.Types.ObjectId(targetId),
      },
    }
  );
  await GroupMember.deleteOne({ group: group._id, user: targetId });

  await logActivity({
    institute: group.institute,
    actor: user,
    action: "group.member_removed",
    entityType: "Group",
    entityId: group._id,
    summary: `Removed ${target.name} from ${group.name}.`,
  });

  return ok({ removed: true, members: await listMembers(group._id) });
}
