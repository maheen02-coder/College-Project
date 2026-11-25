import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { slugify } from "@/lib/utils";
import { ADMIN_PERMISSIONS } from "@/lib/constants";
import AdminRole from "@/lib/models/AdminRole";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapRole(role) {
  return {
    id: String(role._id),
    name: role.name,
    slug: role.slug,
    permissions: role.permissions || [],
    isSystem: Boolean(role.isSystem),
    createdAt: iso(role.createdAt),
  };
}

const updateSchema = z.object({
  name: z.string().trim().min(2, "Role name is required.").max(60).optional(),
  permissions: z.array(z.string()).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_admins");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Role not found.", 404);

  const body = await readJson(request);
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const role = await AdminRole.findOne({ _id: id, institute: user.instituteId });
  if (!role) return fail("Role not found.", 404);

  if (role.isSystem && role.slug === "superadmin" && user.role !== "superadmin") {
    return fail("Only a super admin can modify the super admin role.", 403);
  }

  if (data.permissions !== undefined) {
    const permissions = [...new Set(data.permissions.map(String))];
    const invalid = permissions.filter((permission) => !ADMIN_PERMISSIONS.includes(permission));
    if (invalid.length) return fail(`Unknown permission: ${invalid[0]}.`, 422);
    role.permissions = permissions;
  }

  if (data.name !== undefined && data.name !== role.name) {
    if (!role.isSystem) {
      const nextSlug = slugify(data.name);
      if (!nextSlug) return fail("Enter a valid role name.", 422);
      if (nextSlug !== role.slug) {
        const duplicate = await AdminRole.exists({
          institute: user.instituteId,
          slug: nextSlug,
          _id: { $ne: role._id },
        });
        if (duplicate) return fail("A role with that name already exists.", 409);
        role.slug = nextSlug;
      }
    }
    role.name = data.name;
  }

  await role.save();

  await logActivity({
    institute: role.institute,
    actor: user,
    action: "admin_role.updated",
    entityType: "AdminRole",
    entityId: role._id,
    summary: `Updated admin role ${role.name}.`,
  });

  return ok({ role: mapRole(role) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_admins");
  if (response) return response;
  if (!mongoose.isValidObjectId(id)) return fail("Role not found.", 404);

  await connectDB();
  const role = await AdminRole.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!role) return fail("Role not found.", 404);
  if (role.isSystem) return fail("System roles cannot be deleted.", 409);

  const inUse = await User.exists({ institute: user.instituteId, adminRole: role.slug });
  if (inUse) return fail("Reassign admins using this role before deleting it.", 409);

  await AdminRole.deleteOne({ _id: role._id });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "admin_role.deleted",
    entityType: "AdminRole",
    entityId: role._id,
    summary: `Deleted admin role ${role.name}.`,
  });

  return ok({ deleted: true });
}
