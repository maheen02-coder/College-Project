import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const announcementSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", index: true },
    title: { type: String, required: true, trim: true },
    body: { type: String, required: true },
    category: {
      type: String,
      enum: ["general", "notice", "event", "recruitment", "competition", "society", "result"],
      default: "general",
    },
    priority: { type: String, enum: ["normal", "important", "urgent"], default: "normal" },
    image: { type: String, default: "" },
    link: { type: String, default: "" },
    audience: { type: String, enum: ["all", "students", "admins"], default: "all" },
    pinned: { type: Boolean, default: false },
    publishedBy: { type: Schema.Types.ObjectId, ref: "User" },
    publishedByName: { type: String, default: "" },
    isActive: { type: Boolean, default: true },
    expiresAt: { type: Date },
  },
  { timestamps: true }
);

announcementSchema.index({ institute: 1, isActive: 1, createdAt: -1 });

export default models.Announcement || model("Announcement", announcementSchema);
