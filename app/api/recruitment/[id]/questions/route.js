import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getSessionUser, hasAdminPermission, isAdmin } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import Question, { QUESTION_TYPES } from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";

export const dynamic = "force-dynamic";

const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown"];

function mapQuestion(question) {
  return {
    id: String(question._id),
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

async function classify(user) {
  if (user) return { admin: isAdmin(user) && hasAdminPermission(user, "manage_recruitment"), userId: user.instituteId };
  const institute = await getInstitute();
  return { admin: false, userId: institute?._id || null };
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  const user = await getSessionUser();
  const { admin, userId } = await classify(user);
  if (!userId) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: userId }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);
  if (!admin && recruitment.status !== "open") return fail("Not permitted.", 403);

  const questions = await Question.find({
    recruitment: recruitment._id,
    ...(admin ? {} : { isActive: true }),
  })
    .sort({ order: 1 })
    .lean();

  return ok({ items: questions.map(mapQuestion) });
}

const createSchema = z.object({
  label: z.string().trim().min(2, "Question label is required.").max(240),
  description: z.string().trim().max(600).optional().default(""),
  type: z.enum(QUESTION_TYPES),
  options: z.array(z.string().trim()).optional().default([]),
  required: z.boolean().optional().default(false),
  roundKey: z.string().trim().max(60).optional().default(""),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const options = data.options.map((option) => String(option).trim()).filter(Boolean);
  if (CHOICE_TYPES.includes(data.type) && options.length < 2) {
    return fail("Choice questions need at least two options.", 422);
  }

  const last = await Question.findOne({ recruitment: recruitment._id }).sort({ order: -1 }).select("order").lean();
  const question = await Question.create({
    institute: user.instituteId,
    society: recruitment.society,
    recruitment: recruitment._id,
    roundKey: data.roundKey,
    label: data.label,
    description: data.description,
    type: data.type,
    options: CHOICE_TYPES.includes(data.type) ? options : [],
    required: data.required,
    order: (last?.order || 0) + 1,
    isActive: true,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.question.create",
    entityType: "Question",
    entityId: question._id,
    summary: `Added question "${question.label}" to ${recruitment.title}.`,
  });

  return ok({ item: mapQuestion(question) }, { status: 201 });
}

const orderSchema = z.object({
  order: z.array(z.string().min(1)).min(1, "Provide the new question order."),
});

export async function PUT(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);

  const body = await readJson(request);
  const parsed = orderSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const ids = parsed.data.order.filter((value) => mongoose.isValidObjectId(value));
  if (ids.length !== parsed.data.order.length) return fail("One or more questions are invalid.", 422);

  const count = await Question.countDocuments({ _id: { $in: ids }, recruitment: recruitment._id });
  if (count !== ids.length) return fail("One or more questions do not belong to this recruitment.", 422);

  await Question.bulkWrite(
    ids.map((questionId, index) => ({
      updateOne: { filter: { _id: questionId, recruitment: recruitment._id }, update: { $set: { order: index + 1 } } },
    }))
  );

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.question.reorder",
    entityType: "Recruitment",
    entityId: recruitment._id,
    summary: `Reordered questions for ${recruitment.title}.`,
  });

  return ok({ updated: true });
}
