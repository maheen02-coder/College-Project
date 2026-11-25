import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireStudent, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { eventPhase, makeId } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const EVENT_FIELDS =
  "title slug poster category type startAt endAt venue capacity registrationDeadline registrationOpenAt status";
const USER_FIELDS = "name email matricRollNumber rollNumber classYear section department program semester avatar";
const ACTIVE = ["pending", "approved", "attended", "absent"];

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapEvent(event) {
  if (!event) return null;
  return {
    id: String(event._id),
    title: event.title,
    slug: event.slug,
    poster: event.poster || "",
    category: event.category,
    type: event.type,
    startAt: iso(event.startAt),
    endAt: iso(event.endAt),
    venue: event.venue,
    capacity: Number(event.capacity) || 0,
    registrationOpenAt: iso(event.registrationOpenAt),
    registrationDeadline: iso(event.registrationDeadline),
    status: eventPhase(event),
    storedStatus: event.status,
    society: event.society
      ? {
          id: String(event.society._id || event.society),
          name: event.society.name || "",
          slug: event.society.slug || "",
          color: event.society.color || "#7c3aed",
        }
      : null,
  };
}

function mapUser(student) {
  if (!student) return null;
  return {
    id: String(student._id || ""),
    name: student.name || "Unknown student",
    email: student.email || "",
    matricRollNumber: student.matricRollNumber || "",
    rollNumber: student.rollNumber || "",
    classYear: student.classYear || "",
    section: student.section || "",
    department: student.department || "",
    program: student.program || "",
    semester: student.semester || "",
    avatar: student.avatar || "",
  };
}

function mapRegistration(registration, { withUser = false } = {}) {
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
    event: mapEvent(registration.event),
    user: withUser ? mapUser(registration.user) : undefined,
  };
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();

  const { searchParams } = new URL(request.url);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 100, 1), 300);
  const isRegAdmin = isAdmin(user) && hasAdminPermission(user, "manage_registrations");

  if (isRegAdmin) {
    const query = { institute: user.instituteId };

    const eventId = searchParams.get("eventId");
    if (eventId) {
      if (!/^[0-9a-fA-F]{24}$/.test(eventId)) return ok({ items: [], total: 0 });
      query.event = eventId;
    }

    const status = searchParams.get("status");
    if (status && status !== "all") query.status = status;

    const attendance = searchParams.get("attendance");
    if (attendance && attendance !== "all") query.attendance = attendance;

    const q = (searchParams.get("q") || "").trim();
    if (q) {
      const pattern = new RegExp(escapeRegex(q), "i");
      const matches = await User.find({
        institute: user.instituteId,
        $or: [{ name: pattern }, { email: pattern }, { matricRollNumber: pattern }, { rollNumber: pattern }],
      })
        .select("_id")
        .limit(300)
        .lean();
      query.user = { $in: matches.map((row) => row._id) };
    }

    const registrations = await Registration.find(query)
      .populate({ path: "event", select: `${EVENT_FIELDS} society`, populate: { path: "society", select: "name slug color" } })
      .populate("user", USER_FIELDS)
      .sort({ createdAt: -1 })
      .limit(limit)
      .lean();

    return ok({
      items: registrations.map((registration) => mapRegistration(registration, { withUser: true })),
      total: registrations.length,
    });
  }

  const registrations = await Registration.find({ user: user.id })
    .populate({
      path: "event",
      select: `${EVENT_FIELDS} society`,
      populate: { path: "society", select: "name slug color" },
    })
    .sort({ createdAt: -1 })
    .limit(limit)
    .lean();

  const items = registrations.filter((registration) => registration.event).map((registration) => mapRegistration(registration));

  return ok({ items, total: items.length });
}

const schema = z.object({ eventId: z.string().min(1, "Select an event.") });

export async function POST(request) {
  const { user, response } = await requireStudent();
  if (response) return response;
  if (user.verificationStatus !== "verified") {
    return fail("Your student account must be verified to register for events.", 403);
  }

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  await connectDB();
  if (!/^[0-9a-fA-F]{24}$/.test(parsed.data.eventId)) return fail("Event not found.", 404);
  const event = await Event.findOne({ _id: parsed.data.eventId, institute: user.instituteId }).lean();
  if (!event) return fail("Event not found.", 404);
  if (event.status === "cancelled") return fail("This event has been cancelled.", 409);
  if (event.status === "postponed") return fail("This event has been postponed. Registration is paused.", 409);

  const now = new Date();
  if (now < new Date(event.registrationOpenAt)) {
    return fail("Registration has not opened yet.", 409);
  }
  if (now > new Date(event.registrationDeadline)) {
    return fail("Registration is closed for this event.", 409);
  }

  const existing = await Registration.findOne({ event: event._id, user: user.id });
  if (existing && existing.status !== "cancelled") {
    return fail("You are already registered for this event.", 409);
  }

  const count = await Registration.countDocuments({ event: event._id, status: { $in: ACTIVE } });
  if (count >= event.capacity) {
    return fail("This event has reached full capacity.", 409);
  }

  const status = event.registrationType === "approval" ? "pending" : "approved";

  let registration;
  try {
    if (existing) {
      existing.status = status;
      existing.attendance = "unmarked";
      existing.markedVia = "manual";
      existing.cancelledAt = undefined;
      existing.attendedAt = undefined;
      if (!existing.registrationId) existing.registrationId = makeId("KIPS-REG", 6);
      registration = await existing.save();
    } else {
      registration = await Registration.create({
        institute: event.institute,
        event: event._id,
        user: user.id,
        registrationId: makeId("KIPS-REG", 6),
        status,
      });
    }
  } catch (error) {
    if (error?.code === 11000) return fail("You are already registered for this event.", 409);
    throw error;
  }

  if (status === "pending") {
    await notify({
      instituteId: event.institute,
      userId: user.id,
      type: "registration",
      title: `Registration requested · ${event.title}`,
      message: `Your registration is awaiting approval. We will notify you once the organiser reviews it.`,
      link: `/events/${event.slug}`,
    });
  }

  return ok(
    {
      item: {
        id: String(registration._id),
        registrationId: registration.registrationId,
        status: registration.status,
        attendance: registration.attendance || "unmarked",
        registeredAt: iso(registration.createdAt),
        event: mapEvent(event),
      },
      remaining: Math.max(0, event.capacity - count - 1),
    },
    { status: 201 }
  );
}
