import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getSessionUser, isAdmin } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import Application from "@/lib/models/Application";
import Question from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";

export const dynamic = "force-dynamic";

function mapRecruitment(recruitment, counts = {}) {
  return {
    id: String(recruitment._id),
    title: recruitment.title,
    description: recruitment.description,
    status: recruitment.status,
    opensAt: recruitment.opensAt ? new Date(recruitment.opensAt).toISOString() : null,
    closesAt: recruitment.closesAt ? new Date(recruitment.closesAt).toISOString() : null,
    instructions: recruitment.instructions,
    rounds: recruitment.rounds || [],
    maxSocietiesPerStudent: recruitment.maxSocietiesPerStudent,
    questionCount: counts.questionCount || 0,
    applicationCount: counts.applicationCount || 0,
    statusCounts: counts.statusCounts || {},
    isOpen:
      recruitment.status === "open" && recruitment.closesAt && new Date(recruitment.closesAt) > new Date(),
    society: recruitment.society
      ? {
          id: String(recruitment.society._id),
          name: recruitment.society.name,
          slug: recruitment.society.slug,
          color: recruitment.society.color,
          logo: recruitment.society.logo,
        }
      : null,
    createdAt: recruitment.createdAt ? new Date(recruitment.createdAt).toISOString() : null,
  };
}

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

async function resolveInstitute(user) {
  if (user?.instituteId) return user.instituteId;
  const institute = await getInstitute();
  return institute?._id || null;
}

export async function GET(request, { params }) {
  const { id } = await params;
  const user = await getSessionUser();
  const admin = isAdmin(user);
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  const instituteId = await resolveInstitute(user);
  if (!instituteId) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: instituteId })
    .populate("society", "name slug color logo category")
    .lean();
  if (!recruitment) return fail("Recruitment not found.", 404);
  if (!admin && ["draft", "archived"].includes(recruitment.status)) {
    return fail("Recruitment not found.", 404);
  }

  const questions = await Question.find({
    recruitment: recruitment._id,
    ...(admin ? {} : { isActive: true }),
  })
    .sort({ order: 1 })
    .lean();

  let application = null;
  if (user?.role === "student") {
    const existing = await Application.findOne({ recruitment: recruitment._id, user: user.id })
      .select("status roundKey")
      .lean();
    if (existing) {
      application = { id: String(existing._id), status: existing.status, roundKey: existing.roundKey };
    }
  }

  return ok({
    item: {
      ...mapRecruitment(recruitment, { questionCount: questions.length }),
      questions: questions.map(mapQuestion),
      application,
    },
  });
}

const roundSchema = z.object({
  key: z.string().trim().min(1).max(60),
  name: z.string().trim().min(1).max(120),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const patchSchema = z.object({
  title: z.string().trim().min(3).max(140).optional(),
  description: z.string().trim().max(4000).optional(),
  status: z.enum(["draft", "open", "closed", "archived"]).optional(),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  instructions: z.string().trim().max(2000).optional(),
  rounds: z.array(roundSchema).optional(),
  maxSocietiesPerStudent: z.coerce.number().int().min(1).max(20).optional(),
});

function buildRounds(rounds) {
  return rounds.map((round) => ({
    key: round.key,
    name: round.name,
    opensAt: round.opensAt ? new Date(round.opensAt) : undefined,
    closesAt: round.closesAt ? new Date(round.closesAt) : undefined,
    isActive: round.isActive !== false,
  }));
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const update = { ...data };
  for (const key of ["opensAt", "closesAt"]) {
    if (update[key] === "") {
      delete update[key];
      continue;
    }
    if (update[key]) {
      const date = new Date(update[key]);
      if (Number.isNaN(date.getTime())) return fail(`Invalid ${key} value.`, 422);
      update[key] = date;
    }
  }
  if (update.rounds) update.rounds = buildRounds(update.rounds);

  const opensAt = update.opensAt || recruitment.opensAt;
  const closesAt = update.closesAt || recruitment.closesAt;
  if (new Date(closesAt) <= new Date(opensAt)) {
    return fail("Closing date must be after the opening date.", 422);
  }

  const becameClosed = data.status === "closed" && recruitment.status !== "closed";
  const updated = await Recruitment.findByIdAndUpdate(recruitment._id, { $set: update }, { returnDocument: "after" })
    .populate("society", "name slug color logo")
    .lean();

  if (becameClosed) {
    const applicants = await Application.find({
      recruitment: recruitment._id,
      status: { $nin: ["draft", "withdrawn"] },
    })
      .select("user")
      .lean();
    if (applicants.length) {
      await notifyMany(
        applicants.map((app) => ({
          institute: recruitment.institute,
          user: app.user,
          type: "application",
          title: `Recruitment closed · ${recruitment.title}`,
          message: "Applications for this recruitment are now closed. Track updates in your dashboard.",
          link: "/dashboard/applications",
        }))
      );
    }
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.update",
    entityType: "Recruitment",
    entityId: recruitment._id,
    summary: `Updated recruitment ${updated.title}${data.status ? ` (status: ${data.status})` : ""}.`,
  });

  const [questionCount, applicationRows] = await Promise.all([
    Question.countDocuments({ recruitment: recruitment._id }),
    Application.aggregate([
      { $match: { recruitment: recruitment._id } },
      { $group: { _id: "$status", count: { $sum: 1 } } },
    ]),
  ]);
  const statusCounts = Object.fromEntries(applicationRows.map((row) => [row._id, row.count]));
  const applicationCount = applicationRows.reduce((total, row) => total + row.count, 0);

  return ok({ item: mapRecruitment(updated, { questionCount, applicationCount, statusCounts }) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);

  await Recruitment.updateOne({ _id: recruitment._id }, { $set: { status: "archived" } });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.archive",
    entityType: "Recruitment",
    entityId: recruitment._id,
    summary: `Archived recruitment ${recruitment.title}.`,
  });

  return ok({ removed: true });
}
