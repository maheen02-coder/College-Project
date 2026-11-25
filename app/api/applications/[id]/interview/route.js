import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import Application from "@/lib/models/Application";
import Interview from "@/lib/models/Interview";

export const dynamic = "force-dynamic";

function mapInterview(interview) {
  return {
    id: String(interview._id),
    applicationId: String(interview.application),
    studentId: String(interview.student),
    scheduledAt: new Date(interview.scheduledAt).toISOString(),
    mode: interview.mode,
    location: interview.location,
    meetingLink: interview.meetingLink,
    panel: interview.panel || [],
    status: interview.status,
    feedback: interview.feedback,
    score: interview.score,
    createdAt: new Date(interview.createdAt).toISOString(),
  };
}

function toList(value) {
  if (Array.isArray(value)) return value.map((item) => String(item).trim()).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);
}

function readScore(value) {
  if (value === undefined || value === null || value === "") return { value: null };
  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) {
    return { error: "Score must be between 0 and 100." };
  }
  return { value: score };
}

async function loadApplication(id, instituteId) {
  const application = await Application.findOne({ _id: id, institute: instituteId })
    .populate("society", "name slug")
    .lean();
  return application;
}

const createSchema = z.object({
  scheduledAt: z.string().min(1, "Interview date and time are required."),
  mode: z.enum(["on_campus", "online"]).optional().default("on_campus"),
  location: z.string().trim().max(200).optional().default(""),
  meetingLink: z.string().trim().max(400).optional().default(""),
  panel: z.union([z.array(z.string()), z.string()]).optional().default([]),
  feedback: z.string().trim().max(2000).optional().default(""),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("review_applications");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Application not found.", 404);

  await connectDB();
  const application = await loadApplication(id, user.instituteId);
  if (!application) return fail("Application not found.", 404);

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const scheduledAt = new Date(data.scheduledAt);
  if (Number.isNaN(scheduledAt.getTime())) return fail("Enter a valid interview date and time.", 422);
  const scoreResult = readScore(body.score);
  if (scoreResult.error) return fail(scoreResult.error, 422);

  const interview = await Interview.findOneAndUpdate(
    { application: application._id },
    {
      $set: {
        scheduledAt,
        mode: data.mode,
        location: data.location,
        meetingLink: data.meetingLink,
        panel: toList(data.panel),
        status: "scheduled",
        feedback: data.feedback,
        score: scoreResult.value,
      },
      $setOnInsert: {
        institute: user.instituteId,
        application: application._id,
        student: application.user,
        society: application.society?._id || application.society,
        createdBy: user.id,
      },
    },
    { upsert: true, returnDocument: "after", setDefaultsOnInsert: true }
  );

  const societyName = application.society?.name || "the society";
  if (application.status !== "interview_scheduled") {
    await Application.updateOne(
      { _id: application._id },
      {
        $set: { status: "interview_scheduled" },
        $push: {
          statusHistory: {
            status: "interview_scheduled",
            at: new Date(),
            by: user.id,
            byName: user.name,
            note: `Interview scheduled for ${scheduledAt.toLocaleString("en-GB")}.`,
          },
        },
      }
    );
  }

  await notify({
    instituteId: user.instituteId,
    userId: application.user,
    type: "interview",
    title: `Interview scheduled · ${societyName}`,
    message: `${scheduledAt.toLocaleString("en-GB")} · ${
      data.mode === "online" ? data.meetingLink || "Online" : data.location || "On campus"
    }`,
    link: "/dashboard/applications",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "application.interview.schedule",
    entityType: "Interview",
    entityId: interview._id,
    summary: `Scheduled interview for ${societyName}.`,
  });

  return ok({ item: mapInterview(interview) }, { status: 201 });
}

const patchSchema = z.object({
  status: z.enum(["scheduled", "completed", "no_show", "cancelled"]).optional(),
  scheduledAt: z.string().optional(),
  mode: z.enum(["on_campus", "online"]).optional(),
  location: z.string().trim().max(200).optional(),
  meetingLink: z.string().trim().max(400).optional(),
  panel: z.union([z.array(z.string()), z.string()]).optional(),
  feedback: z.string().trim().max(2000).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("review_applications");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Application not found.", 404);

  await connectDB();
  const application = await loadApplication(id, user.instituteId);
  if (!application) return fail("Application not found.", 404);

  const interview = await Interview.findOne({ application: application._id });
  if (!interview) return fail("Interview not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const update = { ...data };
  if (data.panel !== undefined) update.panel = toList(data.panel);
  if (data.scheduledAt !== undefined && !data.scheduledAt) delete update.scheduledAt;
  if (data.scheduledAt) {
    const scheduledAt = new Date(data.scheduledAt);
    if (Number.isNaN(scheduledAt.getTime())) return fail("Enter a valid interview date and time.", 422);
    update.scheduledAt = scheduledAt;
  }
  if (body.score !== undefined) {
    const scoreResult = readScore(body.score);
    if (scoreResult.error) return fail(scoreResult.error, 422);
    update.score = scoreResult.value;
  }

  const updated = await Interview.findByIdAndUpdate(interview._id, { $set: update }, { returnDocument: "after" }).lean();

  if (data.status === "completed") {
    await Application.updateOne(
      { _id: application._id },
      {
        $push: {
          statusHistory: {
            status: application.status,
            at: new Date(),
            by: user.id,
            byName: user.name,
            note: "Interview completed",
          },
        },
      }
    );
  }

  const societyName = application.society?.name || "the society";
  await notify({
    instituteId: user.instituteId,
    userId: application.user,
    type: "interview",
    title: `Interview update · ${societyName}`,
    message:
      data.status === "cancelled"
        ? "Your interview has been cancelled. Check your dashboard for next steps."
        : data.status === "completed"
          ? "Your interview is complete. Thank you for attending."
          : data.status === "no_show"
            ? "You were marked as a no-show for your interview."
            : "Your interview details have been updated.",
    link: "/dashboard/applications",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "application.interview.update",
    entityType: "Interview",
    entityId: updated._id,
    summary: `Updated interview${data.status ? ` (${data.status})` : ""} for ${societyName}.`,
  });

  return ok({ item: mapInterview(updated) });
}
