import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireStudent, requireUser } from "@/lib/api";
import { hasAdminPermission } from "@/lib/auth";
import { APPLICATION_STATUSES } from "@/lib/models/Application";
import Application from "@/lib/models/Application";
import Interview from "@/lib/models/Interview";
import Question from "@/lib/models/Question";
import Recruitment from "@/lib/models/Recruitment";
import UploadedFile from "@/lib/models/UploadedFile";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown"];

function fileCount(application) {
  return (application.answers || []).reduce((total, answer) => total + (answer.files?.length || 0), 0);
}

function mapOwnApplication(application, interview) {
  return {
    id: String(application._id),
    status: application.status,
    roundKey: application.roundKey,
    submittedAt: application.submittedAt ? new Date(application.submittedAt).toISOString() : null,
    createdAt: new Date(application.createdAt).toISOString(),
    fileCount: fileCount(application),
    statusHistory: (application.statusHistory || []).map((entry) => ({
      status: entry.status,
      at: entry.at ? new Date(entry.at).toISOString() : null,
      byName: entry.byName,
      note: entry.note,
    })),
    interview: interview
      ? {
          id: String(interview._id),
          scheduledAt: new Date(interview.scheduledAt).toISOString(),
          status: interview.status,
          mode: interview.mode,
          location: interview.location,
        }
      : null,
    society: application.society
      ? {
          id: String(application.society._id),
          name: application.society.name,
          slug: application.society.slug,
          color: application.society.color,
          logo: application.society.logo,
        }
      : null,
    recruitment: application.recruitment
      ? {
          id: String(application.recruitment._id),
          title: application.recruitment.title,
          closesAt: application.recruitment.closesAt
            ? new Date(application.recruitment.closesAt).toISOString()
            : null,
          status: application.recruitment.status,
          society: application.recruitment.society
            ? {
                id: String(application.recruitment.society._id),
                name: application.recruitment.society.name,
                slug: application.recruitment.society.slug,
                color: application.recruitment.society.color,
                logo: application.recruitment.society.logo,
              }
            : null,
        }
      : null,
  };
}

