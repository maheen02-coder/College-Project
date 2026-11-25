import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const recruitmentSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    status: {
      type: String,
      enum: ["draft", "open", "closed", "archived"],
      default: "draft",
      index: true,
    },
    opensAt: { type: Date, required: true },
    closesAt: { type: Date, required: true },
    instructions: { type: String, default: "" },
    rounds: {
      type: [
        {
          key: { type: String, required: true },
          name: { type: String, required: true },
          opensAt: { type: Date },
          closesAt: { type: Date },
          isActive: { type: Boolean, default: true },
        },
      ],
      default: [],
    },
    maxSocietiesPerStudent: { type: Number, default: 3, min: 1 },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

recruitmentSchema.index({ institute: 1, status: 1, closesAt: 1 });
recruitmentSchema.index({ society: 1, createdAt: -1 });

export default models.Recruitment || model("Recruitment", recruitmentSchema);
