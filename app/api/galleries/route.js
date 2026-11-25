import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
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

export async function GET(request) {
  const institute = await getInstitute();
  if (!institute) return ok({ items: [] });

  const { searchParams } = new URL(request.url);
  const query = { institute: institute._id, isPublished: true };

  const society = searchParams.get("society");
  const event = searchParams.get("event");
  if (society && society !== "all") {
    if (!mongoose.isValidObjectId(society)) return fail("Invalid society.", 422);
    query.society = society;
  }
  if (event && event !== "all") {
    if (!mongoose.isValidObjectId(event)) return fail("Invalid event.", 422);
    query.event = event;
  }

  const rows = await Gallery.find(query)
    .populate("society", "name slug color")
    .populate("event", "title slug")
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();

  return ok({ items: rows.map(mapGallery) });
}

const imageSchema = z.string().trim().max(500);

const createSchema = z.object({
  title: z.string().trim().min(2, "Gallery title is required.").max(120),
  description: z.string().trim().max(600).optional().default(""),
  societyId: z.string().optional().default(""),
  eventId: z.string().optional().default(""),
  cover: z.string().trim().max(500).optional().default(""),
  images: z.array(imageSchema).optional().default([]),
  isPublished: z.boolean().optional().default(true),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_galleries");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const images = data.images.filter(Boolean);
  if (!data.cover && !images.length) {
    return fail("Add a cover image or at least one photo.", 422);
  }
  if (data.societyId && !mongoose.isValidObjectId(data.societyId)) {
    return fail("Invalid society.", 422);
  }
  if (data.eventId && !mongoose.isValidObjectId(data.eventId)) {
    return fail("Invalid event.", 422);
  }

  await connectDB();
  let society;
  if (data.societyId) {
    society = await Society.findOne({
      _id: data.societyId,
      institute: user.instituteId,
    }).lean();
    if (!society) return fail("Society not found.", 404);
  }

  let event;
  if (data.eventId) {
    event = await Event.findOne({ _id: data.eventId, institute: user.instituteId }).lean();
    if (!event) return fail("Event not found.", 404);
  }

  const gallery = await Gallery.create({
    institute: user.instituteId,
    society: society?._id,
    event: event?._id,
    title: data.title,
    description: data.description,
    cover: data.cover,
    images,
    isPublished: data.isPublished,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "gallery.created",
    entityType: "Gallery",
    entityId: gallery._id,
    summary: `Created gallery "${gallery.title}".`,
  });

  const created = await Gallery.findById(gallery._id)
    .populate("society", "name slug color")
    .populate("event", "title slug")
    .lean();

  return ok({ item: mapGallery(created) }, { status: 201 });
}
