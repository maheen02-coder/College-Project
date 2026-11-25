import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const achievementSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    type: { type: String, enum: ["badge", "award", "recognition", "milestone"], default: "badge" },
    icon: { type: String, default: "star" },
    points: { type: Number, default: 0 },
    awardedBy: { type: Schema.Types.ObjectId, ref: "User" },
    awardedAt: { type: Date, default: Date.now },
    isVisible: { type: Boolean, default: true },
  },
  { timestamps: true }
);

achievementSchema.index({ user: 1, awardedAt: -1 });

export default models.Achievement || model("Achievement", achievementSchema);
