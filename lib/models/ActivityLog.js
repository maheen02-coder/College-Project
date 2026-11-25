import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const activityLogSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    actor: { type: Schema.Types.ObjectId, ref: "User" },
    actorName: { type: String, default: "" },
    actorRole: { type: String, default: "" },
    action: { type: String, required: true },
    entityType: { type: String, default: "" },
    entityId: { type: Schema.Types.ObjectId },
    summary: { type: String, default: "" },
    meta: { type: Schema.Types.Mixed },
  },
  { timestamps: true }
);

activityLogSchema.index({ institute: 1, createdAt: -1 });
activityLogSchema.index({ entityType: 1, entityId: 1 });

export default models.ActivityLog || model("ActivityLog", activityLogSchema);
