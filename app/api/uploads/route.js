import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { fail, ok, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { removeUpload, saveUpload } from "@/lib/uploads";
import Application from "@/lib/models/Application";
import Question from "@/lib/models/Question";
import UploadedFile from "@/lib/models/UploadedFile";

export const dynamic = "force-dynamic";

const KINDS = ["application", "gallery", "avatar", "other"];

function mapFile(file) {
  return {
    id: String(file._id),
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    kind: file.kind,
    status: file.status,
    applicationId: file.application ? String(file.application) : "",
    questionId: file.question ? String(file.question) : "",
    reviewNotes: file.reviewNotes,
    createdAt: file.createdAt ? new Date(file.createdAt).toISOString() : null,
  };
}

export async function POST(request) {
  const { user, response } = await requireUser();
  if (response) return response;
  if (user.role !== "student" && !isAdmin(user)) {
    return fail("Only students and administrators can upload files.", 403);
  }

  let form;
  try {
    form = await request.formData();
  } catch {
    return fail("Invalid upload request.", 422);
  }

  const file = form.get("file");
  const kindValue = String(form.get("kind") || "application");
  const kind = KINDS.includes(kindValue) ? kindValue : "application";
  const saved = await saveUpload(file, kind);
  if (saved.error) return fail(saved.error, 422);

  await connectDB();
  const applicationId = String(form.get("applicationId") || "");
  const questionId = String(form.get("questionId") || "");

  let application;
  if (applicationId && mongoose.isValidObjectId(applicationId)) {
    const owned = await Application.exists({
      _id: applicationId,
      user: user.id,
      institute: user.instituteId,
    });
    if (owned) application = applicationId;
  }

  let question;
  if (questionId && mongoose.isValidObjectId(questionId)) {
    const exists = await Question.exists({ _id: questionId, institute: user.instituteId });
    if (exists) question = questionId;
  }

  let record;
  try {
    record = await UploadedFile.create({
      institute: user.instituteId,
      user: user.id,
      application,
      question,
      name: saved.name,
      storedName: saved.storedName,
      mimeType: saved.mimeType,
      size: saved.size,
      kind: saved.kind,
    });
  } catch (error) {
    await removeUpload(saved.storedName);
    throw error;
  }

  return ok(
    {
      item: {
        id: String(record._id),
        name: record.name,
        mimeType: record.mimeType,
        size: record.size,
        status: record.status,
        kind: record.kind,
      },
    },
    { status: 201 }
  );
}

export async function GET(request) {
  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const { searchParams } = new URL(request.url);
  const applicationId = searchParams.get("applicationId");
  const query = { institute: user.instituteId, user: user.id };
  if (applicationId && mongoose.isValidObjectId(applicationId)) query.application = applicationId;

  const files = await UploadedFile.find(query).sort({ createdAt: -1 }).limit(50).lean();
  return ok({ items: files.map(mapFile) });
}
