import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { getInstitute } from "@/lib/queries";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES } from "@/lib/constants";
import { truncate } from "@/lib/utils";
import Announcement from "@/lib/models/Announcement";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

function serialize(announcement) {
  return {
    id: String(announcement._id),
    title: announcement.title,
    body: announcement.body,
    category: announcement.category,
    priority: announcement.priority,
    image: announcement.image || "",
    link: announcement.link || "",
    audience: announcement.audience,
    pinned: Boolean(announcement.pinned),
    isActive: Boolean(announcement.isActive),
    expiresAt: announcement.expiresAt ? new Date(announcement.expiresAt).toISOString() : null,
    publishedById: announcement.publishedBy ? String(announcement.publishedBy) : "",
    publishedByName: announcement.publishedByName || "",
    createdAt: announcement.createdAt ? new Date(announcement.createdAt).toISOString() : null,
    society:
      announcement.society && announcement.society.name
        ? {
            id: String(announcement.society._id),
            name: announcement.society.name,
            slug: announcement.society.slug,
            color: announcement.society.color,
          }
        : null,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const scope = searchParams.get("scope");

  await connectDB();

  let instituteId;
  let adminView = false;

  if (scope === "admin") {
    const { user, response } = await requireAdmin("manage_announcements");
    if (response) return response;
    instituteId = user.instituteId;
    adminView = true;
  } else {
    const institute = await getInstitute();
    if (!institute) return ok({ announcements: [] });
    instituteId = institute._id;
  }

  const query = { institute: instituteId };
  if (!adminView) {
    query.isActive = true;
    query.$or = [{ expiresAt: { $exists: false } }, { expiresAt: null }, { expiresAt: { $gt: new Date() } }];
  }

  const category = searchParams.get("category");
  if (category && ANNOUNCEMENT_CATEGORIES.includes(category)) query.category = category;

  const pinned = searchParams.get("pinned");
  if (pinned === "true") query.pinned = true;
  else if (pinned === "false") query.pinned = false;

  const rawLimit = Number.parseInt(searchParams.get("limit"), 10);
  const limit = Number.isFinite(rawLimit) ? Math.min(Math.max(rawLimit, 1), 100) : 20;

  const rows = await Announcement.find(query)
    .populate("society", "name slug color")
    .sort({ pinned: -1, createdAt: -1 })
    .limit(limit)
    .lean();

  return ok({ announcements: rows.map(serialize) });
}

const schema = z.object({
  title: z.string().trim().min(4, "Title is required.").max(140),
  body: z.string().trim().min(5, "Add announcement details.").max(4000),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional().default("general"),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional().default("normal"),
  pinned: z.boolean().optional().default(false),
  image: z.string().trim().max(400).optional().default(""),
  link: z.string().trim().max(400).optional().default(""),
  societyId: z.string().trim().optional(),
  audience: z.enum(["all", "students", "admins"]).optional().default("all"),
  expiresAt: z.union([z.string(), z.date(), z.null()]).optional(),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_announcements");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  let expiresAt;
  if (data.expiresAt) {
    const date = new Date(data.expiresAt);
    if (Number.isNaN(date.getTime())) return fail("Enter a valid expiry date.", 422);
    expiresAt = date;
  }

  await connectDB();

  if (data.societyId) {
    if (!isObjectId(data.societyId)) return fail("Society not found.", 404);
    const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
    if (!society) return fail("Society not found.", 404);
  }

  const announcement = await Announcement.create({
    institute: user.instituteId,
    society: data.societyId || undefined,
    title: data.title,
    body: data.body,
    category: data.category,
    priority: data.priority,
    pinned: data.pinned,
    image: data.image,
    link: data.link,
    audience: data.audience,
    expiresAt,
    publishedBy: user.id,
    publishedByName: user.name,
  });

  if (announcement.priority === "urgent" || announcement.pinned) {
    const students = await User.find({
      institute: user.instituteId,
      role: "student",
      isActive: true,
    })
      .select("_id")
      .limit(200)
      .lean();

    if (students.length) {
      await notifyMany(
        students.map((student) => ({
          institute: user.instituteId,
          user: student._id,
          type: "announcement",
          title: announcement.title,
          message: truncate(announcement.body, 140),
          link: announcement.link || "/announcements",
        }))
      );
    }
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "announcement.created",
    entityType: "Announcement",
    entityId: announcement._id,
    summary: `Published announcement ${announcement.title}.`,
  });

  const fresh = await Announcement.findById(announcement._id).populate("society", "name slug color").lean();
  return ok({ announcement: serialize(fresh) }, { status: 201 });
}
