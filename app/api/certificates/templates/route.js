import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import CertificateTemplate from "@/lib/models/CertificateTemplate";

export const dynamic = "force-dynamic";

const hex = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color.");

const schema = z.object({
  name: z.string().trim().min(2, "Template name is required.").max(80),
  title: z.string().trim().max(160).optional().default(""),
  body: z.string().trim().max(2000).optional().default(""),
  signatory: z.string().trim().max(120).optional().default(""),
  primaryColor: hex.optional().default("#6d28d9"),
  accentColor: hex.optional().default("#2563eb"),
  isDefault: z.boolean().optional().default(false),
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

export async function GET() {
  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  await connectDB();
  const rows = await CertificateTemplate.find({ institute: user.instituteId })
    .sort({ isDefault: -1, createdAt: 1 })
    .lean();
  return ok({ templates: rows.map(serialize) });
}

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_certificates");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  if (await CertificateTemplate.exists({ institute: user.instituteId, name: data.name })) {
    return fail("A template with that name already exists.", 409);
  }

  const count = await CertificateTemplate.countDocuments({ institute: user.instituteId });
  const isDefault = data.isDefault || count === 0;
  if (isDefault) {
    await CertificateTemplate.updateMany(
      { institute: user.instituteId },
      { $set: { isDefault: false } }
    );
  }

  const template = await CertificateTemplate.create({
    institute: user.instituteId,
    name: data.name,
    title: data.title,
    body: data.body,
    signatory: data.signatory,
    primaryColor: data.primaryColor,
    accentColor: data.accentColor,
    isDefault,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "certificate_template.created",
    entityType: "CertificateTemplate",
    entityId: template._id,
    summary: `Created certificate template ${template.name}.`,
  });

  return ok({ template: serialize(template) }, { status: 201 });
}
