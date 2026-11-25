import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const groupSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    name: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    color: { type: String, default: "#7c3aed" },
    memberIds: { type: [Schema.Types.ObjectId], ref: "User", default: [], index: true },
    moderators: { type: [Schema.Types.ObjectId], ref: "User", default: [] },
    isArchived: { type: Boolean, default: false },
    lastMessageAt: { type: Date, default: null },
    lastMessagePreview: { type: String, default: "" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

groupSchema.index({ society: 1, isArchived: 1 });

export default models.Group || model("Group", groupSchema);
