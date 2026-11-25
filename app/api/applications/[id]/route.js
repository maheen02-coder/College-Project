import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import Application from "@/lib/models/Application";
import Interview from "@/lib/models/Interview";
import Question from "@/lib/models/Question";
import SocietyMember from "@/lib/models/SocietyMember";
import UploadedFile from "@/lib/models/UploadedFile";

export const dynamic = "force-dynamic";

const CHOICE_TYPES = ["single_choice", "multiple_choice", "dropdown"];
const USER_FIELDS =
  "name email matricRollNumber classYear department section matricPercentage verificationStatus avatar phone";

function mapHistory(history = []) {
  return history.map((entry) => ({
    status: entry.status,
    at: entry.at ? new Date(entry.at).toISOString() : null,
    byName: entry.byName,
    note: entry.note,
  }));
}

async function detail(id) {
  const application = await Application.findById(id)
    .populate("user", USER_FIELDS)
    .populate("recruitment")
    .populate("society", "name slug color logo category tagline")
    .lean();
  if (!application) return null;

  const fileIds = [
    ...new Set(
      (application.answers || []).flatMap((answer) => (answer.files || []).map((file) => String(file)))
    ),
  ];
  const [files, interview] = await Promise.all([
    fileIds.length
      ? UploadedFile.find({ _id: { $in: fileIds } })
          .select("name mimeType size status reviewNotes")
          .lean()
      : [],
    Interview.findOne({ application: application._id }).lean(),
  ]);
  const fileMap = Object.fromEntries(files.map((file) => [String(file._id), file]));

  return {
    id: String(application._id),
    status: application.status,
    roundKey: application.roundKey,
    submittedAt: application.submittedAt ? new Date(application.submittedAt).toISOString() : null,
    createdAt: new Date(application.createdAt).toISOString(),
    updatedAt: new Date(application.updatedAt).toISOString(),
    reviewNotes: application.reviewNotes,
    statusHistory: mapHistory(application.statusHistory),
    answers: (application.answers || []).map((answer) => ({
      questionId: answer.question ? String(answer.question) : "",
      label: answer.label,
      type: answer.type,
      value: answer.value,
      files: (answer.files || [])
        .map((file) => fileMap[String(file)])
        .filter(Boolean)
        .map((file) => ({
          id: String(file._id),
          name: file.name,
          mimeType: file.mimeType,
          size: file.size,
          status: file.status,
          reviewNotes: file.reviewNotes,
        })),
    })),
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
          phone: application.user.phone,
        }
      : null,
    society: application.society
      ? {
          id: String(application.society._id),
          name: application.society.name,
          slug: application.society.slug,
          color: application.society.color,
          logo: application.society.logo,
          category: application.society.category,
          tagline: application.society.tagline,
        }
      : null,
    recruitment: application.recruitment
      ? {
          id: String(application.recruitment._id),
          title: application.recruitment.title,
          description: application.recruitment.description,
          status: application.recruitment.status,
          opensAt: application.recruitment.opensAt
            ? new Date(application.recruitment.opensAt).toISOString()
            : null,
          closesAt: application.recruitment.closesAt
            ? new Date(application.recruitment.closesAt).toISOString()
            : null,
          instructions: application.recruitment.instructions,
          rounds: application.recruitment.rounds || [],
        }
      : null,
    interview: interview
      ? {
          id: String(interview._id),
          scheduledAt: new Date(interview.scheduledAt).toISOString(),
          mode: interview.mode,
          location: interview.location,
          meetingLink: interview.meetingLink,
          panel: interview.panel || [],
          status: interview.status,
          feedback: interview.feedback,
          score: interview.score,
        }
      : null,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Application not found.", 404);

  await connectDB();
  const application = await Application.findById(id).select("user institute").lean();
  if (!application) return fail("Application not found.", 404);
  if (String(application.institute) !== user.instituteId) return fail("Application not found.", 404);

  const isOwner = String(application.user) === user.id;
  const canReview = ["review_applications", "manage_recruitment"].some((permission) =>
    hasAdminPermission(user, permission)
  );
  if (!isOwner && !canReview) return fail("You do not have permission to view this application.", 403);

  const item = await detail(id);
  if (!item) return fail("Application not found.", 404);
  return ok({ item });
}

const studentSchema = z.object({
  action: z.enum(["withdraw"]).optional(),
  answers: z
    .array(
      z.object({
        questionId: z.string().min(1),
        value: z.any().optional(),
        fileIds: z.array(z.string()).optional().default([]),
      })
    )
    .optional(),
  submit: z.boolean().optional(),
});

