import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { POINT_ACTIONS } from "@/lib/constants";
import StudentPoint from "@/lib/models/StudentPoint";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function actionLabel(action) {
  if (Object.prototype.hasOwnProperty.call(POINT_ACTIONS, action)) return POINT_ACTIONS[action].label;
  if (action === "manual") return "Manual adjustment";
  return String(action || "")
    .replace(/_/g, " ")
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function mapPoint(item, includeUser = false) {
  const user = item.user && item.user.name ? item.user : null;
  return {
    id: String(item._id),
    action: item.action,
    label: actionLabel(item.action),
    points: item.points,
    note: item.note || "",
    sourceType: item.sourceType || "",
    sourceId: item.sourceId ? String(item.sourceId) : null,
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
    const [rows, fresh, breakdown] = await Promise.all([
      StudentPoint.find({ institute: user.instituteId, user: user.id })
        .sort({ createdAt: -1 })
        .limit(50)
        .lean(),
      User.findById(user.id).select("points").lean(),
      StudentPoint.aggregate([
        {
          $match: {
            institute: new mongoose.Types.ObjectId(user.instituteId),
            user: new mongoose.Types.ObjectId(user.id),
          },
        },
        {
          $group: {
            _id: "$action",
            points: { $sum: "$points" },
            count: { $sum: 1 },
          },
        },
        { $sort: { points: -1 } },
      ]),
    ]);

    return ok({
      items: rows.map((row) => mapPoint(row)),
      total: fresh?.points || 0,
      breakdown: breakdown.map((row) => ({
        action: row._id,
        label: actionLabel(row._id),
        points: row.points,
        count: row.count,
      })),
    });
  }

  const query = { institute: user.instituteId };
  const userId = searchParams.get("userId");
  const action = searchParams.get("action");
  if (userId && userId !== "all") {
    if (!mongoose.isValidObjectId(userId)) return fail("Invalid student.", 422);
    query.user = userId;
  }
  if (action && action !== "all") query.action = action;

  const [rows, topStudents] = await Promise.all([
    StudentPoint.find(query)
      .populate("user", "name avatar matricRollNumber")
      .sort({ createdAt: -1 })
      .limit(300)
      .lean(),
    User.find({ institute: user.instituteId, role: "student" })
      .sort({ points: -1 })
      .limit(10)
      .select("name matricRollNumber classYear points avatar")
      .lean(),
  ]);

  return ok({
    items: rows.map((row) => mapPoint(row, true)),
    topStudents: topStudents.map((item) => ({
      id: String(item._id),
      name: item.name,
      matricRollNumber: item.matricRollNumber || "",
      classYear: item.classYear || "",
      points: item.points || 0,
      avatar: item.avatar || "",
    })),
  });
}

const awardSchema = z.object({
  userId: z.string().min(1, "Select a student."),
  action: z.string().trim().min(1, "Choose a points action."),
  points: z.coerce.number().min(0).max(10000).optional(),
  note: z.string().trim().max(300).optional().default(""),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_students");
  if (response) return response;

  const body = await readJson(request);
  const parsed = awardSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.userId)) return fail("Invalid student.", 422);

  const preset = Object.prototype.hasOwnProperty.call(POINT_ACTIONS, data.action)
    ? POINT_ACTIONS[data.action]
    : null;
  if (!preset && data.action !== "manual") {
    return fail("Choose a valid points action.", 422);
  }

  const value = data.action === "manual" ? data.points : preset.points;
  if (!Number.isFinite(value) || value <= 0) {
    return fail("Enter points greater than zero.", 422);
  }

  await connectDB();
  const student = await User.findOne({
    _id: data.userId,
    institute: user.instituteId,
  })
    .select("name")
    .lean();
  if (!student) return fail("Student not found.", 404);

  const awarded = await awardPoints({
    institute: user.instituteId,
    userId: student._id,
    action: data.action,
    points: value,
    note: data.note,
    awardedBy: user.id,
  });
  if (!awarded) return fail("Points could not be awarded.", 409);

  const updated = await User.findById(student._id).select("points").lean();

  await notify({
    instituteId: user.instituteId,
    userId: student._id,
    type: "points",
    title: `+${awarded} activity points`,
    message: data.note || `Points awarded for ${actionLabel(data.action).toLowerCase()}.`,
    link: "/dashboard/points",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "points.awarded",
    entityType: "User",
    entityId: student._id,
    summary: `Awarded ${awarded} points to ${student.name} for ${actionLabel(data.action)}.`,
  });

  return ok({ points: awarded, total: updated?.points || 0 });
}
