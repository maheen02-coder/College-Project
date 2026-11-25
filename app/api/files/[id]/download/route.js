import mongoose from "mongoose";
import { connectDB } from "@/lib/db";
import { fail, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { readUpload } from "@/lib/uploads";
import UploadedFile from "@/lib/models/UploadedFile";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("File not found.", 404);

  await connectDB();
  const file = await UploadedFile.findById(id).lean();
  if (!file) return fail("File not found.", 404);
  if (String(file.institute) !== user.instituteId) return fail("File not found.", 404);

  const owner = String(file.user) === user.id;
  const adminAllowed =
    isAdmin(user) &&
    ["review_applications", "manage_recruitment", "manage_students"].some((permission) =>
      hasAdminPermission(user, permission)
    );
  if (!owner && !adminAllowed) return fail("You do not have permission to download this file.", 403);

  let buffer;
  try {
    buffer = await readUpload(file.storedName);
  } catch {
    return fail("File is no longer available.", 404);
  }

  const filename = String(file.name || "download").replace(/["\\\r\n]/g, "");
  return new Response(buffer, {
    status: 200,
    headers: {
      "Content-Type": file.mimeType || "application/octet-stream",
      "Content-Disposition": `inline; filename="${filename}"`,
      "Content-Length": String(buffer.length),
    },
  });
}
