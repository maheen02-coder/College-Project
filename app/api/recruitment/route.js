import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getSessionUser, hasAdminPermission, isAdmin } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import Application from "@/lib/models/Application";
import Question from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";
import Society from "@/lib/models/Society";

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

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const user = await getSessionUser();

  if (user && isAdmin(user) && hasAdminPermission(user, "manage_recruitment") && searchParams.get("scope") === "admin") {
    await connectDB();
    const rows = await Recruitment.find({ institute: user.instituteId })
      .populate("society", "name slug color logo")
      .sort({ createdAt: -1 })
      .lean();
    if (!rows.length) return ok({ items: [] });

    const ids = rows.map((r) => r._id);
    const [questionRows, applicationRows] = await Promise.all([
      Question.aggregate([{ $match: { recruitment: { $in: ids } } }, { $group: { _id: "$recruitment", count: { $sum: 1 } } }]),
      Application.aggregate([
        { $match: { recruitment: { $in: ids } } },
        { $group: { _id: { recruitment: "$recruitment", status: "$status" }, count: { $sum: 1 } } },
      ]),
    ]);
    const questionCounts = Object.fromEntries(questionRows.map((row) => [String(row._id), row.count]));
    const statusCounts = {};
    const applicationCounts = {};
    for (const row of applicationRows) {
      const key = String(row._id.recruitment);
      statusCounts[key] = statusCounts[key] || {};
      statusCounts[key][row._id.status] = row.count;
      applicationCounts[key] = (applicationCounts[key] || 0) + row.count;
    }

    return ok({
      items: rows.map((r) =>
        mapRecruitment(r, {
          questionCount: questionCounts[String(r._id)] || 0,
          applicationCount: applicationCounts[String(r._id)] || 0,
          statusCounts: statusCounts[String(r._id)] || {},
        })
      ),
    });
  }

  const institute = await getInstitute();
  if (!institute) return ok({ items: [] });

  await connectDB();
  const now = new Date();
  const since = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000);
  const rows = await Recruitment.find({
    institute: institute._id,
    $or: [
      { status: "open", closesAt: { $gt: now } },
      { status: "closed", closesAt: { $gte: since } },
    ],
  })
    .populate("society", "name slug color logo")
    .sort({ closesAt: 1 })
    .lean();
  if (!rows.length) return ok({ items: [] });

  const ids = rows.map((r) => r._id);
  const [questionRows, applicationRows] = await Promise.all([
    Question.aggregate([
      { $match: { recruitment: { $in: ids }, isActive: true } },
      { $group: { _id: "$recruitment", count: { $sum: 1 } } },
    ]),
    Application.aggregate([
      { $match: { recruitment: { $in: ids }, status: { $nin: ["draft", "withdrawn"] } } },
      { $group: { _id: "$recruitment", count: { $sum: 1 } } },
    ]),
  ]);
  const questionCounts = Object.fromEntries(questionRows.map((row) => [String(row._id), row.count]));
  const applicationCounts = Object.fromEntries(applicationRows.map((row) => [String(row._id), row.count]));

  return ok({
    items: rows.map((r) =>
      mapRecruitment(r, {
        questionCount: questionCounts[String(r._id)] || 0,
        applicationCount: applicationCounts[String(r._id)] || 0,
      })
    ),
  });
}

const roundSchema = z.object({
  key: z.string().trim().min(1, "Round key is required.").max(60),
  name: z.string().trim().min(1, "Round name is required.").max(120),
  opensAt: z.string().optional(),
  closesAt: z.string().optional(),
  isActive: z.boolean().optional().default(true),
});

const createSchema = z.object({
  societyId: z.string().min(1, "Choose a society."),
  title: z.string().trim().min(3, "Recruitment title is required.").max(140),
  description: z.string().trim().max(4000).optional().default(""),
  status: z.enum(["draft", "open", "closed", "archived"]).optional().default("draft"),
  opensAt: z.string().min(1, "Opening date is required."),
  closesAt: z.string().min(1, "Closing date is required."),
  instructions: z.string().trim().max(2000).optional().default(""),
  rounds: z.array(roundSchema).optional().default([]),
  maxSocietiesPerStudent: z.coerce.number().int().min(1).max(20).optional().default(3),
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

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_recruitment");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const opensAt = new Date(data.opensAt);
  const closesAt = new Date(data.closesAt);
  if (Number.isNaN(opensAt.getTime()) || Number.isNaN(closesAt.getTime())) {
    return fail("Enter valid recruitment dates.", 422);
  }
  if (closesAt <= opensAt) return fail("Closing date must be after the opening date.", 422);
  if (!mongoose.isValidObjectId(data.societyId)) return fail("Choose a valid society.", 422);

  await connectDB();
  const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
  if (!society) return fail("Society not found.", 404);

  const recruitment = await Recruitment.create({
    institute: user.instituteId,
    society: society._id,
    title: data.title,
    description: data.description,
    status: data.status,
    opensAt,
    closesAt,
    instructions: data.instructions,
    rounds: buildRounds(data.rounds),
    maxSocietiesPerStudent: data.maxSocietiesPerStudent,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "recruitment.create",
    entityType: "Recruitment",
    entityId: recruitment._id,
    summary: `Created recruitment ${recruitment.title} for ${society.name}.`,
  });

  return ok(
    {
      item: mapRecruitment(
        { ...recruitment.toObject(), society: { _id: society._id, name: society.name, slug: society.slug, color: society.color, logo: society.logo } },
        {}
      ),
    },
    { status: 201 }
  );
}
