import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

export const QUESTION_TYPES = [
  "short_text",
  "long_text",
  "single_choice",
  "multiple_choice",
  "yes_no",
  "dropdown",
  "rating",
  "file",
];

const questionSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", index: true },
    recruitment: { type: Schema.Types.ObjectId, ref: "Recruitment", required: true, index: true },
    roundKey: { type: String, default: "" },
    label: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    type: { type: String, enum: QUESTION_TYPES, default: "short_text" },
    options: { type: [String], default: [] },
    required: { type: Boolean, default: false },
    order: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

questionSchema.index({ recruitment: 1, order: 1 });

export default models.Question || model("Question", questionSchema);
