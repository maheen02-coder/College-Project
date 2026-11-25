import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const entrySchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    competition: { type: Schema.Types.ObjectId, ref: "Competition", required: true, index: true },
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    entryId: { type: String, required: true, unique: true },
    teamName: { type: String, default: "" },
    members: {
      type: [
        {
          name: { type: String, required: true },
          rollNumber: { type: String, default: "" },
          email: { type: String, default: "" },
        },
      ],
      default: [],
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected", "withdrawn", "disqualified"],
      default: "approved",
    },
    submissionLink: { type: String, default: "" },
    score: { type: Number, default: null },
    position: {
      type: String,
      enum: ["none", "winner", "runner_up", "second_runner_up", "participant"],
      default: "none",
    },
    remarks: { type: String, default: "" },
  },
  { timestamps: true }
);

entrySchema.index({ competition: 1, user: 1 }, { unique: true });

export default models.CompetitionEntry || model("CompetitionEntry", entrySchema);
