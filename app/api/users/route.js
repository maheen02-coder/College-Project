import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { hashPassword, serializeUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { ADMIN_PERMISSIONS } from "@/lib/constants";
import Application from "@/lib/models/Application";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

function escapeRegex(value) {
  return String(value).replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function clampLimit(value, fallback = 100) {
  const number = Number.parseInt(value, 10);
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(number, 1), 100);
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const roleFilter = searchParams.get("role");
  const wantsAdmins = roleFilter === "admin" || roleFilter === "superadmin";
  const { user, response } = await requireAdmin(wantsAdmins ? "manage_admins" : "manage_students");
  if (response) return response;

  await connectDB();

  if (wantsAdmins) {
    const query = {
      institute: user.instituteId,
      role: roleFilter === "superadmin" ? "superadmin" : { $in: ["admin", "superadmin"] },
    };
    const q = (searchParams.get("q") || "").trim();
    if (q) {
      const regex = new RegExp(escapeRegex(q), "i");
      query.$or = [{ name: regex }, { email: regex }, { adminRole: regex }];
    }
    if (searchParams.get("isActive") === "true" || searchParams.get("isActive") === "false") {
      query.isActive = searchParams.get("isActive") === "true";
    }
    const rows = await User.find(query).sort({ createdAt: -1 }).limit(100).lean();
    return ok({
      users: rows.map((admin) => ({
        id: String(admin._id),
        name: admin.name,
        email: admin.email,
        role: admin.role,
        adminRole: admin.adminRole || "",
        adminPermissions: admin.adminPermissions || [],
        phone: admin.phone || "",
        isActive: admin.isActive,
        lastLoginAt: admin.lastLoginAt || null,
        createdAt: admin.createdAt,
      })),
    });
  }

  const query = { institute: user.instituteId };
  const roleParam = searchParams.get("role");
  query.role = roleParam && roleParam !== "all" ? roleParam : "student";

  const verificationStatus = searchParams.get("verificationStatus");
  if (verificationStatus) query.verificationStatus = verificationStatus;

  for (const key of ["classYear", "section", "department"]) {
    const value = searchParams.get(key);
    if (value) query[key] = value;
  }

  const activeParam = searchParams.get("isActive");
  if (activeParam === "true" || activeParam === "false") query.isActive = activeParam === "true";

  const q = (searchParams.get("q") || "").trim();
  if (q) {
    const regex = new RegExp(escapeRegex(q), "i");
    query.$or = [{ name: regex }, { email: regex }, { matricRollNumber: regex }];
  }

  const rows = await User.find(query)
    .sort({ createdAt: -1 })
    .limit(clampLimit(searchParams.get("limit")))
    .lean();

  const ids = rows.map((row) => row._id);
  const [memberships, applications] = ids.length
    ? await Promise.all([
        SocietyMember.aggregate([
          { $match: { user: { $in: ids }, status: "active" } },
          { $group: { _id: "$user", count: { $sum: 1 } } },
        ]),
        Application.aggregate([
          { $match: { user: { $in: ids } } },
          { $group: { _id: "$user", count: { $sum: 1 } } },
        ]),
      ])
    : [[], []];

  const membershipMap = Object.fromEntries(memberships.map((row) => [String(row._id), row.count]));
  const applicationMap = Object.fromEntries(applications.map((row) => [String(row._id), row.count]));

  return ok({
    users: rows.map((student) => ({
      id: String(student._id),
      name: student.name,
      email: student.email,
      role: student.role,
      matricRollNumber: student.matricRollNumber || "",
      matricPercentage: student.matricPercentage ?? null,
      classYear: student.classYear || "",
      section: student.section || "",
      department: student.department || "",
      phone: student.phone || "",
      avatar: student.avatar || "",
      verificationStatus: student.verificationStatus || "pending",
      points: student.points || 0,
      isActive: student.isActive,
      membershipCount: membershipMap[String(student._id)] || 0,
      applicationCount: applicationMap[String(student._id)] || 0,
      createdAt: student.createdAt,
      lastLoginAt: student.lastLoginAt || null,
    })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Enter the staff member's name.").max(80),
  email: z.string().trim().toLowerCase().email("Enter a valid email address.").max(120),
  password: z.string().min(8, "Password must be at least 8 characters.").max(72),
  role: z.enum(["admin", "superadmin"]).optional().default("admin"),
  adminRole: z.string().trim().max(60).optional().default(""),
  adminPermissions: z.array(z.string().trim()).max(ADMIN_PERMISSIONS.length).optional().default([]),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_admins");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  if (data.role === "superadmin" && user.role !== "superadmin") {
    return fail("Only a superadmin can create another superadmin.", 403);
  }

  const invalid = data.adminPermissions.filter((permission) => !ADMIN_PERMISSIONS.includes(permission));
  if (invalid.length) {
    return fail(`Unknown permission: ${invalid[0]}.`, 422);
  }

  await connectDB();
  if (await User.exists({ email: data.email })) {
    return fail("An account with this email already exists.", 409);
  }

  const permissions =
    data.role === "superadmin"
      ? data.adminPermissions.length
        ? data.adminPermissions
        : ADMIN_PERMISSIONS
      : data.adminPermissions;

  try {
    const created = await User.create({
      institute: user.instituteId,
      name: data.name,
      email: data.email,
      passwordHash: await hashPassword(data.password),
      role: data.role,
      adminRole: data.adminRole || (data.role === "superadmin" ? "superadmin" : ""),
      adminPermissions: permissions,
      verificationStatus: "verified",
      isActive: true,
    });

    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "admin.created",
      entityType: "User",
      entityId: created._id,
      summary: `Created ${data.role} account for ${created.name}.`,
    });

    await created.populate("institute");
    return ok({ user: serializeUser(created) }, { status: 201 });
  } catch (error) {
    if (error?.code === 11000) return fail("An account with this email already exists.", 409);
    return fail("Could not create the staff account. Please try again.", 500);
  }
}
