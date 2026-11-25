import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import CertificateTemplate from "@/lib/models/CertificateTemplate";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));
const hex = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color.");

const schema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  title: z.string().trim().max(160).optional(),
  body: z.string().trim().max(2000).optional(),
  signatory: z.string().trim().max(120).optional(),
  primaryColor: hex.optional(),
  accentColor: hex.optional(),
  isDefault: z.boolean().optional(),
});

function serialize(template) {
  return {
    id: String(template._id),
    name: template.name,
    title: template.title || "",
    body: template.body || "",
    signatory: template.signatory || "",
    primaryColor: template.primaryColor,
    accentColor: template.accentColor,
    isDefault: Boolean(template.isDefault),
    createdAt: template.createdAt || null,
  };
}

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Template not found.", 404);

  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const template = await CertificateTemplate.findOne({ _id: id, institute: user.instituteId });
  if (!template) return fail("Template not found.", 404);

  if (data.name !== undefined && data.name !== template.name) {
    if (await CertificateTemplate.exists({ institute: user.instituteId, name: data.name, _id: { $ne: template._id } })) {
      return fail("A template with that name already exists.", 409);
    }
    template.name = data.name;
  }
  if (data.title !== undefined) template.title = data.title;
  if (data.body !== undefined) template.body = data.body;
  if (data.signatory !== undefined) template.signatory = data.signatory;
  if (data.primaryColor !== undefined) template.primaryColor = data.primaryColor;
  if (data.accentColor !== undefined) template.accentColor = data.accentColor;

  if (data.isDefault === true) {
    await CertificateTemplate.updateMany(
      { institute: user.instituteId, _id: { $ne: template._id } },
      { $set: { isDefault: false } }
    );
    template.isDefault = true;
  } else if (data.isDefault === false) {
    template.isDefault = false;
  }

  try {
    await template.save();
  } catch (error) {
    if (error?.code === 11000) return fail("A template with that name already exists.", 409);
    return fail("Could not update the template. Please try again.", 500);
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "certificate_template.updated",
    entityType: "CertificateTemplate",
    entityId: template._id,
    summary: `Updated certificate template ${template.name}.`,
  });

  return ok({ template: serialize(template) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Template not found.", 404);

  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  await connectDB();
  const template = await CertificateTemplate.findOne({ _id: id, institute: user.instituteId });
  if (!template) return fail("Template not found.", 404);
  if (template.isDefault) {
    return fail("The default template cannot be deleted. Set another template as default first.", 409);
  }

  await template.deleteOne();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "certificate_template.deleted",
    entityType: "CertificateTemplate",
    entityId: template._id,
    summary: `Deleted certificate template ${template.name}.`,
  });

  return ok({ deleted: true });
}
