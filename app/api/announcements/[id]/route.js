import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { ANNOUNCEMENT_CATEGORIES, ANNOUNCEMENT_PRIORITIES } from "@/lib/constants";
import Announcement from "@/lib/models/Announcement";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

const schema = z.object({
  title: z.string().trim().min(4).max(140).optional(),
  body: z.string().trim().min(5).max(4000).optional(),
  category: z.enum(ANNOUNCEMENT_CATEGORIES).optional(),
  priority: z.enum(ANNOUNCEMENT_PRIORITIES).optional(),
  pinned: z.boolean().optional(),
  image: z.string().trim().max(400).optional(),
  link: z.string().trim().max(400).optional(),
  audience: z.enum(["all", "students", "admins"]).optional(),
  isActive: z.boolean().optional(),
  expiresAt: z.union([z.string(), z.date(), z.null()]).optional(),
});

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

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Announcement not found.", 404);

  const { user, response } = await requireAdmin("manage_announcements");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const announcement = await Announcement.findOne({ _id: id, institute: user.instituteId });
  if (!announcement) return fail("Announcement not found.", 404);

  for (const key of ["title", "body", "category", "priority", "pinned", "image", "link", "audience", "isActive"]) {
    if (data[key] !== undefined) announcement[key] = data[key];
  }
  if (data.expiresAt !== undefined) {
    if (data.expiresAt === null || data.expiresAt === "") {
      announcement.expiresAt = undefined;
    } else {
      const date = new Date(data.expiresAt);
      if (Number.isNaN(date.getTime())) return fail("Enter a valid expiry date.", 422);
      announcement.expiresAt = date;
    }
  }

  await announcement.save();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "announcement.updated",
    entityType: "Announcement",
    entityId: announcement._id,
    summary: `Updated announcement ${announcement.title}.`,
  });

  const fresh = await Announcement.findById(announcement._id).populate("society", "name slug color").lean();
  return ok({ announcement: serialize(fresh) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Announcement not found.", 404);

  const { user, response } = await requireAdmin("manage_announcements");
  if (response) return response;

  await connectDB();
  const deleted = await Announcement.findOneAndDelete({ _id: id, institute: user.instituteId });
  if (!deleted) return fail("Announcement not found.", 404);

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "announcement.deleted",
    entityType: "Announcement",
    entityId: deleted._id,
    summary: `Deleted announcement ${deleted.title}.`,
  });

  return ok({ deleted: true });
}
