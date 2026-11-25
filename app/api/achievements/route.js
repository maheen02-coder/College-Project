import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import Achievement from "@/lib/models/Achievement";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapAchievement(item, includeUser = false) {
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
    ...(includeUser
      ? {
          user: user
            ? {
                id: String(user._id),
                name: user.name,
                avatar: user.avatar || "",
                matricRollNumber: user.matricRollNumber || "",
              }
            : null,
        }
      : {}),
  };
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_students");

  if (!adminAccess) {
    const rows = await Achievement.find({
      institute: user.instituteId,
      user: user.id,
      isVisible: true,
    })
      .sort({ awardedAt: -1, createdAt: -1 })
      .lean();
    return ok({ items: rows.map((row) => mapAchievement(row)) });
  }

  const query = { institute: user.instituteId };
  const userId = searchParams.get("userId");
  if (userId && userId !== "all") {
    if (!mongoose.isValidObjectId(userId)) return fail("Invalid student.", 422);
    query.user = userId;
  }

  const rows = await Achievement.find(query)
    .populate("user", "name avatar matricRollNumber")
    .sort({ awardedAt: -1, createdAt: -1 })
    .limit(300)
    .lean();

  return ok({ items: rows.map((row) => mapAchievement(row, true)) });
}

const createSchema = z.object({
  userId: z.string().min(1, "Select a student."),
  title: z.string().trim().min(2, "Achievement title is required.").max(140),
  description: z.string().trim().max(600).optional().default(""),
  type: z.enum(["badge", "award", "recognition", "milestone"]).optional().default("badge"),
  icon: z.string().trim().max(40).optional().default("star"),
  points: z.coerce.number().min(0).max(10000).optional().default(0),
  isVisible: z.boolean().optional().default(true),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_students");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.userId)) return fail("Invalid student.", 422);

  await connectDB();
  const student = await User.findOne({
    _id: data.userId,
    institute: user.instituteId,
  })
    .select("name")
    .lean();
  if (!student) return fail("Student not found.", 404);

  const achievement = await Achievement.create({
    institute: user.instituteId,
    user: student._id,
    title: data.title,
    description: data.description,
    type: data.type,
    icon: data.icon,
    points: data.points,
    awardedBy: user.id,
    awardedAt: new Date(),
    isVisible: data.isVisible,
  });

  if (data.points > 0) {
    await awardPoints({
      institute: user.instituteId,
      userId: student._id,
      action: "achievement_awarded",
      points: data.points,
      sourceType: "achievement",
      sourceId: achievement._id,
      note: data.title,
      awardedBy: user.id,
    });
  }

  await notify({
    instituteId: user.instituteId,
    userId: student._id,
    type: data.points > 0 ? "points" : "system",
    title: `Achievement unlocked · ${achievement.title}`,
    message:
      data.points > 0
        ? `You earned ${data.points} activity points for ${achievement.title}.`
        : achievement.description || "A new achievement was added to your profile.",
    link: "/dashboard/achievements",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "achievement.awarded",
    entityType: "Achievement",
    entityId: achievement._id,
    summary: `Awarded "${achievement.title}" to ${student.name}.`,
  });

  const created = await Achievement.findById(achievement._id)
    .populate("user", "name avatar matricRollNumber")
    .lean();

  return ok({ achievement: mapAchievement(created, true) }, { status: 201 });
}
