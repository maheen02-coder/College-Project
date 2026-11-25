import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const groupMemberSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    role: { type: String, enum: ["moderator", "member"], default: "member" },
    joinedAt: { type: Date, default: Date.now },
    lastReadAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

groupMemberSchema.index({ group: 1, user: 1 }, { unique: true });

export default models.GroupMember || model("GroupMember", groupMemberSchema);
