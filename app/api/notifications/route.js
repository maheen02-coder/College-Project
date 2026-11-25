import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import Notification from "@/lib/models/Notification";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const limit = Math.min(Number(searchParams.get("limit")) || 20, 60);

  const [notifications, unread] = await Promise.all([
    Notification.find({ user: user.id }).sort({ createdAt: -1 }).limit(limit).lean(),
    Notification.countDocuments({ user: user.id, read: false }),
  ]);

  return ok({
    unread,
    notifications: notifications.map((item) => ({
      id: String(item._id),
      type: item.type,
      title: item.title,
      message: item.message,
      link: item.link,
      read: item.read,
      createdAt: new Date(item.createdAt).toISOString(),
    })),
  });
}

export async function PATCH(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  const body = await readJson(request);
  const parsed = z
    .object({ id: z.string().optional(), all: z.boolean().optional() })
    .safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  await connectDB();
  if (parsed.data.all) {
    await Notification.updateMany({ user: user.id, read: false }, { $set: { read: true } });
    return ok({ updated: true });
  }
  if (!parsed.data.id) return fail("Notification id is required.", 422);

  await Notification.updateOne({ _id: parsed.data.id, user: user.id }, { $set: { read: true } });
  return ok({ updated: true });
}
