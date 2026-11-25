import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import Group from "@/lib/models/Group";
import Society from "@/lib/models/Society";
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

const adminSchema = z.object({
  societyId: z.string().optional(),
  title: z.string().trim().min(2, "Task title is required.").max(140).optional(),
  description: z.string().trim().max(2000).optional(),
  assignedTo: z.string().optional(),
  dueDate: z.string().optional(),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional(),
  status: z.enum(["pending", "in_progress", "completed", "cancelled"]).optional(),
  groupId: z.string().optional(),
});

const assigneeSchema = z.object({
  status: z.enum(["pending", "in_progress", "completed"]),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Task not found.", 404);

  const body = await readJson(request);
  await connectDB();

  const task = await Task.findOne({ _id: id, institute: user.instituteId });
  if (!task) return fail("Task not found.", 404);

  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_tasks");
  const isAssignee = String(task.assignedTo || "") === String(user.id);
  if (!adminAccess && !isAssignee) return fail("Not permitted.", 403);

  const schema = adminAccess ? adminSchema : assigneeSchema;
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  if (adminAccess) {
    if (data.title !== undefined) task.title = data.title;
    if (data.description !== undefined) task.description = data.description;
    if (data.priority !== undefined) task.priority = data.priority;

    if (data.dueDate !== undefined) {
      if (!data.dueDate) {
        task.dueDate = undefined;
      } else {
        const dueDate = new Date(data.dueDate);
        if (Number.isNaN(dueDate.getTime())) return fail("Enter a valid due date.", 422);
        task.dueDate = dueDate;
      }
    }

    if (data.societyId !== undefined) {
      if (!mongoose.isValidObjectId(data.societyId)) return fail("Invalid society.", 422);
      const society = await Society.findOne({
        _id: data.societyId,
        institute: user.instituteId,
      })
        .select("_id")
        .lean();
      if (!society) return fail("Society not found.", 404);
      task.society = society._id;
      if (data.groupId === undefined) task.group = undefined;
    }

    if (data.groupId !== undefined) {
      if (!data.groupId) {
        task.group = undefined;
      } else {
        if (!mongoose.isValidObjectId(data.groupId)) return fail("Invalid group.", 422);
        const group = await Group.findOne({
          _id: data.groupId,
          institute: user.instituteId,
          society: task.society,
        })
          .select("_id")
          .lean();
        if (!group) return fail("Group not found for this society.", 404);
        task.group = group._id;
      }
    }

    if (data.assignedTo !== undefined) {
      if (!mongoose.isValidObjectId(data.assignedTo)) return fail("Invalid assignee.", 422);
      const assignee = await User.findOne({
        _id: data.assignedTo,
        institute: user.instituteId,
      })
        .select("name")
        .lean();
      if (!assignee) return fail("Assignee must be a member of this institute.", 422);
      if (String(task.assignedTo || "") !== String(assignee._id)) {
        task.assignedTo = assignee._id;
        await notify({
          instituteId: task.institute,
          userId: assignee._id,
          type: "task",
          title: `Task assigned · ${task.title}`,
          message: `${user.name} assigned you a task.`,
          link: "/dashboard/tasks",
        });
      }
    }
  }

  let justCompleted = false;
  if (data.status && data.status !== task.status) {
    if (data.status === "completed") {
      task.completedAt = new Date();
      justCompleted = true;
    } else {
      task.completedAt = null;
    }
    task.status = data.status;
  }

  await task.save();

  if (justCompleted) {
    await awardPoints({
      institute: task.institute,
      userId: task.assignedTo,
      action: "task_completed",
      sourceType: "task",
      sourceId: task._id,
    });
    if (task.createdBy && String(task.createdBy) !== String(user.id)) {
      await notify({
        instituteId: task.institute,
        userId: task.createdBy,
        type: "task",
        title: `Task completed · ${task.title}`,
        message: `${user.name} marked this task as completed.`,
        link: "/dashboard/tasks",
      });
    }
  }

  if (adminAccess) {
    await logActivity({
      institute: task.institute,
      actor: user,
      action: "task.updated",
      entityType: "Task",
      entityId: task._id,
      summary: `Updated task "${task.title}".`,
    });
  }

  const updated = await populateTask(Task.findById(task._id));

  return ok({ task: mapTask(updated) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_tasks");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Task not found.", 404);

  await connectDB();
  const task = await Task.findOneAndDelete({ _id: id, institute: user.instituteId });
  if (!task) return fail("Task not found.", 404);

  await logActivity({
    institute: task.institute,
    actor: user,
    action: "task.deleted",
    entityType: "Task",
    entityId: task._id,
    summary: `Deleted task "${task.title}".`,
  });

  return ok({ deleted: true });
}
