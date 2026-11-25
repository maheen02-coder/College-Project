import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireUser } from "@/lib/api";
import { hasAdminPermission, isAdmin } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { notify } from "@/lib/notify";
import { competitionPhase } from "@/lib/utils";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";

export const dynamic = "force-dynamic";

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapEntry(entry, competition) {
  return {
    id: String(entry._id),
    entryId: entry.entryId,
    teamName: entry.teamName || "",
    members: entry.members || [],
    status: entry.status,
    score: entry.score ?? null,
    position: entry.position || "none",
    remarks: entry.remarks || "",
    submissionLink: entry.submissionLink || "",
    createdAt: iso(entry.createdAt),
    competition: competition
      ? {
          id: String(competition._id),
          title: competition.title,
          slug: competition.slug,
          mode: competition.mode || "individual",
          startAt: iso(competition.startAt),
          endAt: iso(competition.endAt),
          registrationDeadline: iso(competition.registrationDeadline),
          leaderboardPublished: Boolean(competition.leaderboardPublished),
          status: competitionPhase(competition),
        }
      : null,
  };
}

const adminSchema = z.object({
  status: z.enum(["approved", "rejected", "disqualified"]).optional(),
  score: z.coerce.number().min(0).max(1000).nullable().optional(),
  position: z.enum(["none", "winner", "runner_up", "second_runner_up", "participant"]).optional(),
  remarks: z.string().trim().max(500).optional(),
});

const POSITION_MESSAGES = {
  winner: "Congratulations — you are the winner.",
  runner_up: "Congratulations — you secured the runner-up position.",
  second_runner_up: "Congratulations — you secured second runner-up.",
  participant: "Your participation has been recorded in the results.",
  none: "Your result has been updated.",
};

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isObjectId(id)) return fail("Entry not found.", 404);

  await connectDB();
  const entry = await CompetitionEntry.findById(id);
  if (!entry) return fail("Entry not found.", 404);

  const competition = await Competition.findById(entry.competition).lean();
  if (!competition) return fail("Competition not found.", 404);

  const owner = String(entry.user) === String(user.id);
  const staff =
    isAdmin(user) &&
    hasAdminPermission(user, "manage_competitions") &&
    String(entry.institute) === String(user.instituteId);

  const body = await readJson(request);

  if (staff) {
    const parsed = adminSchema.safeParse(body);
    if (!parsed.success) return fail(firstIssue(parsed.error), 422);
    const data = parsed.data;
    if (Object.keys(data).length === 0) return fail("Provide a change to apply.", 422);

    const update = {};
    if (data.status !== undefined) update.status = data.status;
    if (data.score !== undefined) update.score = data.score;
    if (data.position !== undefined) update.position = data.position;
    if (data.remarks !== undefined) update.remarks = data.remarks;

    const updated = await CompetitionEntry.findByIdAndUpdate(entry._id, { $set: update }, { returnDocument: "after" }).lean();

    if (data.status === "approved" || data.status === "rejected" || data.status === "disqualified") {
      await notify({
        instituteId: entry.institute,
        userId: entry.user,
        type: "competition",
        title: `Entry ${data.status} · ${competition.title}`,
        message:
          data.status === "approved"
            ? "Your competition entry has been approved."
            : data.status === "rejected"
              ? "Your competition entry was not approved. Contact the organiser for details."
              : "Your entry has been disqualified. Contact the organiser for details.",
        link: `/competitions/${competition.slug}`,
      });
    }

    if (data.position !== undefined || data.score !== undefined) {
      await notify({
        instituteId: entry.institute,
        userId: entry.user,
        type: "result",
        title: `Result update · ${competition.title}`,
        message: POSITION_MESSAGES[updated.position] || "Your result has been updated.",
        link: `/competitions/${competition.slug}`,
      });
    }

    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "competition_entry.update",
      entityType: "CompetitionEntry",
      entityId: entry._id,
      summary: `Updated entry ${entry.entryId} for ${competition.title}.`,
      meta: { fields: Object.keys(update) },
    });

    return ok({ item: mapEntry(updated, competition) });
  }

  if (!owner) return fail("You do not have permission to do that.", 403);

  const action = String(body.action || "").trim();
  if (action !== "withdraw" && body.status !== "withdrawn") {
    return fail("You can only withdraw this entry.", 403);
  }
  if (new Date(competition.registrationDeadline) < new Date()) {
    return fail("The registration deadline has passed — withdrawals are closed.", 409);
  }
  if (!["pending", "approved"].includes(entry.status)) {
    return fail("This entry can no longer be withdrawn.", 409);
  }

  entry.status = "withdrawn";
  await entry.save();

  return ok({ item: mapEntry(entry.toObject(), competition) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireUser();
  if (response) return response;
  if (!isObjectId(id)) return fail("Entry not found.", 404);

  await connectDB();
  const entry = await CompetitionEntry.findById(id).lean();
  if (!entry) return fail("Entry not found.", 404);

  const owner = String(entry.user) === String(user.id);
  const staff =
    isAdmin(user) &&
    hasAdminPermission(user, "manage_competitions") &&
    String(entry.institute) === String(user.instituteId);

  if (!staff) {
    if (!owner) return fail("You do not have permission to do that.", 403);
    if (entry.status !== "pending") return fail("Only pending entries can be deleted.", 409);
  }

  await CompetitionEntry.deleteOne({ _id: entry._id });

  if (staff) {
    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "competition_entry.delete",
      entityType: "CompetitionEntry",
      entityId: entry._id,
      summary: `Deleted entry ${entry.entryId}.`,
    });
  }

  return ok({ deleted: true });
}
