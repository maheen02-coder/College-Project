import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const templateSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    name: { type: String, required: true, trim: true },
    title: { type: String, default: "" },
    body: { type: String, default: "" },
    signatory: { type: String, default: "" },
    primaryColor: { type: String, default: "#6d28d9" },
    accentColor: { type: String, default: "#2563eb" },
    isDefault: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

templateSchema.index({ institute: 1, name: 1 }, { unique: true });

export default models.CertificateTemplate || model("CertificateTemplate", templateSchema);
