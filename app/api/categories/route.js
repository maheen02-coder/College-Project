import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { getInstitute } from "@/lib/queries";
import { slugify } from "@/lib/utils";
import Category from "@/lib/models/Category";

export const dynamic = "force-dynamic";

const hex = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color.");

const schema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(60),
  description: z.string().trim().max(200).optional().default(""),
  scope: z.enum(["event", "competition", "both"]).optional().default("both"),
  icon: z.string().trim().max(40).optional().default("sparkles"),
  color: hex.optional().default("#7c3aed"),
});

function serialize(category) {
  return {
    id: String(category._id),
    name: category.name,
    slug: category.slug,
    icon: category.icon,
    color: category.color,
    scope: category.scope,
    description: category.description || "",
  };
}

export async function GET() {
  const institute = await getInstitute();
  if (!institute) return ok({ categories: [] });

  await connectDB();
  const rows = await Category.find({ institute: institute._id }).sort({ name: 1 }).lean();
  return ok({ categories: rows.map(serialize) });
}

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_settings");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const slug = slugify(data.name);
  if (!slug) return fail("Enter a valid category name.", 422);

  await connectDB();
  if (await Category.exists({ institute: user.instituteId, slug })) {
    return fail("That category already exists.", 409);
  }

  const category = await Category.create({
    institute: user.instituteId,
    name: data.name,
    slug,
    description: data.description,
    scope: data.scope,
    icon: data.icon,
    color: data.color,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "category.created",
    entityType: "Category",
    entityId: category._id,
    summary: `Created category ${category.name}.`,
  });

  return ok({ category: serialize(category) }, { status: 201 });
}
