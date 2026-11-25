import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const notificationSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    type: {
      type: String,
      enum: [
        "application",
        "interview",
        "file_review",
        "society",
        "event",
        "registration",
        "reminder",
        "competition",
        "result",
        "certificate",
        "group",
        "task",
        "points",
        "announcement",
        "system",
      ],
      default: "system",
    },
    title: { type: String, required: true },
    message: { type: String, default: "" },
    link: { type: String, default: "" },
    read: { type: Boolean, default: false, index: true },
  },
  { timestamps: true }
);

notificationSchema.index({ user: 1, createdAt: -1 });

export default models.Notification || model("Notification", notificationSchema);
