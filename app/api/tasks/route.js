import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { TASK_STATUSES } from "@/lib/constants";
import Group from "@/lib/models/Group";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import Task from "@/lib/models/Task";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapTask(task) {
  const society = task.society && task.society.name ? task.society : null;
  const assignee = task.assignedTo && task.assignedTo.name ? task.assignedTo : null;
  const creator = task.createdBy && task.createdBy.name ? task.createdBy : null;
  return {
    id: String(task._id),
    title: task.title,
    description: task.description || "",
    society: society
      ? { id: String(society._id), name: society.name, color: society.color || "#7c3aed" }
      : null,
    groupId: task.group ? String(task.group) : null,
    assignedTo: assignee
      ? { id: String(assignee._id), name: assignee.name, avatar: assignee.avatar || "" }
      : null,
    assignedToName: assignee?.name || "",
    createdBy: creator ? { id: String(creator._id), name: creator.name } : null,
    createdByName: creator?.name || "",
    dueDate: iso(task.dueDate),
    priority: task.priority,
    status: task.status,
    completedAt: iso(task.completedAt),
    createdAt: iso(task.createdAt),
  };
}

function populateTask(query) {
  return query
    .populate("society", "name color")
    .populate("assignedTo", "name avatar")
    .populate("createdBy", "name")
    .lean();
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_tasks");

  const query = { institute: user.instituteId };
  if (!adminAccess) {
    query.assignedTo = user.id;
  } else {
    const society = searchParams.get("society");
    const status = searchParams.get("status");
    const assignee = searchParams.get("assignee");
    if (society && society !== "all") {
      if (!mongoose.isValidObjectId(society)) return fail("Invalid society.", 422);
      query.society = society;
    }
    if (status && status !== "all") {
      if (!TASK_STATUSES.includes(status)) return fail("Invalid task status.", 422);
      query.status = status;
    }
    if (assignee && assignee !== "all") {
      if (!mongoose.isValidObjectId(assignee)) return fail("Invalid assignee.", 422);
      query.assignedTo = assignee;
    }
  }

  const rows = await populateTask(
    Task.find(query).sort({ createdAt: -1 }).limit(adminAccess ? 300 : 100)
  );

  return ok({ tasks: rows.map(mapTask) });
}

const createSchema = z.object({
  societyId: z.string().min(1, "Select a society."),
  groupId: z.string().optional().default(""),
  title: z.string().trim().min(2, "Task title is required.").max(140),
  description: z.string().trim().max(2000).optional().default(""),
  assignedTo: z.string().min(1, "Choose an assignee."),
  dueDate: z.string().optional().default(""),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_tasks");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.societyId)) return fail("Invalid society.", 422);
  if (!mongoose.isValidObjectId(data.assignedTo)) return fail("Invalid assignee.", 422);

  let dueDate;
  if (data.dueDate) {
    dueDate = new Date(data.dueDate);
    if (Number.isNaN(dueDate.getTime())) return fail("Enter a valid due date.", 422);
  }

  await connectDB();
  const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
  if (!society) return fail("Society not found.", 404);

  const assignee = await User.findOne({
    _id: data.assignedTo,
    institute: user.instituteId,
  })
    .select("name")
    .lean();
  if (!assignee) return fail("Assignee must be a member of this institute.", 422);

  const membership = await SocietyMember.findOne({
    society: society._id,
    user: assignee._id,
  }).lean();
  if (membership && membership.status === "removed") {
    return fail("This student has been removed from the society.", 422);
  }

  let groupId;
  if (data.groupId) {
    if (!mongoose.isValidObjectId(data.groupId)) return fail("Invalid group.", 422);
    const group = await Group.findOne({
      _id: data.groupId,
      institute: user.instituteId,
      society: society._id,
    })
      .select("_id")
      .lean();
    if (!group) return fail("Group not found for this society.", 404);
    groupId = group._id;
  }

  const task = await Task.create({
    institute: user.instituteId,
    society: society._id,
    group: groupId,
    title: data.title,
    description: data.description,
    assignedTo: assignee._id,
    createdBy: user.id,
    dueDate,
    priority: data.priority,
    status: "pending",
  });

  if (String(assignee._id) !== String(user.id)) {
    await notify({
      instituteId: user.instituteId,
      userId: assignee._id,
      type: "task",
      title: `New task · ${task.title}`,
      message: data.description || `Assigned by ${user.name}.`,
      link: "/dashboard/tasks",
    });
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "task.created",
    entityType: "Task",
    entityId: task._id,
    summary: `Assigned "${task.title}" to ${assignee.name}.`,
  });

  const created = await populateTask(Task.findById(task._id));

  return ok({ task: mapTask(created) }, { status: 201 });
}