function mapAdminApplication(application, interview) {
  return {
    id: String(application._id),
    status: application.status,
    roundKey: application.roundKey,
    submittedAt: application.submittedAt ? new Date(application.submittedAt).toISOString() : null,
    createdAt: new Date(application.createdAt).toISOString(),
    reviewNotes: application.reviewNotes,
    fileCount: fileCount(application),
    applicant: application.user
      ? {
          id: String(application.user._id),
          name: application.user.name,
          email: application.user.email,
          matricRollNumber: application.user.matricRollNumber,
          classYear: application.user.classYear,
          department: application.user.department,
          section: application.user.section,
          matricPercentage: application.user.matricPercentage,
          verificationStatus: application.user.verificationStatus,
          avatar: application.user.avatar,
        }
      : null,
    society: application.society
      ? {
          id: String(application.society._id),
          name: application.society.name,
          slug: application.society.slug,
          color: application.society.color,
          logo: application.society.logo,
        }
      : null,
    recruitment: application.recruitment
      ? {
          id: String(application.recruitment._id),
          title: application.recruitment.title,
          closesAt: application.recruitment.closesAt
            ? new Date(application.recruitment.closesAt).toISOString()
            : null,
          status: application.recruitment.status,
        }
      : null,
    interview: interview
      ? {
          id: String(interview._id),
          scheduledAt: new Date(interview.scheduledAt).toISOString(),
          status: interview.status,
          mode: interview.mode,
          location: interview.location,
        }
      : null,
  };
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;
  await connectDB();

  const { searchParams } = new URL(request.url);

  if (user.role === "student") {
    const applications = await Application.find({ institute: user.instituteId, user: user.id })
      .populate("society", "name slug color logo")
      .populate({
        path: "recruitment",
        select: "title closesAt status society",
        populate: { path: "society", select: "name slug color logo" },
      })
      .sort({ createdAt: -1 })
      .lean();

    const interviews = await Interview.find({ application: { $in: applications.map((a) => a._id) } }).lean();
    const interviewMap = Object.fromEntries(interviews.map((row) => [String(row.application), row]));
    const counts = {};
    for (const application of applications) {
      counts[application.status] = (counts[application.status] || 0) + 1;
    }

    return ok({
      items: applications.map((application) =>
        mapOwnApplication(application, interviewMap[String(application._id)])
      ),
      counts,
      total: applications.length,
    });
  }

  const canReview = ["review_applications", "manage_recruitment"].some((permission) =>
    hasAdminPermission(user, permission)
  );
  if (!canReview) return fail("You do not have permission to view applications.", 403);

  const page = Math.max(1, Number(searchParams.get("page")) || 1);
  const limit = 50;
  const query = { institute: user.instituteId };

  const status = searchParams.get("status");
  if (status && status !== "all" && APPLICATION_STATUSES.includes(status)) query.status = status;

  const society = searchParams.get("society");
  if (society && mongoose.isValidObjectId(society)) query.society = society;

  const recruitment = searchParams.get("recruitment");
  if (recruitment && mongoose.isValidObjectId(recruitment)) query.recruitment = recruitment;

  const q = (searchParams.get("q") || "").trim();
  if (q) {
    const regex = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const users = await User.find({
      institute: user.instituteId,
      $or: [{ name: regex }, { email: regex }, { matricRollNumber: regex }],
    })
      .select("_id")
      .limit(500)
      .lean();
    query.user = { $in: users.map((row) => row._id) };
    if (!users.length) return ok({ items: [], counts: {}, total: 0, page, pages: 0 });
  }

  const baseQuery = { ...query };
  delete baseQuery.status;
  const [applications, total, statusRows] = await Promise.all([
    Application.find(query)
      .populate(
        "user",
        "name email matricRollNumber classYear department section matricPercentage verificationStatus avatar"
      )
      .populate("society", "name slug color logo")
      .populate("recruitment", "title closesAt status")
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean(),
    Application.countDocuments(query),
    Promise.all(
      APPLICATION_STATUSES.map(async (value) => [value, await Application.countDocuments({ ...baseQuery, status: value })])
    ),
  ]);

  const interviews = await Interview.find({ application: { $in: applications.map((a) => a._id) } }).lean();
  const interviewMap = Object.fromEntries(interviews.map((row) => [String(row.application), row]));
  const counts = Object.fromEntries(statusRows.filter(([, count]) => count > 0));

  return ok({
    items: applications.map((application) =>
      mapAdminApplication(application, interviewMap[String(application._id)])
    ),
    counts,
    total,
    page,
    pages: Math.ceil(total / limit),
  });
}

const answerSchema = z.object({
  questionId: z.string().min(1),
  value: z.any().optional(),
  fileIds: z.array(z.string()).optional().default([]),
});

const createSchema = z.object({
  recruitmentId: z.string().min(1, "Choose a recruitment."),
  answers: z.array(answerSchema).optional().default([]),
  submit: z.boolean().optional().default(false),
});

function buildAnswers(questions, bodyAnswers, ownedFiles) {
  const provided = new Map();
  for (const answer of bodyAnswers) {
    if (answer?.questionId) provided.set(String(answer.questionId), answer);
  }

  const answers = [];
  for (const question of questions) {
    const raw = provided.get(String(question._id));
    const fileIds = (raw?.fileIds || []).map(String);

    if (question.type === "file") {
      if (!fileIds.length) {
        if (question.required) return { error: `Attach a file for "${question.label}".` };
        continue;
      }
      if (fileIds.some((id) => !ownedFiles.has(id))) {
        return { error: "One or more uploaded files are not available." };
      }
      answers.push({ question: question._id, label: question.label, type: "file", value: "", files: fileIds });
      continue;
    }

    let value = raw?.value;
    const empty =
      value === undefined ||
      value === null ||
      (typeof value === "string" && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (empty) {
      if (question.required) return { error: `Answer "${question.label}" is required.` };
      continue;
    }

    if (question.type === "multiple_choice") {
      if (!Array.isArray(value) || !value.length) {
        return { error: `Choose at least one option for "${question.label}".` };
      }
      const options = question.options || [];
      if (value.some((item) => !options.includes(String(item)))) {
        return { error: `Choose a valid option for "${question.label}".` };
      }
      value = value.map(String);
    } else if (CHOICE_TYPES.includes(question.type)) {
      if (!(question.options || []).includes(String(value))) {
        return { error: `Choose a valid option for "${question.label}".` };
      }
      value = String(value);
    } else if (question.type === "rating") {
      const rating = Number(value);
      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        return { error: `Choose a rating from 1 to 5 for "${question.label}".` };
      }
      value = rating;
    } else if (question.type === "yes_no") {
      value = String(value).toLowerCase() === "no" ? "No" : "Yes";
    } else {
      value = String(value).slice(0, 5000);
    }

    answers.push({ question: question._id, label: question.label, type: question.type, value });
  }

  return { answers };
}

