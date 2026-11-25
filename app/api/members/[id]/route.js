import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { SOCIETY_ROLE_META, SOCIETY_ROLES } from "@/lib/constants";
import SocietyMember from "@/lib/models/SocietyMember";

export const dynamic = "force-dynamic";

const LEADERSHIP = ["president", "vice_president", "secretary", "treasurer", "event_manager", "team_lead"];

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
    society: member.society
      ? { id: String(member.society._id), name: member.society.name, slug: member.society.slug }
      : null,
    joinedAt: member.joinedAt ? new Date(member.joinedAt).toISOString() : null,
  };
}

const patchSchema = z.object({
  role: z.enum(SOCIETY_ROLES).optional(),
  status: z.enum(["active", "alumni", "removed"]).optional(),
  responsibilities: z.string().trim().max(500).optional(),
  phone: z.string().trim().max(30).optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  await connectDB();
  const member = await SocietyMember.findOne({ _id: id, institute: user.instituteId })
    .populate("society", "name slug")
    .populate("user", "name avatar email");
  if (!member) return fail("Membership not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const previousRole = member.role;
  if (data.role) member.role = data.role;
  if (data.status) member.status = data.status;
  if (data.responsibilities !== undefined) member.responsibilities = data.responsibilities;
  if (data.phone !== undefined) member.phone = data.phone;
  await member.save();

  if (data.role && LEADERSHIP.includes(data.role) && !LEADERSHIP.includes(previousRole)) {
    await awardPoints({
      institute: user.instituteId,
      userId: member.user?._id,
      action: "leadership_role",
      sourceType: "society_leadership_change",
      sourceId: member._id,
      note: `${SOCIETY_ROLE_META[data.role]?.label || data.role} of ${member.society?.name || "society"}`,
      awardedBy: user.id,
    });
  }

  if (member.user) {
    await notify({
      instituteId: user.instituteId,
      userId: member.user._id,
      type: "society",
      title: `Membership updated · ${member.society?.name || "Society"}`,
      message:
        data.status === "removed"
          ? `Your membership of ${member.society?.name || "the society"} has been removed.`
          : `Your role is now ${SOCIETY_ROLE_META[member.role]?.label || member.role}.`,
      link: "/dashboard/societies",
    });
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "society.member.update",
    entityType: "SocietyMember",
    entityId: member._id,
    summary: `Updated membership of ${member.user?.name || "a student"} to ${member.role} (${member.status}).`,
  });

  return ok({ item: mapMember(member) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  await connectDB();
  const member = await SocietyMember.findOne({ _id: id, institute: user.instituteId })
    .populate("society", "name")
    .populate("user", "name");
  if (!member) return fail("Membership not found.", 404);

  member.status = "removed";
  await member.save();

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "society.member.remove",
    entityType: "SocietyMember",
    entityId: member._id,
    summary: `Removed ${member.user?.name || "a student"} from ${member.society?.name || "society"}.`,
  });

  return ok({ removed: true });
}
