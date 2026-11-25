import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const interviewSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    application: { type: Schema.Types.ObjectId, ref: "Application", required: true, unique: true },
    student: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    scheduledAt: { type: Date, required: true },
    mode: { type: String, enum: ["on_campus", "online"], default: "on_campus" },
    location: { type: String, default: "" },
    meetingLink: { type: String, default: "" },
    panel: { type: [String], default: [] },
    status: {
      type: String,
      enum: ["scheduled", "completed", "no_show", "cancelled"],
      default: "scheduled",
      index: true,
    },
    feedback: { type: String, default: "" },
    score: { type: Number, default: null, min: 0, max: 100 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

interviewSchema.index({ student: 1, scheduledAt: 1 });

export default models.Interview || model("Interview", interviewSchema);
