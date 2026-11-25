import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const instituteSchema = new Schema(
  {
    name: { type: String, required: true, trim: true },
    shortName: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, lowercase: true },
    tagline: { type: String, default: "" },
    city: { type: String, default: "" },
    emailDomain: { type: String, default: "" },
    branding: {
      primary: { type: String, default: "#7c3aed" },
      accent: { type: String, default: "#3b82f6" },
      logoText: { type: String, default: "KIPS" },
    },
    leadership: {
      principal: { type: String, default: "" },
      registrar: { type: String, default: "" },
      activitiesHead: { type: String, default: "" },
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

export default models.Institute || model("Institute", instituteSchema);
