import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const feedbackSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    event: { type: Schema.Types.ObjectId, ref: "Event", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    rating: { type: Number, required: true, min: 1, max: 5 },
    organization: { type: Number, min: 1, max: 5 },
    quality: { type: Number, min: 1, max: 5 },
    suggestions: { type: String, default: "", maxlength: 1000 },
  },
  { timestamps: true }
);

feedbackSchema.index({ event: 1, user: 1 }, { unique: true });

export default models.EventFeedback || model("EventFeedback", feedbackSchema);