const adminSchema = z.object({
  status: z
    .enum(["submitted", "pending_review", "under_review", "shortlisted", "accepted", "rejected"])
    .optional(),
  reviewNotes: z.string().trim().max(2000).optional(),
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
      if (fileIds.some((fileId) => !ownedFiles.has(fileId))) {
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

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Application not found.", 404);

  await connectDB();
  const application = await Application.findById(id).populate("recruitment").populate("society", "name").lean();
  if (!application) return fail("Application not found.", 404);
  if (String(application.institute) !== user.instituteId) return fail("Application not found.", 404);

  const body = await readJson(request);
  const isOwner = String(application.user) === user.id;

  if (user.role === "student") {
    if (!isOwner) return fail("You do not have permission to edit this application.", 403);

    const parsed = studentSchema.safeParse(body);
    if (!parsed.success) return fail(firstIssue(parsed.error), 422);
    const data = parsed.data;

    if (data.action === "withdraw") {
      if (["accepted", "rejected", "withdrawn"].includes(application.status)) {
        return fail("This application can no longer be withdrawn.", 409);
      }
      await Application.updateOne(
        { _id: application._id },
        {
          $set: { status: "withdrawn" },
          $push: {
            statusHistory: {
              status: "withdrawn",
              at: new Date(),
              by: user.id,
              byName: user.name,
              note: "Withdrawn by student.",
            },
          },
        }
      );
      return ok({ item: await detail(id) });
    }

    if (!["draft", "submitted", "pending_review"].includes(application.status)) {
      return fail("This application can no longer be edited.", 409);
    }
    if (!application.recruitment || application.recruitment.status !== "open") {
      return fail("This recruitment is closed for edits.", 409);
    }
    if (new Date(application.recruitment.closesAt) < new Date()) {
      return fail("This recruitment is closed for edits.", 409);
    }

    const questions = await Question.find({ recruitment: application.recruitment._id, isActive: true })
      .sort({ order: 1 })
      .lean();
    const incoming = Array.isArray(data.answers)
      ? data.answers
      : (application.answers || []).map((answer) => ({
          questionId: String(answer.question || ""),
          value: answer.value,
          fileIds: (answer.files || []).map((file) => String(file)),
        }));

    const fileIds = [
      ...new Set(
        incoming
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

    const built = buildAnswers(questions, incoming, ownedFiles);
    if (built.error) return fail(built.error, 422);

    const update = { answers: built.answers };
    const push = [];
    if (data.submit && application.status !== "submitted") {
      update.status = "submitted";
      update.submittedAt = new Date();
      push.push({
        status: "submitted",
        at: new Date(),
        by: user.id,
        byName: user.name,
        note: "Application submitted.",
      });
    }

    await Application.updateOne(
      { _id: application._id },
      push.length ? { $set: update, $push: { statusHistory: { $each: push } } } : { $set: update }
    );

    const attached = built.answers.flatMap((answer) => answer.files || []);
    if (attached.length) {
      await UploadedFile.updateMany(
        { _id: { $in: attached }, user: user.id },
        { $set: { application: application._id } }
      );
    }

    return ok({ item: await detail(id) });
  }

  if (!hasAdminPermission(user, "review_applications")) {
    return fail("You do not have permission to review applications.", 403);
  }

  const parsed = adminSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;
  const previous = application.status;
  const societyName = application.society?.name || "the society";
  const update = { reviewedBy: user.id };
  if (data.reviewNotes !== undefined) update.reviewNotes = data.reviewNotes;

  if (data.status) {
    update.status = data.status;
    const pushEntry = {
      status: data.status,
      at: new Date(),
      by: user.id,
      byName: user.name,
      note: data.reviewNotes || "",
    };
    await Application.updateOne(
      { _id: application._id },
      { $set: update, $push: { statusHistory: pushEntry } }
    );
  } else {
    await Application.updateOne({ _id: application._id }, { $set: update });
  }

  if (data.status === "accepted") {
    const societyId = application.society?._id || application.society;
    let membership = await SocietyMember.findOne({ society: societyId, user: application.user });
    if (!membership) {
      membership = await SocietyMember.create({
        institute: user.instituteId,
        society: societyId,
        user: application.user,
        role: "member",
        status: "active",
        joinedAt: new Date(),
        addedBy: user.id,
      });
    }
    await awardPoints({
      institute: user.instituteId,
      userId: application.user,
      action: "society_joined",
      sourceType: "society_member",
      sourceId: membership._id,
      note: `Joined ${societyName}`,
      awardedBy: user.id,
    });
    await notify({
      instituteId: user.instituteId,
      userId: application.user,
      type: "application",
      title: `Congratulations · ${societyName}`,
      message: `Your application has been accepted. Welcome to ${societyName}!`,
      link: "/dashboard/societies",
    });
  } else if (data.status === "rejected") {
    await notify({
      instituteId: user.instituteId,
      userId: application.user,
      type: "application",
      title: `Application update · ${societyName}`,
      message: data.reviewNotes || "Your application was not successful this time.",
      link: "/dashboard/applications",
    });
  } else if (data.status === "shortlisted") {
    await notify({
      instituteId: user.instituteId,
      userId: application.user,
      type: "application",
      title: `Shortlisted · ${societyName}`,
      message: "You have been shortlisted. Keep an eye out for interview details.",
      link: "/dashboard/applications",
    });
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "application.review",
    entityType: "Application",
    entityId: application._id,
    summary: `Application ${previous}${data.status ? ` → ${data.status}` : " reviewed"} for ${societyName}.`,
  });

  return ok({ item: await detail(id) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (user.role !== "student" || !mongoose.isValidObjectId(id)) {
    return fail("Application not found.", 404);
  }

  await connectDB();
  const application = await Application.findOne({ _id: id, user: user.id }).lean();
  if (!application) return fail("Application not found.", 404);
  if (String(application.institute) !== user.instituteId) return fail("Application not found.", 404);
  if (application.status !== "draft") {
    return fail("Only draft applications can be deleted.", 409);
  }

  await Application.deleteOne({ _id: application._id });
  return ok({ removed: true });
}
