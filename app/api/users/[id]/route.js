import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin, serializeUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { ADMIN_PERMISSIONS, CLASS_YEARS, DEPARTMENTS } from "@/lib/constants";
import Achievement from "@/lib/models/Achievement";
import Application from "@/lib/models/Application";
import Certificate from "@/lib/models/Certificate";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const isObjectId = (value) => /^[a-fA-F0-9]{24}$/.test(String(value || ""));
const ACADEMIC_KEYS = ["matricRollNumber", "marksObtained", "totalMarks", "classYear", "section", "department"];

function baseUser(target, memberships, counts) {
  return {
    ...serializeUser(target),
    verifiedAt: target.verifiedAt || null,
    memberships,
    applicationsCount: counts.applications,
    achievementsCount: counts.achievements,
    certificatesCount: counts.certificates,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("User not found.", 404);

  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user)) return fail("Administrator access required.", 403);

  await connectDB();
  const target = await User.findOne({ _id: id, institute: user.instituteId }).populate("institute").lean();
  if (!target) return fail("User not found.", 404);

  const staff = ["admin", "superadmin"].includes(target.role);
  if (!hasAdminPermission(user, staff ? "manage_admins" : "manage_students")) {
    return fail("You do not have permission to do that.", 403);
  }

  const [membershipRows, applications, achievements, certificates] = await Promise.all([
    SocietyMember.find({ user: target._id })
      .populate("society", "name slug color")
      .sort({ joinedAt: -1 })
      .lean(),
    Application.countDocuments({ user: target._id }),
    Achievement.countDocuments({ user: target._id }),
    Certificate.countDocuments({ user: target._id }),
  ]);

  const memberships = membershipRows.map((row) => ({
    id: String(row._id),
    role: row.role,
    status: row.status,
    joinedAt: row.joinedAt || null,
    society: row.society
      ? { id: String(row.society._id), name: row.society.name, slug: row.society.slug, color: row.society.color }
      : null,
  }));

  return ok({
    user: baseUser(target, memberships, {
      applications,
      achievements,
      certificates,
    }),
  });
}

const studentSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  bio: z.string().trim().max(600).optional(),
  classYear: z.enum(CLASS_YEARS).optional(),
  section: z.string().trim().min(1).max(3).optional(),
  department: z.enum(DEPARTMENTS).optional(),
  skills: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  interests: z.array(z.string().trim().min(1).max(40)).max(20).optional(),
  isActive: z.boolean().optional(),
  matricRollNumber: z.string().trim().toUpperCase().min(2).max(40).optional(),
  marksObtained: z.coerce.number().int().min(0).optional(),
  totalMarks: z.coerce.number().int().positive().optional(),
});

