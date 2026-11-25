import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const pointSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    action: { type: String, required: true },
    points: { type: Number, required: true },
    sourceType: { type: String, default: "" },
    sourceId: { type: Schema.Types.ObjectId },
    note: { type: String, default: "" },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

pointSchema.index({ user: 1, createdAt: -1 });
pointSchema.index({ user: 1, sourceType: 1, sourceId: 1 }, { unique: true, partialFilterExpression: { sourceId: { $exists: true } } });

export default models.StudentPoint || model("StudentPoint", pointSchema);
