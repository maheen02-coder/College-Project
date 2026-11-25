import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const adminRoleSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, lowercase: true },
    permissions: { type: [String], default: [] },
    isSystem: { type: Boolean, default: false },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

adminRoleSchema.index({ institute: 1, slug: 1 }, { unique: true });

export default models.AdminRole || model("AdminRole", adminRoleSchema);