const adminSchema = z.object({
  name: z.string().trim().min(2).max(80).optional(),
  phone: z.string().trim().max(30).optional(),
  adminRole: z.string().trim().max(60).optional(),
  adminPermissions: z.array(z.string().trim()).max(ADMIN_PERMISSIONS.length).optional(),
  isActive: z.boolean().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("User not found.", 404);

  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user)) return fail("Administrator access required.", 403);

  const body = await readJson(request);

  await connectDB();
  const target = await User.findOne({ _id: id, institute: user.instituteId });
  if (!target) return fail("User not found.", 404);

  const targetIsStaff = ["admin", "superadmin"].includes(target.role);

  if (body.action === "verify" || body.action === "reject") {
    if (!hasAdminPermission(user, "verify_students")) {
      return fail("You do not have permission to do that.", 403);
    }
    if (targetIsStaff) return fail("Verification applies to student accounts only.", 422);

    const approved = body.action === "verify";
    const note = typeof body.note === "string" ? body.note.trim().slice(0, 300) : "";

    target.verificationStatus = approved ? "verified" : "rejected";
    target.verificationNote = note;
    if (approved) {
      target.verifiedAt = new Date();
      target.verifiedBy = user.id;
    } else {
      target.verifiedAt = undefined;
      target.verifiedBy = undefined;
    }
    await target.save();

    await notify({
      instituteId: user.instituteId,
      userId: target._id,
      type: "system",
      title: approved ? "Account verified" : "Verification rejected",
      message: approved
        ? note || "Your student account is verified. You can now register for events and competitions."
        : note || "Your verification was rejected. Review your details and contact the activities office.",
      link: "/dashboard/profile",
    });

    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: approved ? "student.verified" : "student.verification_rejected",
      entityType: "User",
      entityId: target._id,
      summary: `${approved ? "Verified" : "Rejected"} ${target.name}${note ? ` — ${note}` : ""}.`,
    });

    await target.populate("institute");
    return ok({ user: serializeUser(target) });
  }

  if (targetIsStaff) {
    if (!hasAdminPermission(user, "manage_admins")) {
      return fail("You do not have permission to do that.", 403);
    }

    const parsed = adminSchema.safeParse(body);
    if (!parsed.success) return fail(firstIssue(parsed.error), 422);
    const data = parsed.data;

    if (target.role === "superadmin" && user.role !== "superadmin") {
      return fail("Only a superadmin can edit another superadmin.", 403);
    }
    if (data.adminPermissions) {
      const invalid = data.adminPermissions.filter((permission) => !ADMIN_PERMISSIONS.includes(permission));
      if (invalid.length) return fail(`Unknown permission: ${invalid[0]}.`, 422);
    }
    if (String(target._id) === String(user.id)) {
      if (data.isActive === false) return fail("You cannot deactivate your own account.", 409);
      if (data.adminRole !== undefined && data.adminRole !== target.adminRole) {
        return fail("You cannot change your own role.", 409);
      }
      if (data.adminPermissions !== undefined) {
        const current = [...(target.adminPermissions || [])].sort().join(",");
        const next = [...data.adminPermissions].sort().join(",");
        if (current !== next) return fail("You cannot change your own permissions.", 409);
      }
    }

    if (data.name !== undefined) target.name = data.name;
    if (data.phone !== undefined) target.phone = data.phone;
    if (data.adminRole !== undefined) target.adminRole = data.adminRole;
    if (data.adminPermissions !== undefined) target.adminPermissions = data.adminPermissions;
    if (data.isActive !== undefined) target.isActive = data.isActive;
    await target.save();

    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "admin.updated",
      entityType: "User",
      entityId: target._id,
      summary: `Updated ${target.role} account for ${target.name}.`,
    });

    await target.populate("institute");
    return ok({ user: serializeUser(target) });
  }

  if (!hasAdminPermission(user, "manage_students")) {
    return fail("You do not have permission to do that.", 403);
  }

  const parsed = studentSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const touchedAcademic = ACADEMIC_KEYS.filter(
    (key) => Object.prototype.hasOwnProperty.call(body, key) && body[key] !== undefined && body[key] !== ""
  );
  if (target.verificationStatus === "verified" && touchedAcademic.length && user.role !== "superadmin") {
    return fail("Academic details are locked after verification. Only a superadmin can correct them.", 409);
  }

  if (data.name !== undefined) target.name = data.name;
  if (data.phone !== undefined) target.phone = data.phone;
  if (data.bio !== undefined) target.bio = data.bio;
  if (data.classYear !== undefined) target.classYear = data.classYear;
  if (data.section !== undefined) target.section = data.section;
  if (data.department !== undefined) target.department = data.department;
  if (data.skills !== undefined) target.skills = [...new Set(data.skills)];
  if (data.interests !== undefined) target.interests = [...new Set(data.interests)];
  if (data.isActive !== undefined) target.isActive = data.isActive;
  if (data.matricRollNumber !== undefined) target.matricRollNumber = data.matricRollNumber;

  if (data.marksObtained !== undefined || data.totalMarks !== undefined) {
    const marks = data.marksObtained !== undefined ? data.marksObtained : target.matricMarks;
    const total = data.totalMarks !== undefined ? data.totalMarks : target.matricTotalMarks;
    if (!total || marks === null || marks === undefined) {
      return fail("Provide both marks obtained and total marks.", 422);
    }
    if (marks > total) return fail("Marks cannot exceed total marks.", 422);
    target.matricMarks = marks;
    target.matricTotalMarks = total;
    target.matricPercentage = Math.round((marks / total) * 1000) / 10;
  }

  try {
    await target.save();
  } catch (error) {
    if (error?.code === 11000) return fail("That matric roll number is already registered.", 409);
    return fail("Could not update this student. Please try again.", 500);
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "student.updated",
    entityType: "User",
    entityId: target._id,
    summary: `Updated student profile for ${target.name}.`,
  });

  await target.populate("institute");
  return ok({ user: serializeUser(target) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("User not found.", 404);

  const { user, response } = await requireUser();
  if (response) return response;
  if (!isAdmin(user)) return fail("Administrator access required.", 403);
  if (String(id) === String(user.id)) return fail("You cannot deactivate your own account.", 409);

  await connectDB();
  const target = await User.findOne({ _id: id, institute: user.instituteId });
  if (!target) return fail("User not found.", 404);

  const staff = ["admin", "superadmin"].includes(target.role);
  if (staff) {
    if (!hasAdminPermission(user, "manage_admins")) {
      return fail("You do not have permission to do that.", 403);
    }
    if (target.role === "superadmin" && user.role !== "superadmin") {
      return fail("Only a superadmin can deactivate another superadmin.", 403);
    }
  } else if (!hasAdminPermission(user, "manage_students")) {
    return fail("You do not have permission to do that.", 403);
  }

  target.isActive = false;
  await target.save();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "user.deactivated",
    entityType: "User",
    entityId: target._id,
    summary: `Deactivated ${target.role} account for ${target.name}.`,
  });

  return ok({ deactivated: true });
}
