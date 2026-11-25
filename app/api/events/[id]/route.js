import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { eventPhase } from "@/lib/utils";
import Event from "@/lib/models/Event";
import EventFeedback from "@/lib/models/EventFeedback";
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

function mapEvent(event, counts = {}) {
  const phase = eventPhase(event);
  const capacity = Number(event.capacity) || 0;
  const registeredCount = counts.registered || 0;
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
    pendingCount: counts.pending || 0,
    attendedCount: counts.attended || 0,
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
    updatedAt: iso(event.updatedAt),
  };
}

function mapRegistration(registration, event) {
  if (!registration) return null;
  return {
    id: String(registration._id),
    registrationId: registration.registrationId,
    status: registration.status,
    attendance: registration.attendance || "unmarked",
    markedVia: registration.markedVia || "manual",
    note: registration.note || "",
    registeredAt: iso(registration.createdAt),
    attendedAt: iso(registration.attendedAt),
    cancelledAt: iso(registration.cancelledAt),
    event: event
      ? {
          id: String(event._id),
          title: event.title,
          slug: event.slug,
          poster: event.poster || "",
          startAt: iso(event.startAt),
          endAt: iso(event.endAt),
          venue: event.venue,
          status: eventPhase(event),
        }
      : null,
  };
}

async function statsFor(ids) {
  if (!ids.length) return {};
  const rows = await Registration.aggregate([
    { $match: { event: { $in: ids } } },
    {
      $group: {
        _id: "$event",
        registered: {
          $sum: { $cond: [{ $in: ["$status", ["approved", "attended"]] }, 1, 0] },
        },
        attended: { $sum: { $cond: [{ $eq: ["$attendance", "present"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
      },
    },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row]));
}

async function findEvent(id) {
  if (isObjectId(id)) {
    return Event.findById(id).populate("society", "name slug color").lean();
  }
  const institute = await getInstitute();
  if (!institute) return null;
  return Event.findOne({ institute: institute._id, slug: id.toLowerCase() })
    .populate("society", "name slug color")
    .lean();
}

export async function GET(request, { params }) {
  const { id } = await params;
  await connectDB();

  const event = await findEvent(id);
  if (!event) return fail("Event not found.", 404);

  const user = await getSessionUser();
  if (user && String(event.institute) !== String(user.instituteId)) {
    return fail("Event not found.", 404);
  }

  const related = await Event.find({
    institute: event.institute,
    category: event.category,
    _id: { $ne: event._id },
    status: { $ne: "cancelled" },
  })
    .populate("society", "name slug color")
    .sort({ startAt: 1 })
    .limit(3)
    .lean();

  const [counts, registration, viewerDoc] = await Promise.all([
    statsFor([event._id, ...related.map((row) => row._id)]),
    user ? Registration.findOne({ event: event._id, user: user.id }).lean() : null,
    user ? User.findById(user.id).select("savedEvents").lean() : null,
  ]);

  const phase = eventPhase(event);
  let feedback = null;
  if (event.feedbackEnabled || event.status === "completed" || phase === "completed") {
    const [row] = await EventFeedback.aggregate([
      { $match: { event: event._id } },
      { $group: { _id: null, average: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    feedback = {
      enabled: Boolean(event.feedbackEnabled),
      average: row?.average ? Math.round(row.average * 10) / 10 : 0,
      count: row?.count || 0,
    };
  }

  const saved = (viewerDoc?.savedEvents || []).some((savedId) => String(savedId) === String(event._id));

  return ok({
    item: mapEvent(event, counts[String(event._id)] || {}),
    related: related.map((row) => mapEvent(row, counts[String(row._id)] || {})),
    feedback,
    viewer: {
      registration: mapRegistration(registration, null),
      saved: Boolean(saved),
    },
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(4).max(140).optional(),
  excerpt: z.string().trim().max(300).optional(),
  description: z.string().trim().min(20).optional(),
  category: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  registrationOpenAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  venue: z.string().trim().min(2).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  registrationType: z.enum(["open", "approval"]).optional(),
  requirements: z.string().trim().max(2000).optional(),
  notes: z.string().trim().max(2000).optional(),
  rules: z.union([z.array(z.string()), z.string()]).optional(),
  highlights: z.union([z.array(z.string()), z.string()]).optional(),
  gallery: z.union([z.array(z.string()), z.string()]).optional(),
  featured: z.boolean().optional(),
  feedbackEnabled: z.boolean().optional(),
  poster: z.string().trim().max(500).optional(),
  status: z.enum(EVENT_STATUSES).optional(),
  societyId: z.string().trim().nullable().optional(),
  organizerId: z.string().trim().optional(),
  organizer: z.string().trim().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_events");
  if (response) return response;
  if (!isObjectId(id)) return fail("Event not found.", 404);

  await connectDB();
  const event = await Event.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!event) return fail("Event not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const update = {};
  const copyKeys = [
    "title",
    "excerpt",
    "description",
    "category",
    "type",
    "venue",
    "capacity",
    "registrationType",
    "requirements",
    "notes",
    "featured",
    "feedbackEnabled",
    "poster",
    "status",
  ];
  for (const key of copyKeys) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  for (const key of ["rules", "highlights", "gallery"]) {
    if (data[key] !== undefined) update[key] = toList(data[key]);
  }

  const dateKeys = ["startAt", "endAt", "registrationOpenAt", "registrationDeadline"];
  if (dateKeys.some((key) => data[key] !== undefined)) {
    const dates = {
      registrationOpenAt: new Date(data.registrationOpenAt ?? event.registrationOpenAt),
      registrationDeadline: new Date(data.registrationDeadline ?? event.registrationDeadline),
      startAt: new Date(data.startAt ?? event.startAt),
      endAt: new Date(data.endAt ?? event.endAt),
    };
    if (Object.values(dates).some((date) => Number.isNaN(date.getTime()))) {
      return fail("Enter valid event dates.", 422);
    }
    if (dates.registrationOpenAt >= dates.registrationDeadline) {
      return fail("Registration must open before the deadline.", 422);
    }
    if (dates.registrationDeadline > dates.startAt) {
      return fail("Registration deadline must be on or before the event start.", 422);
    }
    if (dates.startAt >= dates.endAt) return fail("Event end must be after the start.", 422);
    for (const key of dateKeys) {
      if (data[key] !== undefined) update[key] = dates[key];
    }
  }

  if (update.capacity !== undefined) {
    const active = await Registration.countDocuments({
      event: event._id,
      status: { $in: ["pending", "approved", "attended", "absent"] },
    });
    if (update.capacity < active) {
      return fail(`Capacity cannot be below the ${active} existing registrations.`, 422);
    }
  }

  if (data.societyId !== undefined) {
    if (!data.societyId) {
      update.society = null;
    } else {
      if (!isObjectId(data.societyId)) return fail("Select a valid society.", 422);
      const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
      if (!society) return fail("Society not found.", 422);
      update.society = society._id;
    }
  }

  const organizerRef = String(data.organizerId ?? data.organizer ?? "").trim();
  if (organizerRef) {
    if (!isObjectId(organizerRef)) return fail("Select a valid organizer.", 422);
    const organizer = await User.findOne({ _id: organizerRef, institute: user.instituteId }).lean();
    if (!organizer) return fail("Organizer not found.", 422);
    update.organizer = organizer._id;
    update.organizerName = organizer.name;
  }

  const updated = await Event.findByIdAndUpdate(event._id, { $set: update }, { returnDocument: "after" })
    .populate("society", "name slug color")
    .lean();

  if (update.status === "cancelled" && event.status !== "cancelled") {
    await notifyMany(
      (
        await Registration.find({ event: event._id, status: { $in: ["approved", "attended"] } })
          .select("user")
          .lean()
      ).map((registration) => ({
        institute: event.institute,
        user: registration.user,
        type: "event",
        title: `Event cancelled · ${event.title}`,
        message: "The organiser has cancelled this event. Your registration has been cancelled as well.",
        link: `/events/${event.slug}`,
      }))
    );
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "event.update",
    entityType: "Event",
    entityId: event._id,
    summary: `Updated event ${updated.title}.`,
    meta: { fields: Object.keys(update) },
  });

  const counts = await statsFor([updated._id]);
  return ok({ item: mapEvent(updated, counts[String(updated._id)] || {}) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_events");
  if (response) return response;
  if (!isObjectId(id)) return fail("Event not found.", 404);

  await connectDB();
  const event = await Event.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!event) return fail("Event not found.", 404);

  if (event.status !== "cancelled") {
    await Event.updateOne({ _id: event._id }, { $set: { status: "cancelled" } });
    const registrations = await Registration.find({
      event: event._id,
      status: { $in: ["approved", "attended"] },
    })
      .select("user")
      .lean();
    await notifyMany(
      registrations.map((registration) => ({
        institute: event.institute,
        user: registration.user,
        type: "event",
        title: `Event cancelled · ${event.title}`,
        message: "The organiser has cancelled this event. Any updates will appear on your dashboard.",
        link: `/events/${event.slug}`,
      }))
    );
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "event.cancel",
    entityType: "Event",
    entityId: event._id,
    summary: `Cancelled event ${event.title}.`,
  });

  return ok({ cancelled: true });
}
