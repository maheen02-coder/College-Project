import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireStudent, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import Event from "@/lib/models/Event";
import EventFeedback from "@/lib/models/EventFeedback";
import Registration from "@/lib/models/Registration";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapFeedback(item, includeUser = false) {
  const event = item.event && item.event.title ? item.event : null;
  const user = item.user && item.user.name ? item.user : null;
  return {
    id: String(item._id),
    rating: item.rating,
    organization: item.organization ?? null,
    quality: item.quality ?? null,
    suggestions: item.suggestions || "",
    createdAt: iso(item.createdAt),
    event: event
      ? { id: String(event._id), title: event.title, slug: event.slug }
      : null,
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

  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");
  if (eventId && eventId !== "all" && !mongoose.isValidObjectId(eventId)) {
    return fail("Invalid event.", 422);
  }

  await connectDB();
  const adminAccess = isAdmin(user) && hasAdminPermission(user, "manage_feedback");

  if (!adminAccess) {
    const rows = await EventFeedback.find({ institute: user.instituteId, user: user.id })
      .populate("event", "title slug")
      .sort({ createdAt: -1 })
      .lean();
    return ok({ items: rows.map((row) => mapFeedback(row)) });
  }

  const query = { institute: user.instituteId };
  const filterEventId = eventId && eventId !== "all" ? eventId : "";
  if (filterEventId) query.event = filterEventId;

  const rows = await EventFeedback.find(query)
    .populate("user", "name avatar matricRollNumber")
    .populate("event", "title slug")
    .sort({ createdAt: -1 })
    .limit(300)
    .lean();

  const match = { institute: new mongoose.Types.ObjectId(user.instituteId) };
  if (filterEventId) match.event = new mongoose.Types.ObjectId(filterEventId);

  const aggregates = await EventFeedback.aggregate([
    { $match: match },
    {
      $group: {
        _id: "$event",
        count: { $sum: 1 },
        rating: { $avg: "$rating" },
        organization: { $avg: "$organization" },
        quality: { $avg: "$quality" },
      },
    },
    { $lookup: { from: "events", localField: "_id", foreignField: "_id", as: "event" } },
    { $unwind: "$event" },
    {
      $project: {
        _id: 0,
        eventId: { $toString: "$_id" },
        title: "$event.title",
        slug: "$event.slug",
        count: 1,
        rating: { $round: ["$rating", 1] },
        organization: { $round: ["$organization", 1] },
        quality: { $round: ["$quality", 1] },
      },
    },
    { $sort: { count: -1 } },
  ]);

  return ok({
    items: rows.map((row) => mapFeedback(row, true)),
    aggregate: aggregates,
  });
}

const createSchema = z.object({
  eventId: z.string().min(1, "Select an event."),
  rating: z.coerce.number().int().min(1, "Choose a rating.").max(5),
  organization: z.coerce.number().int().min(1).max(5).optional(),
  quality: z.coerce.number().int().min(1).max(5).optional(),
  suggestions: z.string().trim().max(1000).optional().default(""),
});

export async function POST(request) {
  const { user, response } = await requireStudent();
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.eventId)) return fail("Invalid event.", 422);

  await connectDB();
  const event = await Event.findOne({
    _id: data.eventId,
    institute: user.instituteId,
  }).lean();
  if (!event) return fail("Event not found.", 404);
  if (!event.feedbackEnabled) return fail("Feedback is not open for this event.", 409);
  if (new Date(event.endAt) >= new Date()) {
    return fail("Feedback opens after the event has ended.", 409);
  }

  const registration = await Registration.findOne({
    event: event._id,
    user: user.id,
    status: { $in: ["approved", "attended"] },
  })
    .select("_id")
    .lean();
  if (!registration) {
    return fail("Only approved or attended participants can share feedback.", 403);
  }

  const existing = await EventFeedback.exists({ event: event._id, user: user.id });
  if (existing) return fail("You have already submitted feedback for this event.", 409);

  let feedback;
  try {
    feedback = await EventFeedback.create({
      institute: user.instituteId,
      event: event._id,
      user: user.id,
      rating: data.rating,
      organization: data.organization,
      quality: data.quality,
      suggestions: data.suggestions,
    });
  } catch (error) {
    if (error?.code === 11000) {
      return fail("You have already submitted feedback for this event.", 409);
    }
    throw error;
  }

  const item = await EventFeedback.findById(feedback._id)
    .populate("event", "title slug")
    .lean();

  return ok({ item: mapFeedback(item) }, { status: 201 });
}
