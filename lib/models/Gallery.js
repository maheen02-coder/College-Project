import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const gallerySchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    cover: { type: String, default: "" },
    images: { type: [String], default: [] },
    isPublished: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

gallerySchema.index({ society: 1, createdAt: -1 });

export default models.Gallery || model("Gallery", gallerySchema);
