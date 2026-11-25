import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { eventPhase, makeId, slugify } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const EVENT_STATUSES = [
  "upcoming",
  "registration_open",
  "registration_closed",
  "ongoing",
  "completed",
  "cancelled",
  "postponed",
];

const COUNTED = ["approved", "attended"];

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function societySummary(society) {
  if (!society || !society._id) return null;
  return {
    id: String(society._id),
    name: society.name || "",
    slug: society.slug || "",
    color: society.color || "#7c3aed",
  };
}

function mapEvent(event, registeredCount = 0) {
  const phase = eventPhase(event);
  const capacity = Number(event.capacity) || 0;
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    excerpt: event.excerpt || "",
    description: event.description,
    poster: event.poster || "",
    category: event.category,
    type: event.type,
    startAt: iso(event.startAt),
    endAt: iso(event.endAt),
    venue: event.venue,
    organizerId: event.organizer ? String(event.organizer) : "",
    organizerName: event.organizerName || "",
    registrationOpenAt: iso(event.registrationOpenAt),
    registrationDeadline: iso(event.registrationDeadline),
    registrationType: event.registrationType || "open",
    capacity,
    registeredCount,
    seatsLeft: Math.max(0, capacity - registeredCount),
    requirements: event.requirements || "",
    notes: event.notes || "",
    rules: event.rules || [],
    highlights: event.highlights || [],
    gallery: event.gallery || [],
    feedbackEnabled: Boolean(event.feedbackEnabled),
    featured: Boolean(event.featured),
    society: societySummary(event.society),
    phase,
    status: phase,
    storedStatus: event.status,
    createdAt: iso(event.createdAt),
  };
}

