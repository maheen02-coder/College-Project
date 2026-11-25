import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { mapCertificate } from "@/lib/queries";
import Certificate from "@/lib/models/Certificate";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));

function detail(certificate) {
  return {
    ...mapCertificate(certificate),
    verifyUrl: `/verify/${certificate.certificateId}`,
    eventTitle: certificate.event?.title || "",
    competitionTitle: certificate.competition?.title || "",
    societyName: certificate.society?.name || "",
    instituteId: String(certificate.institute),
    student: certificate.user
      ? {
          id: String(certificate.user._id),
          name: certificate.user.name,
          matricRollNumber: certificate.user.matricRollNumber || "",
          classYear: certificate.user.classYear || "",
        }
      : null,
  };
}

async function load(id) {
  return Certificate.findById(id)
    .populate("event", "title slug")
    .populate("competition", "title slug")
    .populate("society", "name slug")
    .populate("user", "name matricRollNumber classYear")
    .lean();
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Certificate not found.", 404);

  const { user, response } = await requireUser();
  if (response) return response;

  await connectDB();
  const certificate = await load(id);
  if (!certificate) return fail("Certificate not found.", 404);

  const owner = String(certificate.user?._id || certificate.user) === String(user.id);
  const manager = isAdmin(user) && hasAdminPermission(user, "manage_certificates");
  if (!owner && !manager) return fail("Not permitted.", 403);

  return ok({ certificate: detail(certificate) });
}

const schema = z.object({
  status: z.enum(["valid", "revoked"]).optional(),
  revoke: z.boolean().optional(),
  revokeReason: z.string().trim().max(300).optional(),
  reason: z.string().trim().max(300).optional(),
  activityTitle: z.string().trim().min(2).max(160).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Certificate not found.", 404);

  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const certificate = await Certificate.findOne({ _id: id, institute: user.instituteId });
  if (!certificate) return fail("Certificate not found.", 404);

  if (data.revoke !== undefined) certificate.status = data.revoke ? "revoked" : "valid";
  if (data.status !== undefined) certificate.status = data.status;
  if (data.reason !== undefined) certificate.reason = data.reason;
  if (data.activityTitle !== undefined) certificate.activityTitle = data.activityTitle;

  await certificate.save();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: certificate.status === "revoked" ? "certificate.revoked" : "certificate.updated",
    entityType: "Certificate",
    entityId: certificate._id,
    summary: `${certificate.status === "revoked" ? "Revoked" : "Updated"} certificate ${certificate.certificateId} for ${certificate.recipientName}.`,
  });

  return ok({ certificate: detail(await load(certificate._id)) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Certificate not found.", 404);

  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  await connectDB();
  const deleted = await Certificate.findOneAndDelete({ _id: id, institute: user.instituteId });
  if (!deleted) return fail("Certificate not found.", 404);

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "certificate.deleted",
    entityType: "Certificate",
    entityId: deleted._id,
    summary: `Deleted certificate ${deleted.certificateId} for ${deleted.recipientName}.`,
  });

  return ok({ deleted: true });
}
