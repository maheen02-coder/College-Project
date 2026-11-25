import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { removeUpload } from "@/lib/uploads";
import { FILE_STATUS_META } from "@/lib/constants";
import UploadedFile from "@/lib/models/UploadedFile";

export const dynamic = "force-dynamic";

function mapFile(file) {
  return {
    id: String(file._id),
    name: file.name,
    mimeType: file.mimeType,
    size: file.size,
    kind: file.kind,
    status: file.status,
    reviewNotes: file.reviewNotes,
    reviewedAt: file.reviewedAt ? new Date(file.reviewedAt).toISOString() : null,
    createdAt: new Date(file.createdAt).toISOString(),
  };
}

const patchSchema = z.object({
  status: z.enum(["approved", "rejected", "resubmission_required", "pending_review"]),
  reviewNotes: z.string().trim().max(1000).optional().default(""),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("review_applications");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("File not found.", 404);

  await connectDB();
  const file = await UploadedFile.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!file) return fail("File not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);

  const updated = await UploadedFile.findByIdAndUpdate(
    file._id,
    {
      $set: {
        status: parsed.data.status,
        reviewNotes: parsed.data.reviewNotes,
        reviewedBy: user.id,
        reviewedAt: new Date(),
      },
    },
    { returnDocument: "after" }
  ).lean();

  const label = FILE_STATUS_META[updated.status]?.label || updated.status;
  await notify({
    instituteId: user.instituteId,
    userId: updated.user,
    type: "file_review",
    title: `File ${label.toLowerCase()} · ${updated.name}`,
    message: updated.reviewNotes || "Your uploaded file has been reviewed.",
    link: "/dashboard/applications",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "file.review",
    entityType: "UploadedFile",
    entityId: updated._id,
    summary: `Marked ${updated.name} as ${label}.`,
  });

  return ok({ item: mapFile(updated) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("File not found.", 404);

  await connectDB();
  const file = await UploadedFile.findById(id).lean();
  if (!file) return fail("File not found.", 404);
  if (String(file.institute) !== user.instituteId) return fail("File not found.", 404);

  const owner = String(file.user) === user.id;
  const admin = isAdmin(user);
  if (!owner && !admin) return fail("You do not have permission to delete this file.", 403);
  if (owner && !admin && file.status === "approved") {
    return fail("Approved files cannot be deleted.", 409);
  }

  await removeUpload(file.storedName);
  await UploadedFile.deleteOne({ _id: file._id });

  await logActivity({
    institute: file.institute,
    actor: user,
    action: "file.delete",
    entityType: "UploadedFile",
    entityId: file._id,
    summary: `Deleted file ${file.name}.`,
  });

  return ok({ removed: true });
}
