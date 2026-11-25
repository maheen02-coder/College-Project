import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { getInstitute } from "@/lib/queries";
import Event from "@/lib/models/Event";
import Institute from "@/lib/models/Institute";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function serialize(institute, stats) {
  return {
    id: String(institute._id),
    name: institute.name,
    shortName: institute.shortName,
    slug: institute.slug,
    tagline: institute.tagline || "",
    city: institute.city || "",
    emailDomain: institute.emailDomain || "",
    branding: {
      primary: institute.branding?.primary || "#7c3aed",
      accent: institute.branding?.accent || "#3b82f6",
      logoText: institute.branding?.logoText || "KIPS",
    },
    leadership: {
      principal: institute.leadership?.principal || "",
      registrar: institute.leadership?.registrar || "",
      activitiesHead: institute.leadership?.activitiesHead || "",
    },
    ...(stats ? { stats } : {}),
  };
}

export async function GET() {
  const institute = await getInstitute();
  if (!institute) return fail("Institute is not configured yet.", 404);

  const [societies, events, students] = await Promise.all([
    Society.countDocuments({ institute: institute._id, isActive: true }),
    Event.countDocuments({ institute: institute._id }),
    User.countDocuments({ institute: institute._id, role: "student", isActive: true }),
  ]);

  return ok({ item: serialize(institute, { societies, events, students }) });
}

const hex = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color.");

const schema = z.object({
  name: z.string().trim().min(2, "Institute name is required.").max(120).optional(),
  shortName: z.string().trim().min(2, "Short name is required.").max(24).optional(),
  tagline: z.string().trim().max(160).optional(),
  city: z.string().trim().max(80).optional(),
  emailDomain: z.string().trim().max(120).optional(),
  branding: z
    .object({
      primary: hex.optional(),
      accent: hex.optional(),
      logoText: z.string().trim().max(12).optional(),
    })
    .optional(),
  leadership: z
    .object({
      principal: z.string().trim().max(80).optional(),
      registrar: z.string().trim().max(80).optional(),
      activitiesHead: z.string().trim().max(80).optional(),
    })
    .optional(),
});

export async function PATCH(request) {
  const { user, response } = await requireAdmin("manage_settings");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const institute = await Institute.findById(user.instituteId);
  if (!institute) return fail("Institute not found.", 404);

  for (const key of ["name", "shortName", "tagline", "city", "emailDomain"]) {
    if (data[key] !== undefined) institute[key] = data[key];
  }
  if (data.branding) Object.assign(institute.branding, data.branding);
  if (data.leadership) Object.assign(institute.leadership, data.leadership);

  await institute.save();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "institute.settings_updated",
    entityType: "Institute",
    entityId: institute._id,
    summary: "Updated institute profile and branding.",
  });

  return ok({ item: serialize(institute.toObject()) });
}
