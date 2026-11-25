import QRCode from "qrcode";
import { connectDB } from "@/lib/db";
import { fail, ok, requireAdmin } from "@/lib/api";
import { hasAdminPermission, signAttendanceToken } from "@/lib/auth";
import { eventPhase } from "@/lib/utils";
import Event from "@/lib/models/Event";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin();
  if (response) return response;
  if (!hasAdminPermission(user, "manage_attendance") && !hasAdminPermission(user, "manage_events")) {
    return fail("You do not have permission to do that.", 403);
  }
  if (!isObjectId(id)) return fail("Event not found.", 404);

  await connectDB();
  const event = await Event.findOne({ _id: id, institute: user.instituteId })
    .populate("society", "name slug color")
    .lean();
  if (!event) return fail("Event not found.", 404);

  const token = await signAttendanceToken(event._id, user.instituteId);
  const origin = new URL(request.url).origin;
  const url = `${origin}/attend/${token}`;
  const qr = await QRCode.toDataURL(url, {
    margin: 1,
    width: 512,
    color: { dark: "#111827", light: "#ffffff" },
  });

  return ok({
    token,
    url,
    qr,
    item: {
      id: String(event._id),
      title: event.title,
      slug: event.slug,
      startAt: iso(event.startAt),
      endAt: iso(event.endAt),
      venue: event.venue,
      capacity: Number(event.capacity) || 0,
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
    },
  });
}