export async function POST(request) {
  const { user, response } = await requireStudent();
  if (response) return response;
  if (user.verificationStatus !== "verified") {
    return fail("Your student verification must be approved before applying.", 403);
  }

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  if (!mongoose.isValidObjectId(data.recruitmentId)) return fail("Recruitment not found.", 404);

  await connectDB();
  const recruitment = await Recruitment.findOne({
    _id: data.recruitmentId,
    institute: user.instituteId,
  }).lean();
  if (!recruitment) return fail("Recruitment not found.", 404);

  const now = new Date();
  if (recruitment.status !== "open") return fail("This recruitment is not accepting applications.", 409);
  if (now < new Date(recruitment.opensAt)) return fail("Applications have not opened yet.", 409);
  if (now > new Date(recruitment.closesAt)) return fail("Applications for this recruitment are closed.", 409);

  const existing = await Application.exists({ recruitment: recruitment._id, user: user.id });
  if (existing) return fail("You have already applied to this recruitment.", 409);

  const questions = await Question.find({ recruitment: recruitment._id, isActive: true })
    .sort({ order: 1 })
    .lean();

  const fileIds = [
    ...new Set(
      data.answers
        .flatMap((answer) => answer.fileIds || [])
        .filter((value) => mongoose.isValidObjectId(value))
    ),
  ];
  const files = fileIds.length
    ? await UploadedFile.find({ _id: { $in: fileIds }, user: user.id, institute: user.instituteId })
        .select("_id")
        .lean()
    : [];
  const ownedFiles = new Set(files.map((file) => String(file._id)));

  const built = buildAnswers(questions, data.answers, ownedFiles);
  if (built.error) return fail(built.error, 422);

  const roundKey = (recruitment.rounds || []).find((round) => round.isActive !== false)?.key || "";
  const submitted = Boolean(data.submit);

  let application;
  try {
    application = await Application.create({
      institute: user.instituteId,
      recruitment: recruitment._id,
      society: recruitment.society,
      user: user.id,
      roundKey,
      status: submitted ? "submitted" : "draft",
      answers: built.answers,
      submittedAt: submitted ? now : undefined,
      statusHistory: [
        {
          status: submitted ? "submitted" : "draft",
          at: now,
          by: user.id,
          byName: user.name,
          note: submitted ? "Application submitted." : "Draft saved.",
        },
      ],
    });
  } catch (error) {
    if (error?.code === 11000) return fail("You have already applied to this recruitment.", 409);
    throw error;
  }

  const attachedFiles = built.answers.flatMap((answer) => answer.files || []);
  if (attachedFiles.length) {
    await UploadedFile.updateMany(
      { _id: { $in: attachedFiles }, user: user.id },
      { $set: { application: application._id } }
    );
  }

  return ok(
    {
      item: {
        id: String(application._id),
        status: application.status,
        roundKey: application.roundKey,
        submittedAt: application.submittedAt ? new Date(application.submittedAt).toISOString() : null,
        createdAt: new Date(application.createdAt).toISOString(),
        answerCount: application.answers.length,
      },
    },
    { status: 201 }
  );
}
