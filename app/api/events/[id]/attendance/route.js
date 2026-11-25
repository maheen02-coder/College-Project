import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { eventPhase } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";

export const dynamic = "force-dynamic";

const USER_FIELDS = "name email matricRollNumber rollNumber classYear section department program semester avatar";

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapEvent(event) {
  const capacity = Number(event.capacity) || 0;
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
    capacity,
    registrationType: event.registrationType || "open",
    phase: eventPhase(event),
    status: eventPhase(event),
    storedStatus: event.status,
    society: event.society
      ? {
          id: String(event.society._id),
          name: event.society.name || "",
          slug: event.society.slug || "",
          color: event.society.color || "#7c3aed",
        }
      : null,
  };
}

function mapRegistration(registration) {
  const student = registration.user || {};
  return {
    id: String(registration._id),
    registrationId: registration.registrationId,
    status: registration.status,
    attendance: registration.attendance || "unmarked",
    markedVia: registration.markedVia || "manual",
    note: registration.note || "",
    registeredAt: iso(registration.createdAt),
    attendedAt: iso(registration.attendedAt),
    user: {
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
    },
  };
}

function buildStats(registrations) {
  const stats = {
    total: registrations.length,
    present: 0,
    absent: 0,
    unmarked: 0,
    approved: 0,
    pending: 0,
  };
  for (const registration of registrations) {
    if (registration.attendance === "present") stats.present += 1;
    else if (registration.attendance === "absent") stats.absent += 1;
    else stats.unmarked += 1;
    if (registration.status === "approved") stats.approved += 1;
    if (registration.status === "pending") stats.pending += 1;
  }
  stats.rate = stats.present + stats.absent ? Math.round((stats.present / (stats.present + stats.absent)) * 100) : 0;
  return stats;
}

async function loadRegistrations(eventId) {
  return Registration.find({ event: eventId, status: { $ne: "cancelled" } })
    .populate("user", USER_FIELDS)
    .sort({ createdAt: 1 })
    .lean();
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_attendance");
  if (response) return response;
  if (!isObjectId(id)) return fail("Event not found.", 404);

  await connectDB();
  const event = await Event.findOne({ _id: id, institute: user.instituteId })
    .populate("society", "name slug color")
    .lean();
  if (!event) return fail("Event not found.", 404);

  const registrations = await loadRegistrations(event._id);
  const items = registrations.map(mapRegistration);

  return ok({
    item: mapEvent(event),
    items,
    stats: buildStats(registrations),
  });
}

const schema = z.object({
  registrationIds: z.array(z.string()).optional().default([]),
  userIds: z.array(z.string()).optional().default([]),
  action: z.enum(["present", "absent", "unmarked"]),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_attendance");
  if (response) return response;
  if (!isObjectId(id)) return fail("Event not found.", 404);

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const { action } = parsed.data;

  const registrationIds = parsed.data.registrationIds.filter(isObjectId);
  const userIds = parsed.data.userIds.filter(isObjectId);
  if (!registrationIds.length && !userIds.length) {
    return fail("Select at least one registration.", 422);
  }

  await connectDB();
  const event = await Event.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!event) return fail("Event not found.", 404);

  const conditions = [];
  if (registrationIds.length) conditions.push({ _id: { $in: registrationIds } });
  if (userIds.length) conditions.push({ user: { $in: userIds } });

  const registrations = await Registration.find({
    event: event._id,
    status: { $ne: "cancelled" },
    $or: conditions,
  }).lean();

  if (!registrations.length) return fail("No matching registrations found.", 404);

  const now = new Date();
  let awarded = 0;
  let notified = 0;

  for (const registration of registrations) {
    const update = { markedVia: "manual", markedBy: user.id };
    let unsetAttendedAt = false;

    if (action === "present") {
      update.attendance = "present";
      update.status = "attended";
      const firstTime = registration.attendance !== "present";
      if (registration.attendance === "present" && registration.attendedAt) {
        update.attendedAt = registration.attendedAt;
      } else {
        update.attendedAt = now;
      }
      await Registration.updateOne({ _id: registration._id }, { $set: update });
      if (firstTime) {
        const points = await awardPoints({
          institute: event.institute,
          userId: registration.user,
          action: "event_attendance",
          sourceType: "event_registration",
          sourceId: registration._id,
          note: `Attendance at ${event.title}`,
          awardedBy: user.id,
        });
        if (points) awarded += 1;
        await notify({
          instituteId: event.institute,
          userId: registration.user,
          type: "event",
          title: `Attendance marked · ${event.title}`,
          message: `You were marked present at ${event.title}.${points ? ` ${points} points added to your profile.` : ""}`,
          link: `/events/${event.slug}`,
        });
        notified += 1;
      }
      continue;
    }

    if (action === "absent") {
      update.attendance = "absent";
      update.status = "absent";
      unsetAttendedAt = true;
    } else {
      update.attendance = "unmarked";
      update.status = ["attended", "absent"].includes(registration.status) ? "approved" : registration.status;
      unsetAttendedAt = true;
    }

    const operation = { $set: update };
    if (unsetAttendedAt) operation.$unset = { attendedAt: 1 };
    await Registration.updateOne({ _id: registration._id }, operation);
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "event.attendance",
    entityType: "Event",
    entityId: event._id,
    summary: `Marked ${registrations.length} registration(s) ${action} for ${event.title}.`,
    meta: { action, count: registrations.length },
  });

  const refreshed = await loadRegistrations(event._id);
  return ok({
    stats: buildStats(refreshed),
    updated: registrations.length,
    awarded,
    notified,
  });
}
