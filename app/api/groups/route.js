import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import Group from "@/lib/models/Group";
import GroupMember from "@/lib/models/GroupMember";
import Message from "@/lib/models/Message";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapGroup(group, extra = {}) {
  const society = group.society && group.society.name ? group.society : null;
  return {
    id: String(group._id),
    name: group.name,
    description: group.description || "",
    color: group.color || "#7c3aed",
    society: society
      ? {
          id: String(society._id),
          name: society.name,
          slug: society.slug,
          color: society.color || "#7c3aed",
        }
      : null,
    memberCount: extra.memberCount || 0,
    isModerator: Boolean(extra.isModerator),
    unreadCount: extra.unreadCount || 0,
    lastMessageAt: iso(group.lastMessageAt),
    lastMessagePreview: group.lastMessagePreview || "",
    isArchived: Boolean(group.isArchived),
    createdAt: iso(group.createdAt),
  };
}

async function countMembers(groupIds) {
  if (!groupIds.length) return {};
  const rows = await GroupMember.aggregate([
    { $match: { group: { $in: groupIds } } },
    { $group: { _id: "$group", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

async function countUnread(instituteId, groups, membershipMap) {
  const clauses = groups.map((group) => {
    const row = membershipMap[String(group._id)];
    return row?.lastReadAt
      ? { group: group._id, createdAt: { $gt: new Date(row.lastReadAt) } }
      : { group: group._id };
  });
  if (!clauses.length) return {};
  const rows = await Message.aggregate([
    { $match: { institute: new mongoose.Types.ObjectId(instituteId), $or: clauses } },
    { $group: { _id: "$group", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);

  if (isAdmin(user) && hasAdminPermission(user, "manage_groups")) {
    const query = { institute: user.instituteId };
    const society = searchParams.get("society");
    const archived = searchParams.get("archived");
    if (society && society !== "all") {
      if (!mongoose.isValidObjectId(society)) return fail("Invalid society.", 422);
      query.society = society;
    }
    if (archived === "true" || archived === "false") query.isArchived = archived === "true";

    const groups = await Group.find(query)
      .populate("society", "name slug color")
      .sort({ lastMessageAt: -1, createdAt: -1 })
      .lean();
    const counts = await countMembers(groups.map((group) => group._id));

    return ok({
      groups: groups.map((group) =>
        mapGroup(group, {
          memberCount: Math.max(counts[String(group._id)] || 0, (group.memberIds || []).length),
        })
      ),
    });
  }

  const memberships = await GroupMember.find({ institute: user.instituteId, user: user.id }).lean();
  const membershipMap = Object.fromEntries(memberships.map((row) => [String(row.group), row]));

  const groups = await Group.find({
    institute: user.instituteId,
    isArchived: false,
    $or: [{ memberIds: user.id }, { _id: { $in: memberships.map((row) => row.group) } }],
  })
    .populate("society", "name slug color")
    .sort({ lastMessageAt: -1, createdAt: -1 })
    .lean();

  const counts = await countMembers(groups.map((group) => group._id));
  const unread = await countUnread(user.instituteId, groups, membershipMap);

  return ok({
    groups: groups.map((group) =>
      mapGroup(group, {
        memberCount: Math.max(counts[String(group._id)] || 0, (group.memberIds || []).length),
        isModerator:
          (group.moderators || []).some((id) => String(id) === String(user.id)) ||
          membershipMap[String(group._id)]?.role === "moderator",
        unreadCount: unread[String(group._id)] || 0,
      })
    ),
  });
}

const createSchema = z.object({
  societyId: z.string().min(1, "Select a society."),
  name: z.string().trim().min(2, "Group name is required.").max(80),
  description: z.string().trim().max(500).optional().default(""),
  color: z
    .string()
    .trim()
    .regex(/^#[0-9a-fA-F]{6}$/, "Choose a valid colour.")
    .optional()
    .default("#7c3aed"),
  memberIds: z.array(z.string()).optional().default([]),
  moderators: z.array(z.string()).optional().default([]),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_groups");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  if (!mongoose.isValidObjectId(data.societyId)) return fail("Invalid society.", 422);

  const moderatorIds = [...new Set(data.moderators.map(String))];
  const memberIds = [...new Set([...data.memberIds.map(String), ...moderatorIds])];
  if (!memberIds.every((value) => mongoose.isValidObjectId(value))) {
    return fail("One or more selected members are invalid.", 422);
  }

  await connectDB();
  const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
  if (!society) return fail("Society not found.", 404);

  const users = memberIds.length
    ? await User.find({ _id: { $in: memberIds }, institute: user.instituteId })
        .select("name email")
        .lean()
    : [];
  if (users.length !== memberIds.length) {
    return fail("Every member must belong to this institute.", 422);
  }

  const group = await Group.create({
    institute: user.instituteId,
    society: society._id,
    name: data.name,
    description: data.description,
    color: data.color,
    memberIds,
    moderators: moderatorIds,
    createdBy: user.id,
  });

  if (memberIds.length) {
    await GroupMember.insertMany(
      memberIds.map((userId) => ({
        institute: user.instituteId,
        group: group._id,
        user: userId,
        role: moderatorIds.includes(userId) ? "moderator" : "member",
      }))
    );
  }

  const recipients = users.filter((item) => String(item._id) !== String(user.id));
  if (recipients.length) {
    await notifyMany(
      recipients.map((recipient) => ({
        institute: group.institute,
        user: recipient._id,
        type: "group",
        title: `Added to ${group.name}`,
        message: `You were added to ${group.name} in ${society.name}.`,
        link: `/dashboard/groups?group=${group._id}`,
      }))
    );
  }

  await logActivity({
    institute: group.institute,
    actor: user,
    action: "group.created",
    entityType: "Group",
    entityId: group._id,
    summary: `Created group ${group.name} for ${society.name}.`,
  });

  await group.populate("society", "name slug color");

  return ok(
    {
      group: mapGroup(group.toObject(), {
        memberCount: memberIds.length,
        isModerator: moderatorIds.includes(String(user.id)),
      }),
    },
    { status: 201 }
  );
}
