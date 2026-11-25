import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const competitionSchema = new Schema(
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
    mode: { type: String, enum: ["individual", "team"], default: "individual" },
    teamSize: {
      min: { type: Number, default: 1 },
      max: { type: Number, default: 1 },
    },
    venue: { type: String, required: true },
    startAt: { type: Date, required: true },
    endAt: { type: Date, required: true },
    registrationDeadline: { type: Date, required: true },
    submissionDeadline: { type: Date },
    capacity: { type: Number, default: 60, min: 1 },
    prizeDetails: { type: String, default: "" },
    rules: { type: [String], default: [] },
    requirements: { type: String, default: "" },
    organizer: { type: Schema.Types.ObjectId, ref: "User" },
    organizerName: { type: String, default: "" },
    status: {
      type: String,
      enum: ["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"],
      default: "upcoming",
    },
    leaderboardPublished: { type: Boolean, default: false },
  },
  { timestamps: true }
);

competitionSchema.index({ institute: 1, slug: 1 }, { unique: true });
competitionSchema.index({ society: 1, startAt: -1 });

export default models.Competition || model("Competition", competitionSchema);
