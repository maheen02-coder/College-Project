import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const messageSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group", required: true, index: true },
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    senderName: { type: String, default: "" },
    body: { type: String, default: "", maxlength: 4000 },
    attachments: { type: [Schema.Types.ObjectId], ref: "UploadedFile", default: [] },
    replyTo: { type: Schema.Types.ObjectId, ref: "Message" },
    isAnnouncement: { type: Boolean, default: false },
    pinned: { type: Boolean, default: false },
  },
  { timestamps: true }
);

messageSchema.index({ group: 1, createdAt: -1 });

export default models.Message || model("Message", messageSchema);
