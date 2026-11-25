import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { verifyAttendanceToken } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { clientKey, rateLimit } from "@/lib/ratelimit";
import { eventPhase } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";

export const dynamic = "force-dynamic";

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapEvent(event) {
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
    status: eventPhase(event),
    storedStatus: event.status,
  };
}

function mapRegistration(registration) {
  return {
    id: String(registration._id),
    registrationId: registration.registrationId,
    status: registration.status,
    attendance: registration.attendance || "unmarked",
    markedVia: registration.markedVia || "manual",
    attendedAt: iso(registration.attendedAt),
    registeredAt: iso(registration.createdAt),
  };
}

const schema = z.object({ token: z.string().trim().min(10, "Scan a valid attendance QR code.") });

export async function POST(request) {
  const limited = rateLimit(clientKey(request, "attend"), { limit: 30, windowMs: 60000 });
  if (!limited.ok) {
    return fail("Too many check-in attempts. Try again shortly.", 429, { retryAfter: limited.retryAfter });
  }

  const { user, response } = await requireUser(["student"]);
  if (response) return response;
  if (user.verificationStatus !== "verified") {
    return fail("Your student account must be verified to check in.", 403);
  }

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  const payload = await verifyAttendanceToken(parsed.data.token);
  if (!payload || !payload.event) return fail("This attendance code is invalid or has expired.", 400);
  if (String(payload.institute) !== String(user.instituteId)) {
    return fail("This attendance code belongs to another institute.", 403);
  }
  if (!isObjectId(payload.event)) return fail("This attendance code is invalid.", 400);

  await connectDB();
  const event = await Event.findOne({ _id: payload.event, institute: user.instituteId }).lean();
  if (!event) return fail("Event not found.", 404);
  if (event.status === "cancelled" || eventPhase(event) === "cancelled") {
    return fail("This event has been cancelled.", 409);
  }

  const registration = await Registration.findOne({ event: event._id, user: user.id });
  if (!registration) return fail("You are not registered for this event.", 409);
  if (registration.status === "pending") {
    return fail("Your registration is still awaiting approval.", 409);
  }
  if (["cancelled", "rejected"].includes(registration.status)) {
    return fail("Your registration for this event is not active.", 409);
  }

  if (registration.attendance === "present") {
    return ok({
      already: true,
      item: mapEvent(event),
      registration: mapRegistration(registration),
      points: 0,
    });
  }

  const now = new Date();
  registration.attendance = "present";
  registration.status = "attended";
  registration.markedVia = "qr";
  registration.attendedAt = now;
  await registration.save();

  const points = await awardPoints({
    institute: event.institute,
    userId: user.id,
    action: "event_attendance",
    sourceType: "event_registration",
    sourceId: registration._id,
    note: `QR check-in at ${event.title}`,
  });

  await notify({
    instituteId: event.institute,
    userId: user.id,
    type: "event",
    title: `Checked in · ${event.title}`,
    message: `Your attendance is confirmed.${points ? ` ${points} points added to your profile.` : ""}`,
    link: `/events/${event.slug}`,
  });

  return ok({
    already: false,
    item: mapEvent(event),
    registration: mapRegistration(registration),
    points: points || 0,
  });
}
