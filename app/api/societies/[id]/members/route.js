import mongoose from "mongoose";
import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { SOCIETY_ROLE_META, SOCIETY_ROLES } from "@/lib/constants";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const ROLE_ORDER = [
  "president",
  "vice_president",
  "secretary",
  "treasurer",
  "event_manager",
  "team_lead",
  "member",
  "volunteer",
];
const LEADERSHIP = ["president", "vice_president", "secretary", "treasurer", "event_manager", "team_lead"];

async function loadSociety(id, instituteId) {
  await connectDB();
  const filter = { institute: instituteId, isActive: true };
  if (mongoose.isValidObjectId(id)) {
    filter.$or = [{ _id: id }, { slug: id }];
  } else {
    filter.slug = id;
  }
  return Society.findOne(filter).lean();
}

function mapMember(member) {
  return {
    id: String(member._id),
    userId: String(member.user?._id || member.user),
    name: member.user?.name || "Unknown",
    avatar: member.user?.avatar || "",
    email: member.user?.email || "",
    role: member.role,
    roleLabel: SOCIETY_ROLE_META[member.role]?.label || member.role,
    status: member.status,
    phone: member.phone,
    responsibilities: member.responsibilities,
    joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString() : null,
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  const institute = await getInstitute();
  if (!institute) return fail("Society not found.", 404);

  const society = await loadSociety(id, institute._id);
  if (!society) return fail("Society not found.", 404);

  const members = await SocietyMember.find({ society: society._id, status: "active" })
    .populate("user", "name avatar")
    .lean();

  const items = members
    .filter((m) => m.user)
    .sort(
      (a, b) =>
        ROLE_ORDER.indexOf(a.role) - ROLE_ORDER.indexOf(b.role) ||
        String(a.user.name).localeCompare(String(b.user.name))
    )
    .map((m) => ({
      id: String(m._id),
      userId: String(m.user._id),
      name: m.user.name,
      avatar: m.user.avatar || "",
      role: m.role,
      roleLabel: SOCIETY_ROLE_META[m.role]?.label || m.role,
      joinedAt: m.joinedAt ? new Date(m.joinedAt).toISOString() : null,
    }));

  return ok({ items, total: items.length });
}

const addSchema = z
  .object({
    userId: z.string().trim().optional(),
    email: z.string().trim().toLowerCase().optional(),
    role: z.enum(SOCIETY_ROLES).optional(),
    responsibilities: z.string().trim().max(500).optional().default(""),
    phone: z.string().trim().max(30).optional().default(""),
  })
  .refine((data) => data.userId || data.email, { message: "Choose a student by email or id." });

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  const society = await loadSociety(id, user.instituteId);
  if (!society) return fail("Society not found.", 404);

  const body = await readJson(request);
  const parsed = addSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const filter = { institute: user.instituteId };
  if (data.userId) {
    if (!mongoose.isValidObjectId(data.userId)) return fail("Choose a valid student.", 422);
    filter._id = data.userId;
  } else {
    filter.email = data.email;
  }

  const memberUser = await User.findOne(filter).lean();
  if (!memberUser) return fail("Student not found in this institute.", 404);
  if (memberUser.role !== "student" || memberUser.verificationStatus !== "verified") {
    return fail("Only verified students can be added to a society.", 409);
  }

  let membership = await SocietyMember.findOne({ society: society._id, user: memberUser._id });
  let created = false;
  if (membership) {
    if (data.role) membership.role = data.role;
    membership.status = "active";
    membership.responsibilities = data.responsibilities || membership.responsibilities;
    membership.phone = data.phone || membership.phone;
    membership.addedBy = user.id;
    await membership.save();
  } else {
    membership = await SocietyMember.create({
      institute: user.instituteId,
      society: society._id,
      user: memberUser._id,
      role: data.role || "member",
      status: "active",
      responsibilities: data.responsibilities,
      phone: data.phone || memberUser.phone || "",
      joinedAt: new Date(),
      addedBy: user.id,
    });
    created = true;
  }
  const role = membership.role;

  if (created) {
    await awardPoints({
      institute: user.instituteId,
      userId: memberUser._id,
      action: "society_joined",
      sourceType: "society_member",
      sourceId: membership._id,
      note: `Joined ${society.name}`,
      awardedBy: user.id,
    });
  }
  if (LEADERSHIP.includes(role)) {
    await awardPoints({
      institute: user.instituteId,
      userId: memberUser._id,
      action: "leadership_role",
      sourceType: "society_leadership",
      sourceId: membership._id,
      note: `${SOCIETY_ROLE_META[role]?.label || role} of ${society.name}`,
      awardedBy: user.id,
    });
  }

  await notify({
    instituteId: user.instituteId,
    userId: memberUser._id,
    type: "society",
    title: created ? `Welcome to ${society.name}` : `Membership updated · ${society.name}`,
    message: `You are now ${SOCIETY_ROLE_META[role]?.label || role} of ${society.name}.`,
    link: "/dashboard/societies",
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: created ? "society.member.add" : "society.member.update",
    entityType: "SocietyMember",
    entityId: membership._id,
    summary: `${created ? "Added" : "Updated"} ${memberUser.name} as ${role} in ${society.name}.`,
  });

  const populated = await SocietyMember.findById(membership._id).populate("user", "name avatar email").lean();
  return ok({ item: mapMember(populated) }, { status: created ? 201 : 200 });
}
