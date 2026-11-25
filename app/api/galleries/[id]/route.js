import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import Event from "@/lib/models/Event";
import Gallery from "@/lib/models/Gallery";
import Society from "@/lib/models/Society";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapGallery(item) {
  const society = item.society && item.society.name ? item.society : null;
  const event = item.event && item.event.title ? item.event : null;
  return {
    id: String(item._id),
    title: item.title,
    description: item.description || "",
    cover: item.cover || "",
    images: item.images || [],
    isPublished: Boolean(item.isPublished),
    society: society
      ? {
          id: String(society._id),
          name: society.name,
          slug: society.slug,
          color: society.color || "#7c3aed",
        }
      : null,
    event: event ? { id: String(event._id), title: event.title, slug: event.slug } : null,
    createdAt: iso(item.createdAt),
  };
}

const updateSchema = z.object({
  title: z.string().trim().min(2, "Gallery title is required.").max(120).optional(),
  description: z.string().trim().max(600).optional(),
  societyId: z.string().optional(),
  eventId: z.string().optional(),
  cover: z.string().trim().max(500).optional(),
  images: z.array(z.string().trim().max(500)).optional(),
  isPublished: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_galleries");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Gallery not found.", 404);

  const body = await readJson(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const gallery = await Gallery.findOne({ _id: id, institute: user.instituteId });
  if (!gallery) return fail("Gallery not found.", 404);

  if (data.title !== undefined) gallery.title = data.title;
  if (data.description !== undefined) gallery.description = data.description;
  if (data.cover !== undefined) gallery.cover = data.cover;
  if (data.images !== undefined) gallery.images = data.images.filter(Boolean);
  if (data.isPublished !== undefined) gallery.isPublished = data.isPublished;

  if (data.societyId !== undefined) {
    if (!data.societyId) {
      gallery.society = null;
    } else {
      if (!mongoose.isValidObjectId(data.societyId)) return fail("Invalid society.", 422);
      const society = await Society.findOne({
        _id: data.societyId,
        institute: user.instituteId,
      })
        .select("_id")
        .lean();
      if (!society) return fail("Society not found.", 404);
      gallery.society = society._id;
    }
  }

  if (data.eventId !== undefined) {
    if (!data.eventId) {
      gallery.event = null;
    } else {
      if (!mongoose.isValidObjectId(data.eventId)) return fail("Invalid event.", 422);
      const event = await Event.findOne({
        _id: data.eventId,
        institute: user.instituteId,
      })
        .select("_id")
        .lean();
      if (!event) return fail("Event not found.", 404);
      gallery.event = event._id;
    }
  }

  await gallery.save();

  await logActivity({
    institute: gallery.institute,
    actor: user,
    action: "gallery.updated",
    entityType: "Gallery",
    entityId: gallery._id,
    summary: `Updated gallery "${gallery.title}".`,
  });

  const updated = await Gallery.findById(gallery._id)
    .populate("society", "name slug color")
    .populate("event", "title slug")
    .lean();

  return ok({ item: mapGallery(updated) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_galleries");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Gallery not found.", 404);

  await connectDB();
  const gallery = await Gallery.findOneAndDelete({ _id: id, institute: user.instituteId });
  if (!gallery) return fail("Gallery not found.", 404);

  await logActivity({
    institute: gallery.institute,
    actor: user,
    action: "gallery.deleted",
    entityType: "Gallery",
    entityId: gallery._id,
    summary: `Deleted gallery "${gallery.title}".`,
  });

  return ok({ deleted: true });
}
