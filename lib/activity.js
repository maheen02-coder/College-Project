import ActivityLog from "@/lib/models/ActivityLog";

export async function logActivity({ institute, actor, action, entityType = "", entityId, summary = "", meta }) {
  if (!institute || !actor || !action) return null;
  return ActivityLog.create({
    institute,
    actor: actor.id || actor._id,
    actorName: actor.name || "",
    actorRole: actor.role || "",
    action,
    entityType,
    entityId: entityId || undefined,
    summary,
    meta,
  });
}
