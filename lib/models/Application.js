import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export const APPLICATION_STATUSES = [
  "draft",
  "submitted",
  "pending_review",
  "under_review",
  "shortlisted",
  "interview_scheduled",
  "accepted",
  "rejected",
  "withdrawn",
];

const answerSchema = new Schema(
  {
    question: { type: Schema.Types.ObjectId, ref: "Question" },
    label: { type: String, required: true },
    type: { type: String, default: "short_text" },
    value: { type: Schema.Types.Mixed },
    files: { type: [Schema.Types.ObjectId], ref: "UploadedFile", default: [] },
  },
  { _id: false }
);

const historySchema = new Schema(
  {
    status: { type: String, enum: APPLICATION_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    by: { type: Schema.Types.ObjectId, ref: "User" },
    byName: { type: String, default: "" },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const applicationSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    recruitment: { type: Schema.Types.ObjectId, ref: "Recruitment", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    roundKey: { type: String, default: "" },
    status: { type: String, enum: APPLICATION_STATUSES, default: "submitted", index: true },
    answers: { type: [answerSchema], default: [] },
    reviewNotes: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    submittedAt: { type: Date },
    statusHistory: { type: [historySchema], default: [] },
  },
  { timestamps: true }
);

applicationSchema.index({ recruitment: 1, user: 1 }, { unique: true });
applicationSchema.index({ society: 1, status: 1 });

export default models.Application || model("Application", applicationSchema);
