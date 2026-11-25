import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const societyMemberSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: {
      type: String,
      enum: [
        "president",
        "vice_president",
        "secretary",
        "treasurer",
        "event_manager",
        "team_lead",
        "member",
        "volunteer",
      ],
      default: "member",
    },
    status: { type: String, enum: ["active", "alumni", "removed"], default: "active", index: true },
    phone: { type: String, default: "" },
    responsibilities: { type: String, default: "" },
    joinedAt: { type: Date, default: Date.now },
    addedBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

societyMemberSchema.index({ society: 1, user: 1 }, { unique: true });
societyMemberSchema.index({ society: 1, role: 1 });

export default models.SocietyMember || model("SocietyMember", societyMemberSchema);
