import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const userSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true, select: false },
    role: {
      type: String,
      enum: ["student", "organizer", "admin", "superadmin"],
      default: "student",
      index: true,
    },
    adminRole: { type: String, default: "" },
    adminPermissions: { type: [String], default: [] },
    organizerPermissions: {
      type: [String],
      enum: ["manage_events", "manage_attendance", "manage_results", "issue_certificates"],
      default: [],
    },
    matricRollNumber: { type: String, default: "", trim: true, index: true },
    matricMarks: { type: Number, default: null },
    matricTotalMarks: { type: Number, default: null },
    matricPercentage: { type: Number, default: null },
    classYear: { type: String, default: "" },
    section: { type: String, default: "" },
    rollNumber: { type: String, default: "" },
    department: { type: String, default: "" },
    program: { type: String, default: "" },
    semester: { type: String, default: "" },
    phone: { type: String, default: "" },
    avatar: { type: String, default: "" },
    bio: { type: String, default: "" },
    skills: { type: [String], default: [] },
    interests: { type: [String], default: [] },
    verificationStatus: {
      type: String,
      enum: ["unverified", "pending", "verified", "rejected"],
      default: "pending",
      index: true,
    },
    verificationNote: { type: String, default: "" },
    verifiedAt: { type: Date },
    verifiedBy: { type: Schema.Types.ObjectId, ref: "User" },
    points: { type: Number, default: 0, min: 0 },
    savedEvents: { type: [Schema.Types.ObjectId], ref: "Event", default: [] },
    isActive: { type: Boolean, default: true },
    lastLoginAt: { type: Date },
  },
  { timestamps: true }
);

userSchema.index({ institute: 1, role: 1 });
// Empty strings are stored for staff, so index only real roll numbers.
userSchema.index(
  { institute: 1, matricRollNumber: 1 },
  { unique: true, partialFilterExpression: { matricRollNumber: { $gt: "" } } }
);

export default models.User || model("User", userSchema);
