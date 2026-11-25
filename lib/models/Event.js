import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const eventSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", index: true },
    title: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    excerpt: { type: String, default: "" },
    description: { type: String, required: true },
    poster: { type: String, default: "" },
    category: { type: String, required: true },
    type: { type: String, required: true },
    startAt: { type: Date, required: true, index: true },
    endAt: { type: Date, required: true },
    venue: { type: String, required: true },
    organizer: { type: Schema.Types.ObjectId, ref: "User" },
    organizerName: { type: String, default: "" },
    registrationOpenAt: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    capacity: { type: Number, default: 100, min: 1 },
    registrationType: { type: String, enum: ["open", "approval"], default: "open" },
    requirements: { type: String, default: "" },
    notes: { type: String, default: "" },
    rules: { type: [String], default: [] },
    highlights: { type: [String], default: [] },
    gallery: { type: [String], default: [] },
    feedbackEnabled: { type: Boolean, default: false },
    featured: { type: Boolean, default: false },
    status: {
      type: String,
      enum: [
        "upcoming",
        "registration_open",
        "registration_closed",
        "ongoing",
        "completed",
        "cancelled",
        "postponed",
      ],
      default: "upcoming",
    },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

eventSchema.index({ institute: 1, slug: 1 }, { unique: true });
eventSchema.index({ institute: 1, startAt: 1 });
eventSchema.index({ society: 1, startAt: -1 });

export default models.Event || model("Event", eventSchema);
