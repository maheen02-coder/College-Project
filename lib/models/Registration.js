import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const registrationSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    registrationId: { type: String, required: true, unique: true },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "cancelled", "attended", "absent"],
      default: "approved",
    },
    attendance: { type: String, enum: ["unmarked", "present", "absent"], default: "unmarked" },
    markedVia: { type: String, enum: ["manual", "qr"], default: "manual" },
    markedBy: { type: Schema.Types.ObjectId, ref: "User" },
    note: { type: String, default: "" },
    attendedAt: { type: Date },
    cancelledAt: { type: Date },
  },
  { timestamps: true }
);

registrationSchema.index({ event: 1, user: 1 }, { unique: true });

export default models.Registration || model("Registration", registrationSchema);
