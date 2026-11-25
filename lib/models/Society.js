import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const societySchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    tagline: { type: String, default: "" },
    description: { type: String, default: "" },
    purpose: { type: String, default: "" },
    activities: { type: [String], default: [] },
    logo: { type: String, default: "" },
    cover: { type: String, default: "" },
    color: { type: String, default: "#7c3aed" },
    category: { type: String, default: "General" },
    foundedYear: { type: Number, default: null },
    email: { type: String, default: "" },
    meetingSchedule: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    featured: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

societySchema.index({ institute: 1, slug: 1 }, { unique: true });
societySchema.index({ institute: 1, isActive: 1 });

export default models.Society || model("Society", societySchema);