async function registrationCounts(ids) {
  if (!ids.length) return {};
  const rows = await Registration.aggregate([
    { $match: { event: { $in: ids }, status: { $in: COUNTED } } },
    { $group: { _id: "$event", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return ok({ items: [], total: 0 });

  const now = new Date();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 60, 1), 120);
  const scope = searchParams.get("scope") || "upcoming";
  const statusFilter = searchParams.get("status") || "";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const query = { institute: institute._id };

  const category = searchParams.get("category");
  if (category && category !== "All" && category !== "all") query.category = category;
  const type = searchParams.get("type");
  if (type && type !== "All" && type !== "all") query.type = type;

  const societyParam = (searchParams.get("society") || "").trim();
  if (societyParam) {
    const society = isObjectId(societyParam)
      ? await Society.findOne({ _id: societyParam, institute: institute._id }).lean()
      : await Society.findOne({ slug: societyParam.toLowerCase(), institute: institute._id }).lean();
    if (!society) return ok({ items: [], total: 0 });
    query.society = society._id;
  }

  if (scope === "featured") {
    query.featured = true;
    query.endAt = { $gte: now };
  } else if (scope === "past") {
    query.endAt = { $lt: now };
  } else if (scope !== "all") {
    query.endAt = { $gte: now };
  }

  const requestedSort = searchParams.get("sort");
  const sort =
    requestedSort === "latest"
      ? { startAt: -1 }
      : requestedSort === "soonest"
        ? { startAt: 1 }
        : scope === "past" || scope === "all"
          ? { startAt: -1 }
          : { startAt: 1 };

  let events = await Event.find(query)
    .populate("society", "name slug color")
    .sort(sort)
    .limit(240)
    .lean();

  if (q) {
    events = events.filter((event) =>
      [event.title, event.excerpt, event.venue, event.category, event.type, event.organizerName, event.description]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }
  if (statusFilter && statusFilter !== "all") {
    events = events.filter((event) => eventPhase(event) === statusFilter || event.status === statusFilter);
  } else if (!statusFilter) {
    events = events.filter((event) => event.status !== "cancelled");
  }

  const counts = await registrationCounts(events.map((event) => event._id));
  const items = events.slice(0, limit).map((event) => mapEvent(event, counts[String(event._id)] || 0));

  return ok({ items, total: events.length });
}

const eventSchema = z.object({
  title: z.string().trim().min(4, "Event title is required.").max(140),
  excerpt: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().min(20, "Add a description of at least 20 characters."),
  category: z.string().trim().min(1, "Select a category."),
  type: z.string().trim().min(1, "Select an event type."),
  startAt: z.string().min(1, "Start date is required."),
  endAt: z.string().min(1, "End date is required."),
  registrationOpenAt: z.string().min(1, "Registration opening is required."),
  registrationDeadline: z.string().min(1, "Registration deadline is required."),
  venue: z.string().trim().min(2, "Venue is required."),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  registrationType: z.enum(["open", "approval"]).optional().default("open"),
  requirements: z.string().trim().max(2000).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  rules: z.union([z.array(z.string()), z.string()]).optional().default([]),
  highlights: z.union([z.array(z.string()), z.string()]).optional().default([]),
  gallery: z.union([z.array(z.string()), z.string()]).optional().default([]),
  poster: z.string().trim().max(500).optional().default(""),
  featured: z.boolean().optional().default(false),
  feedbackEnabled: z.boolean().optional().default(false),
  status: z.enum(EVENT_STATUSES).optional(),
  societyId: z.string().trim().optional().default(""),
  organizerId: z.string().trim().optional().default(""),
  organizer: z.string().trim().optional().default(""),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_events");
  if (response) return response;

  const body = await readJson(request);
  const parsed = eventSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  const registrationOpenAt = new Date(data.registrationOpenAt);
  const registrationDeadline = new Date(data.registrationDeadline);
  if ([startAt, endAt, registrationOpenAt, registrationDeadline].some((date) => Number.isNaN(date.getTime()))) {
    return fail("Enter valid event dates.", 422);
  }
  if (registrationOpenAt >= registrationDeadline) {
    return fail("Registration must open before the deadline.", 422);
  }
  if (registrationDeadline > startAt) {
    return fail("Registration deadline must be on or before the event start.", 422);
  }
  if (startAt >= endAt) return fail("Event end must be after the start.", 422);

  await connectDB();

  let societyId = null;
  if (data.societyId) {
    if (!isObjectId(data.societyId)) return fail("Select a valid society.", 422);
    const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
    if (!society) return fail("Society not found.", 422);
    societyId = society._id;
  }

  let organizerId = user.id;
  let organizerName = user.name;
  const organizerRef = data.organizerId || data.organizer;
  if (organizerRef) {
    if (!isObjectId(organizerRef)) return fail("Select a valid organizer.", 422);
    const organizer = await User.findOne({ _id: organizerRef, institute: user.instituteId }).lean();
    if (!organizer) return fail("Organizer not found.", 422);
    organizerId = organizer._id;
    organizerName = organizer.name;
  }

  const baseSlug = slugify(data.title) || `event-${makeId("E", 5).toLowerCase()}`;
  let slug = baseSlug;
  if (await Event.exists({ institute: user.instituteId, slug })) {
    slug = `${baseSlug}-${makeId("E", 4).toLowerCase()}`;
  }

  const event = await Event.create({
    institute: user.instituteId,
    society: societyId || undefined,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    description: data.description,
    poster: data.poster,
    category: data.category,
    type: data.type,
    startAt,
    endAt,
    venue: data.venue,
    organizer: organizerId,
    organizerName,
    registrationOpenAt,
    registrationDeadline,
    capacity: data.capacity,
    registrationType: data.registrationType,
    requirements: data.requirements,
    notes: data.notes,
    rules: toList(data.rules),
    highlights: toList(data.highlights),
    gallery: toList(data.gallery),
    feedbackEnabled: data.feedbackEnabled,
    featured: data.featured,
    status: data.status || "registration_open",
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "event.create",
    entityType: "Event",
    entityId: event._id,
    summary: `Published event ${event.title}.`,
  });

  const created = await Event.findById(event._id).populate("society", "name slug color").lean();
  return ok({ item: mapEvent(created, 0) }, { status: 201 });
}
