import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const uploadedFileSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    application: { type: Schema.Types.ObjectId, ref: "Application", index: true },
    question: { type: Schema.Types.ObjectId, ref: "Question" },
    name: { type: String, required: true },
    storedName: { type: String, required: true },
    mimeType: { type: String, default: "application/octet-stream" },
    size: { type: Number, default: 0 },
    kind: { type: String, enum: ["application", "gallery", "avatar", "other"], default: "application" },
    status: {
      type: String,
      enum: ["pending_review", "approved", "rejected", "resubmission_required"],
      default: "pending_review",
      index: true,
    },
    reviewNotes: { type: String, default: "" },
    reviewedBy: { type: Schema.Types.ObjectId, ref: "User" },
    reviewedAt: { type: Date },
  },
  { timestamps: true }
);

uploadedFileSchema.index({ application: 1, createdAt: 1 });

export default models.UploadedFile || model("UploadedFile", uploadedFileSchema);
