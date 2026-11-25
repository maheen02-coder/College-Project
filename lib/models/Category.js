import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const categorySchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    description: { type: String, default: "" },
    scope: { type: String, enum: ["event", "competition", "both"], default: "both" },
    icon: { type: String, default: "sparkles" },
    color: { type: String, default: "#7c3aed" },
  },
  { timestamps: true }
);

categorySchema.index({ institute: 1, slug: 1 }, { unique: true });

export default models.Category || model("Category", categorySchema);
