import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import Achievement from "@/lib/models/Achievement";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapAchievement(item) {
  const user = item.user && item.user.name ? item.user : null;
  return {
    id: String(item._id),
    title: item.title,
    description: item.description || "",
    type: item.type,
    icon: item.icon || "star",
    points: item.points || 0,
    isVisible: Boolean(item.isVisible),
    awardedAt: iso(item.awardedAt),
    createdAt: iso(item.createdAt),
    user: user
      ? {
          id: String(user._id),
          name: user.name,
          avatar: user.avatar || "",
          matricRollNumber: user.matricRollNumber || "",
        }
      : null,
  };
}

const updateSchema = z.object({
  title: z.string().trim().min(2, "Achievement title is required.").max(140).optional(),
  description: z.string().trim().max(600).optional(),
  type: z.enum(["badge", "award", "recognition", "milestone"]).optional(),
  icon: z.string().trim().max(40).optional(),
  points: z.coerce.number().min(0).max(10000).optional(),
  isVisible: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_students");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Achievement not found.", 404);

  const body = await readJson(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  await connectDB();
  const achievement = await Achievement.findOne({ _id: id, institute: user.instituteId });
  if (!achievement) return fail("Achievement not found.", 404);

  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) achievement[key] = value;
  }
  await achievement.save();

  await logActivity({
    institute: achievement.institute,
    actor: user,
    action: "achievement.updated",
    entityType: "Achievement",
    entityId: achievement._id,
    summary: `Updated achievement "${achievement.title}".`,
  });

  const updated = await Achievement.findById(achievement._id)
    .populate("user", "name avatar matricRollNumber")
    .lean();

  return ok({ achievement: mapAchievement(updated) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_students");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Achievement not found.", 404);

  await connectDB();
  const achievement = await Achievement.findOneAndDelete({
    _id: id,
    institute: user.instituteId,
  });
  if (!achievement) return fail("Achievement not found.", 404);

  await logActivity({
    institute: achievement.institute,
    actor: user,
    action: "achievement.deleted",
    entityType: "Achievement",
    entityId: achievement._id,
    summary: `Deleted achievement "${achievement.title}".`,
  });

  return ok({ deleted: true });
}
