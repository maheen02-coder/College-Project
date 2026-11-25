import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const certificateSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    certificateId: { type: String, required: true, unique: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event" },
    competition: { type: Schema.Types.ObjectId, ref: "Competition" },
    society: { type: Schema.Types.ObjectId, ref: "Society" },
    type: {
      type: String,
      enum: [
        "participation",
        "winner",
        "runner_up",
        "volunteer",
        "society_membership",
        "leadership",
        "achievement",
        "special_recognition",
      ],
      required: true,
    },
    recipientName: { type: String, required: true },
    activityTitle: { type: String, required: true },
    activityKind: { type: String, default: "Event" },
    reason: { type: String, default: "" },
    issuedBy: { type: Schema.Types.ObjectId, ref: "User" },
    issuedByName: { type: String, default: "" },
    issuedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ["valid", "revoked"], default: "valid" },
  },
  { timestamps: true }
);

certificateSchema.index({ user: 1, issuedAt: -1 });
certificateSchema.index({ institute: 1, status: 1 });

export default models.Certificate || model("Certificate", certificateSchema);
