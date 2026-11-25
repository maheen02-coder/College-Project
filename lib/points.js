import StudentPoint from "@/lib/models/StudentPoint";
import User from "@/lib/models/User";
import { POINT_ACTIONS } from "@/lib/constants";

export async function awardPoints({ institute, userId, action, sourceType = "", sourceId, note = "", awardedBy, points }) {
  if (!institute || !userId || !action) return null;
  const preset = POINT_ACTIONS[action];
  const value = Number.isFinite(points) ? points : preset?.points || 0;
  if (!value) return null;
  try {
    await StudentPoint.create({
      institute,
      user: userId,
      action,
      points: value,
      sourceType,
      sourceId: sourceId || undefined,
      note,
      awardedBy,
    });
    await User.updateOne({ _id: userId }, { $inc: { points: value } });
    return value;
  } catch (error) {
    if (error?.code === 11000) return null;
    throw error;
  }
}
