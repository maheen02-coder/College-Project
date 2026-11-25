import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import Question, { QUESTION_TYPES } from "@/lib/models/Question";

export const dynamic = "force-dynamic";

const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown"];

function mapQuestion(question) {
  return {
    id: String(question._id),
    recruitmentId: String(question.recruitment),
    label: question.label,
    description: question.description,
    type: question.type,
    options: question.options || [],
    required: Boolean(question.required),
    order: question.order,
    roundKey: question.roundKey,
    isActive: question.isActive,
  };
}

const patchSchema = z.object({
  label: z.string().trim().min(2).max(240).optional(),
  description: z.string().trim().max(600).optional(),
  type: z.enum(QUESTION_TYPES).optional(),
  options: z.array(z.string().trim()).optional(),
  required: z.boolean().optional(),
  roundKey: z.string().trim().max(60).optional(),
  order: z.coerce.number().int().min(0).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Question not found.", 404);

  await connectDB();
  const question = await Question.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!question) return fail("Question not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const update = { ...data };
  const type = data.type || question.type;
  if (data.options) {
    update.options = data.options.map((option) => String(option).trim()).filter(Boolean);
  }
  if (!CHOICE_TYPES.includes(type)) {
    update.options = [];
  } else {
    const options = update.options || question.options || [];
    if (options.length < 2) return fail("Choice questions need at least two options.", 422);
  }

  const updated = await Question.findByIdAndUpdate(question._id, { $set: update }, { returnDocument: "after" }).lean();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.question.update",
    entityType: "Question",
    entityId: question._id,
    summary: `Updated question "${updated.label}".`,
  });

  return ok({ item: mapQuestion(updated) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Question not found.", 404);

  await connectDB();
  const question = await Question.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!question) return fail("Question not found.", 404);

  await Question.deleteOne({ _id: question._id });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.question.delete",
    entityType: "Question",
    entityId: question._id,
    summary: `Deleted question "${question.label}".`,
  });

  return ok({ removed: true });
}
