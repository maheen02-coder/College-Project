import mongoose from "mongoose";

const { Schema, model, models } = mongoose;

const taskSchema = new Schema(
  {
    institute: { type: Schema.Types.ObjectId, ref: "Institute", required: true, index: true },
    society: { type: Schema.Types.ObjectId, ref: "Society", required: true, index: true },
    group: { type: Schema.Types.ObjectId, ref: "Group" },
    title: { type: String, required: true, trim: true },
    description: { type: String, default: "" },
    assignedTo: { type: Schema.Types.ObjectId, ref: "User", index: true },
    createdBy: { type: Schema.Types.ObjectId, ref: "User" },
    dueDate: { type: Date },
    priority: { type: String, enum: ["low", "medium", "high", "urgent"], default: "medium" },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "cancelled"],
      default: "pending",
      index: true,
    },
    completedAt: { type: Date },
  },
  { timestamps: true }
);

taskSchema.index({ society: 1, status: 1 });
taskSchema.index({ assignedTo: 1, status: 1 });

export default models.Task || model("Task", taskSchema);
