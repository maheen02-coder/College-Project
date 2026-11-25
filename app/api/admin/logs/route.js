import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { fail, ok, requireAdmin } from "@/lib/api";
import ActivityLog from "@/lib/models/ActivityLog";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function GET(request) {
  const { user, response } = await requireAdmin("view_logs");
  if (response) return response;

  const { searchParams } = new URL(request.url);
  const query = { institute: user.instituteId };

  const actor = searchParams.get("actor");
  const action = searchParams.get("action");
  const entityType = searchParams.get("entityType");
  const q = searchParams.get("q");
  const limitParam = Number(searchParams.get("limit"));
  const limit = Math.min(
    Math.max(Number.isFinite(limitParam) && limitParam > 0 ? Math.floor(limitParam) : 100, 1),
    200
  );

  if (actor && actor !== "all") {
    if (!mongoose.isValidObjectId(actor)) return fail("Invalid actor.", 422);
    query.actor = actor;
  }
  if (action && action !== "all") {
    query.action = { $regex: `^${escapeRegex(action)}` };
  }
  if (entityType && entityType !== "all") {
    query.entityType = entityType;
  }
  if (q) {
    query.summary = { $regex: escapeRegex(q), $options: "i" };
  }

  await connectDB();
  const rows = await ActivityLog.find(query).sort({ createdAt: -1 }).limit(limit).lean();

  return ok({
    logs: rows.map((row) => ({
      id: String(row._id),
      action: row.action,
      entityType: row.entityType || "",
      entityId: row.entityId ? String(row.entityId) : null,
      summary: row.summary || "",
      meta: row.meta || null,
      actor: row.actor ? String(row.actor) : null,
      actorName: row.actorName || "",
      actorRole: row.actorRole || "",
      createdAt: iso(row.createdAt),
    })),
  });
}
