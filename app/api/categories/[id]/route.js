import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";
import Category from "@/lib/models/Category";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));
const hex = z.string().trim().regex(/^#(?:[0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/, "Enter a valid hex color.");

const schema = z.object({
  name: z.string().trim().min(2, "Category name is required.").max(60).optional(),
  description: z.string().trim().max(200).optional(),
  scope: z.enum(["event", "competition", "both"]).optional(),
  icon: z.string().trim().max(40).optional(),
  color: hex.optional(),
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

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Category not found.", 404);

  const { user, response } = await requireAdmin("manage_settings");
  if (response) return response;

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const category = await Category.findOne({ _id: id, institute: user.instituteId });
  if (!category) return fail("Category not found.", 404);

  if (data.name !== undefined) {
    const slug = slugify(data.name);
    if (!slug) return fail("Enter a valid category name.", 422);
    const duplicate = await Category.exists({
      institute: user.instituteId,
      slug,
      _id: { $ne: category._id },
    });
    if (duplicate) return fail("That category already exists.", 409);
    category.name = data.name;
    category.slug = slug;
  }
  if (data.description !== undefined) category.description = data.description;
  if (data.scope !== undefined) category.scope = data.scope;
  if (data.icon !== undefined) category.icon = data.icon;
  if (data.color !== undefined) category.color = data.color;

  try {
    await category.save();
  } catch (error) {
    if (error?.code === 11000) return fail("That category already exists.", 409);
    return fail("Could not update the category. Please try again.", 500);
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "category.updated",
    entityType: "Category",
    entityId: category._id,
    summary: `Updated category ${category.name}.`,
  });

  return ok({ category: serialize(category) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Category not found.", 404);

  const { user, response } = await requireAdmin("manage_settings");
  if (response) return response;

  await connectDB();
  const deleted = await Category.findOneAndDelete({ _id: id, institute: user.instituteId });
  if (!deleted) return fail("Category not found.", 404);

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "category.deleted",
    entityType: "Category",
    entityId: deleted._id,
    summary: `Deleted category ${deleted.name}.`,
  });

  return ok({ deleted: true });
}
