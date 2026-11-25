import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { eventPhase } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Registration from "@/lib/models/Registration";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapRegistration(registration, event) {
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

const adminSchema = z.object({
  status: z.enum(["pending", "approved", "rejected", "attended", "absent"]).optional(),
  attendance: z.enum(["unmarked", "present", "absent"]).optional(),
  note: z.string().trim().max(400).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const registration = await Registration.findById(id);
  if (!registration) return fail("Registration not found.", 404);

  const event = await Event.findById(registration.event).lean();
  if (!event) return fail("Event not found.", 404);

  const isOwner = String(registration.user) === String(user.id);
  const isRegAdmin =
    isAdmin(user) &&
    hasAdminPermission(user, "manage_registrations") &&
    String(registration.institute) === String(user.instituteId);

  const body = await readJson(request);

  if (isRegAdmin) {
    const parsed = adminSchema.safeParse(body);
    if (!parsed.success) return fail(firstIssue(parsed.error), 422);
    const data = parsed.data;
    if (data.status === undefined && data.attendance === undefined && data.note === undefined) {
      return fail("Provide a status, attendance or note to update.", 422);
    }

    const now = new Date();
    const update = {};
    const unset = {};

    if (data.note !== undefined) update.note = data.note;

    let status = data.status;
    let attendance = data.attendance;
    if (!status && attendance) {
      if (attendance === "present") status = "attended";
      else if (attendance === "absent") status = "absent";
      else if (["attended", "absent"].includes(registration.status)) status = "approved";
    }
    if (status) update.status = status;
    if (status === "attended") attendance = "present";
    if (status === "absent") attendance = "absent";
    if (status && ["pending", "approved", "rejected"].includes(status) && !data.attendance) {
      attendance = "unmarked";
    }

    if (attendance) {
      update.attendance = attendance;
      if (attendance === "present") {
        update.attendedAt = registration.attendance === "present" && registration.attendedAt ? registration.attendedAt : now;
        update.markedBy = user.id;
      } else {
        unset.attendedAt = 1;
      }
    }

    const operation = { $set: update };
    if (Object.keys(unset).length) operation.$unset = unset;
    const updated = await Registration.findByIdAndUpdate(registration._id, operation, { returnDocument: "after" }).lean();

    if (status === "approved" || status === "rejected") {
      await notify({
        instituteId: registration.institute,
        userId: registration.user,
        type: "registration",
        title:
          status === "approved"
            ? `Registration approved · ${event.title}`
            : `Registration rejected · ${event.title}`,
        message:
          status === "approved"
            ? `You are confirmed for ${event.title}. Venue: ${event.venue}.`
            : `Your registration for ${event.title} was not approved. Contact the organiser for details.`,
        link: `/events/${event.slug}`,
      });
    }

    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "registration.update",
      entityType: "Registration",
      entityId: registration._id,
      summary: `Updated registration ${registration.registrationId} for ${event.title}.`,
      meta: { status: updated.status, attendance: updated.attendance },
    });

    return ok({ item: mapRegistration(updated, event) });
  }

  if (!isOwner) return fail("You do not have permission to do that.", 403);

  const action = String(body.action || "").trim();
  if (action !== "cancel" && body.status !== "cancelled") {
    return fail("You can only cancel this registration.", 403);
  }
  if (new Date(event.endAt) <= new Date()) {
    return fail("This event has already ended — registrations can no longer be cancelled.", 409);
  }
  if (!["pending", "approved"].includes(registration.status)) {
    return fail("This registration can no longer be cancelled.", 409);
  }

  registration.status = "cancelled";
  registration.cancelledAt = new Date();
  await registration.save();

  return ok({ item: mapRegistration(registration.toObject(), event), cancelled: true });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user) || !hasAdminPermission(user, "manage_registrations")) {
    return fail("You do not have permission to do that.", 403);
  }

  await connectDB();
  const registration = await Registration.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!registration) return fail("Registration not found.", 404);

  await Registration.deleteOne({ _id: registration._id });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "registration.delete",
    entityType: "Registration",
    entityId: registration._id,
    summary: `Deleted registration ${registration.registrationId}.`,
  });

  return ok({ deleted: true });
}
