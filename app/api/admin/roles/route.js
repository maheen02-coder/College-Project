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

function mapRole(role, userCount = 0) {
  return {
    id: String(role._id),
    name: role.name,
    slug: role.slug,
    permissions: role.permissions || [],
    isSystem: Boolean(role.isSystem),
    userCount,
    createdAt: iso(role.createdAt),
  };
}

export async function GET() {
  const { user, response } = await requireAdmin("manage_admins");
  if (response) return response;

  await connectDB();
  const [roles, counts] = await Promise.all([
    AdminRole.find({ institute: user.instituteId }).sort({ isSystem: -1, name: 1 }).lean(),
    User.aggregate([
      {
        $match: {
          institute: new mongoose.Types.ObjectId(user.instituteId),
          role: { $in: ["admin", "superadmin"] },
        },
      },
      { $group: { _id: "$adminRole", count: { $sum: 1 } } },
    ]),
  ]);

  const countMap = Object.fromEntries(counts.map((row) => [row._id || "", row.count]));

  return ok({
    roles: roles.map((role) => mapRole(role, countMap[role.slug] || 0)),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Role name is required.").max(60),
  permissions: z.array(z.string()).optional().default([]),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_admins");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const permissions = [...new Set(data.permissions.map(String))];
  const invalid = permissions.filter((permission) => !ADMIN_PERMISSIONS.includes(permission));
  if (invalid.length) return fail(`Unknown permission: ${invalid[0]}.`, 422);

  const slug = slugify(data.name);
  if (!slug) return fail("Enter a valid role name.", 422);

  await connectDB();
  if (await AdminRole.exists({ institute: user.instituteId, slug })) {
    return fail("A role with that name already exists.", 409);
  }

  const role = await AdminRole.create({
    institute: user.instituteId,
    name: data.name,
    slug,
    permissions,
    isSystem: false,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "admin_role.created",
    entityType: "AdminRole",
    entityId: role._id,
    summary: `Created admin role ${role.name}.`,
  });

  return ok({ role: mapRole(role, 0) }, { status: 201 });
}
