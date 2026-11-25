import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import Group from "@/lib/models/Group";
import GroupMember from "@/lib/models/GroupMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapGroup(group, memberCount = 0) {
  return {
    id: String(group._id),
    name: group.name,
    description: group.description || "",
    color: group.color || "#7c3aed",
    isArchived: Boolean(group.isArchived),
    memberCount,
    lastMessageAt: iso(group.lastMessageAt),
    lastMessagePreview: group.lastMessagePreview || "",
    createdAt: iso(group.createdAt),
  };
}

function mapSociety(group) {
  const society = group.society;
  if (!society || !society.name) return null;
  return {
    id: String(society._id),
    name: society.name,
    slug: society.slug,
    color: society.color || "#7c3aed",
  };
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
      lastReadAt: iso(row.lastReadAt),
    }));
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId }).populate(
    "society",
    "name slug color"
  );
  if (!group) return fail("Group not found.", 404);

  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  const isMember =
    Boolean(membership) || (group.memberIds || []).some((value) => String(value) === String(user.id));
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_groups");
  if (!isMember && !adminAccess) return fail("You are not a member of this group.", 403);

  const members = await listMembers(group._id);
  const knownIds = new Set(members.map((member) => member.id));
  const missing = (group.memberIds || [])
    .map(String)
    .filter((value) => !knownIds.has(value));
  if (missing.length) {
    const users = await User.find({ _id: { $in: missing } }).select("name avatar").lean();
    for (const item of users) {
      members.push({
        id: String(item._id),
        name: item.name,
        avatar: item.avatar || "",
        role: (group.moderators || []).some((value) => String(value) === String(item._id))
          ? "moderator"
          : "member",
        lastReadAt: null,
      });
    }
  }

  if (membership) {
    membership.lastReadAt = new Date();
    await membership.save();
  }

  const memberCount = Math.max(members.length, (group.memberIds || []).length);

  return ok({
    group: mapGroup(group, memberCount),
    society: mapSociety(group),
    members,
    moderators: (group.moderators || []).map(String),
    canPost: isMember && !group.isArchived,
    archived: Boolean(group.isArchived),
  });
}

const updateSchema = z.object({
  name: z.string().trim().min(2, "Group name is required.").max(80).optional(),
  description: z.string().trim().max(500).optional(),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid colour.")
    .optional(),
  isArchived: z.boolean().optional(),
  moderators: z.array(z.string()).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  const body = await readJson(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId });
  if (!group) return fail("Group not found.", 404);

  const membership = await GroupMember.findOne({ group: group._id, user: user.id }).lean();
  const isModerator =
    (group.moderators || []).some((value) => String(value) === String(user.id)) ||
    membership?.role === "moderator";
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_groups");
  if (!adminAccess && !isModerator) {
    return fail("Only group moderators can update this group.", 403);
  }

  if (data.name !== undefined) group.name = data.name;
  if (data.description !== undefined) group.description = data.description;
  if (data.color !== undefined) group.color = data.color;
  if (data.isArchived !== undefined) group.isArchived = data.isArchived;

  if (data.moderators !== undefined) {
    const nextModerators = [...new Set(data.moderators.map(String))];
    if (!nextModerators.every((value) => mongoose.isValidObjectId(value))) {
      return fail("Invalid moderator selection.", 422);
    }
    if (nextModerators.length) {
      const validUsers = await User.find({
        _id: { $in: nextModerators },
        institute: user.instituteId,
      })
        .select("_id")
        .lean();
      if (validUsers.length !== nextModerators.length) {
        return fail("Moderators must belong to this institute.", 422);
      }
    }

    const memberIds = [...new Set([...(group.memberIds || []).map(String), ...nextModerators])];
    await GroupMember.updateMany({ group: group._id }, { $set: { role: "member" } });
    if (nextModerators.length) {
      await GroupMember.updateMany(
        { group: group._id, user: { $in: nextModerators } },
        { $set: { role: "moderator" } }
      );
      const existing = await GroupMember.find({
        group: group._id,
        user: { $in: nextModerators },
      })
        .select("user")
        .lean();
      const existingIds = new Set(existing.map((row) => String(row.user)));
      const missing = nextModerators.filter((value) => !existingIds.has(value));
      if (missing.length) {
        await GroupMember.insertMany(
          missing.map((userId) => ({
            institute: group.institute,
            group: group._id,
            user: userId,
            role: "moderator",
          }))
        );
      }
    }
    group.memberIds = memberIds;
    group.moderators = nextModerators;
  }

  await group.save();

  const memberCount = await GroupMember.countDocuments({ group: group._id });
  await group.populate("society", "name slug color");

  await logActivity({
    institute: group.institute,
    actor: user,
    action: "group.updated",
    entityType: "Group",
    entityId: group._id,
    summary: `Updated group ${group.name}.`,
  });

  return ok({
    group: mapGroup(group, Math.max(memberCount, (group.memberIds || []).length)),
    society: mapSociety(group),
    moderators: (group.moderators || []).map(String),
  });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_groups");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Group not found.", 404);

  await connectDB();
  const group = await Group.findOne({ _id: id, institute: user.instituteId });
  if (!group) return fail("Group not found.", 404);

  group.isArchived = true;
  await group.save();

  await logActivity({
    institute: group.institute,
    actor: user,
    action: "group.archived",
    entityType: "Group",
    entityId: group._id,
    summary: `Archived group ${group.name}.`,
  });

  return ok({ archived: true });
}
