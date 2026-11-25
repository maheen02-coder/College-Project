import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getSessionUser } from "@/lib/auth";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { notifyMany } from "@/lib/notify";
import { awardPoints } from "@/lib/points";
import { competitionPhase } from "@/lib/utils";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

const WINNER_POSITIONS = ["winner", "runner_up", "second_runner_up"];
const POSITION_RANK = { winner: 0, runner_up: 1, second_runner_up: 2, participant: 3, none: 4 };

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function toList(value) {
  if (Array.isArray(value)) return value.map((entry) => String(entry).trim()).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((entry) => entry.trim())
    .filter(Boolean);
}

function societySummary(society) {
  if (!society || !society._id) return null;
  return {
    id: String(society._id),
    name: society.name || "",
    slug: society.slug || "",
    color: society.color || "#7c3aed",
  };
}

function mapCompetition(competition, counts = {}) {
  const phase = competitionPhase(competition);
  const capacity = Number(competition.capacity) || 0;
  const entryCount = counts.approved || 0;
  return {
    id: String(competition._id),
    title: competition.title,
    slug: competition.slug,
    excerpt: competition.excerpt || "",
    description: competition.description,
    poster: competition.poster || "",
    category: competition.category,
    type: competition.type,
    mode: competition.mode || "individual",
    teamSize: {
      min: Number(competition.teamSize?.min) || 1,
      max: Number(competition.teamSize?.max) || 1,
    },
    venue: competition.venue,
    startAt: iso(competition.startAt),
    endAt: iso(competition.endAt),
    registrationDeadline: iso(competition.registrationDeadline),
    submissionDeadline: iso(competition.submissionDeadline),
    capacity,
    entryCount,
    pendingCount: counts.pending || 0,
    totalEntries: counts.total || 0,
    seatsLeft: Math.max(0, capacity - entryCount),
    prizeDetails: competition.prizeDetails || "",
    rules: competition.rules || [],
    requirements: competition.requirements || "",
    organizerId: competition.organizer ? String(competition.organizer) : "",
    organizerName: competition.organizerName || "",
    society: societySummary(competition.society),
    phase,
    status: phase,
    storedStatus: competition.status,
    leaderboardPublished: Boolean(competition.leaderboardPublished),
    createdAt: iso(competition.createdAt),
    updatedAt: iso(competition.updatedAt),
  };
}

function mapEntry(entry, { publicView = false } = {}) {
  const student = entry.user || {};
  const base = {
    id: String(entry._id),
    entryId: entry.entryId,
    teamName: entry.teamName || "",
    members: entry.members || [],
    status: entry.status,
    createdAt: iso(entry.createdAt),
    user: {
      id: String(student._id || ""),
      name: student.name || "Unknown student",
      avatar: student.avatar || "",
      department: student.department || "",
    },
  };
  if (publicView) {
    return { ...base, status: undefined, remarks: undefined };
  }
  return {
    ...base,
    score: entry.score ?? null,
    position: entry.position || "none",
    remarks: entry.remarks || "",
    submissionLink: entry.submissionLink || "",
    user: {
      ...base.user,
      email: student.email || "",
      rollNumber: student.rollNumber || "",
    },
  };
}

async function findCompetition(id) {
  if (isObjectId(id)) {
    return Competition.findById(id).populate("society", "name slug color").lean();
  }
  const institute = await getInstitute();
  if (!institute) return null;
  return Competition.findOne({ institute: institute._id, slug: id.toLowerCase() })
    .populate("society", "name slug color")
    .lean();
}

export async function GET(request, { params }) {
  const { id } = await params;
  await connectDB();

  const competition = await findCompetition(id);
  if (!competition) return fail("Competition not found.", 404);

  const user = await getSessionUser();
  if (user && String(competition.institute) !== String(user.instituteId)) {
    return fail("Competition not found.", 404);
  }

  const related = await Competition.find({
    institute: competition.institute,
    category: competition.category,
    _id: { $ne: competition._id },
    status: { $ne: "cancelled" },
  })
    .populate("society", "name slug color")
    .sort({ startAt: 1 })
    .limit(3)
    .lean();

  const [statusRows, entries, viewerEntry] = await Promise.all([
    CompetitionEntry.aggregate([
      { $match: { competition: competition._id } },
      {
        $group: {
          _id: null,
          approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
          pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
          total: { $sum: 1 },
        },
      },
    ]),
    competition.leaderboardPublished
      ? CompetitionEntry.find({ competition: competition._id, status: "approved" })
          .populate("user", "name email rollNumber department avatar")
          .lean()
      : [],
    user ? CompetitionEntry.findOne({ competition: competition._id, user: user.id }).lean() : null,
  ]);

  const counts = statusRows[0] || { approved: 0, pending: 0, total: 0 };

  let relatedCounts = {};
  if (related.length) {
    const rows = await CompetitionEntry.aggregate([
      { $match: { competition: { $in: related.map((row) => row._id) }, status: "approved" } },
      { $group: { _id: "$competition", approved: { $sum: 1 }, total: { $sum: 1 } } },
    ]);
    relatedCounts = Object.fromEntries(rows.map((row) => [String(row._id), row]));
  }

  const leaderboard = competition.leaderboardPublished
    ? entries
        .slice()
        .sort(
          (a, b) =>
            (POSITION_RANK[a.position] ?? 9) - (POSITION_RANK[b.position] ?? 9) ||
            (Number(b.score) || 0) - (Number(a.score) || 0)
        )
        .map((entry) => ({
          id: String(entry._id),
          entryId: entry.entryId,
          teamName: entry.teamName || "",
          position: entry.position || "none",
          score: entry.score ?? null,
          user: {
            id: String(entry.user?._id || ""),
            name: entry.user?.name || "Unknown student",
            rollNumber: entry.user?.rollNumber || "",
            department: entry.user?.department || "",
            avatar: entry.user?.avatar || "",
          },
        }))
    : null;

  return ok({
    item: mapCompetition(competition, counts),
    leaderboard,
    related: related.map((row) => mapCompetition(row, relatedCounts[String(row._id)] || {})),
    viewer: {
      entry: viewerEntry ? mapEntry(viewerEntry) : null,
    },
  });
}

const patchSchema = z.object({
  title: z.string().trim().min(4).max(140).optional(),
  excerpt: z.string().trim().max(300).optional(),
  description: z.string().trim().min(20).optional(),
  category: z.string().trim().min(1).optional(),
  type: z.string().trim().min(1).optional(),
  mode: z.enum(["individual", "team"]).optional(),
  teamSize: z
    .object({ min: z.coerce.number().int().min(1), max: z.coerce.number().int().min(1) })
    .optional(),
  startAt: z.string().optional(),
  endAt: z.string().optional(),
  registrationDeadline: z.string().optional(),
  submissionDeadline: z.string().nullable().optional(),
  venue: z.string().trim().min(2).optional(),
  capacity: z.coerce.number().int().min(1).optional(),
  prizeDetails: z.string().trim().max(400).optional(),
  rules: z.union([z.array(z.string()), z.string()]).optional(),
  requirements: z.string().trim().max(2000).optional(),
  poster: z.string().trim().max(500).optional(),
  status: z
    .enum(["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"])
    .optional(),
  leaderboardPublished: z.boolean().optional(),
  societyId: z.string().trim().nullable().optional(),
  organizerId: z.string().trim().optional(),
  organizer: z.string().trim().optional(),
});

export async function PATCH(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_competitions");
  if (response) return response;
  if (!isObjectId(id)) return fail("Competition not found.", 404);

  await connectDB();
  const competition = await Competition.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!competition) return fail("Competition not found.", 404);

  const body = await readJson(request);
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const update = {};
  for (const key of [
    "title",
    "excerpt",
    "description",
    "category",
    "type",
    "mode",
    "venue",
    "capacity",
    "prizeDetails",
    "requirements",
    "poster",
    "status",
    "leaderboardPublished",
  ]) {
    if (data[key] !== undefined) update[key] = data[key];
  }
  if (data.rules !== undefined) update.rules = toList(data.rules);

  if (data.teamSize !== undefined) {
    const mode = data.mode || competition.mode;
    if (mode === "team") {
      const min = Math.max(2, data.teamSize.min);
      update.teamSize = { min, max: Math.max(min, data.teamSize.max) };
    } else {
      update.teamSize = { min: 1, max: 1 };
    }
  }

  const dateKeys = ["startAt", "endAt", "registrationDeadline", "submissionDeadline"];
  if (dateKeys.some((key) => data[key] !== undefined)) {
    const dates = {
      startAt: new Date(data.startAt ?? competition.startAt),
      endAt: new Date(data.endAt ?? competition.endAt),
      registrationDeadline: new Date(data.registrationDeadline ?? competition.registrationDeadline),
      submissionDeadline: data.submissionDeadline
        ? new Date(data.submissionDeadline)
        : data.submissionDeadline === null
          ? null
          : competition.submissionDeadline
            ? new Date(competition.submissionDeadline)
            : null,
    };
    if ([dates.startAt, dates.endAt, dates.registrationDeadline, dates.submissionDeadline].filter(Boolean).some((date) => Number.isNaN(date.getTime()))) {
      return fail("Enter valid competition dates.", 422);
    }
    if (dates.startAt >= dates.endAt) return fail("End time must be after the start.", 422);
    if (dates.registrationDeadline > dates.startAt) {
      return fail("Registration deadline must be on or before the competition start.", 422);
    }
    if (dates.submissionDeadline && (dates.submissionDeadline < dates.startAt || dates.submissionDeadline > dates.endAt)) {
      return fail("Submission deadline must fall within the competition window.", 422);
    }
    if (data.startAt !== undefined) update.startAt = dates.startAt;
    if (data.endAt !== undefined) update.endAt = dates.endAt;
    if (data.registrationDeadline !== undefined) update.registrationDeadline = dates.registrationDeadline;
    if (data.submissionDeadline !== undefined) update.submissionDeadline = dates.submissionDeadline || null;
  }

  if (data.societyId !== undefined) {
    if (!data.societyId) {
      update.society = null;
    } else {
      if (!isObjectId(data.societyId)) return fail("Select a valid society.", 422);
      const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
      if (!society) return fail("Society not found.", 422);
      update.society = society._id;
    }
  }

  const organizerRef = String(data.organizerId ?? data.organizer ?? "").trim();
  if (organizerRef) {
    if (!isObjectId(organizerRef)) return fail("Select a valid organizer.", 422);
    const organizer = await User.findOne({ _id: organizerRef, institute: user.instituteId }).lean();
    if (!organizer) return fail("Organizer not found.", 422);
    update.organizer = organizer._id;
    update.organizerName = organizer.name;
  }

  const updated = await Competition.findByIdAndUpdate(competition._id, { $set: update }, { returnDocument: "after" })
    .populate("society", "name slug color")
    .lean();

  if (update.status === "cancelled" && competition.status !== "cancelled") {
    const entrants = await CompetitionEntry.find({
      competition: competition._id,
      status: { $in: ["pending", "approved"] },
    })
      .select("user")
      .lean();
    await notifyMany(
      entrants.map((entry) => ({
        institute: competition.institute,
        user: entry.user,
        type: "competition",
        title: `Competition cancelled · ${competition.title}`,
        message: "The organiser has cancelled this competition. Your entry has been released.",
        link: `/competitions/${competition.slug}`,
      }))
    );
  }

  if (data.leaderboardPublished === true && !competition.leaderboardPublished) {
    const entries = await CompetitionEntry.find({ competition: competition._id, status: "approved" }).lean();
    let awarded = 0;
    for (const entry of entries) {
      const isWinner = WINNER_POSITIONS.includes(entry.position);
      const points = await awardPoints({
        institute: competition.institute,
        userId: entry.user,
        action: isWinner ? "competition_win" : "competition_participation",
        sourceType: "competition_entry",
        sourceId: entry._id,
        note: `${competition.title} result`,
        awardedBy: user.id,
      });
      if (points) awarded += 1;
    }
    if (entries.length) {
      await notifyMany(
        entries.map((entry) => ({
          institute: competition.institute,
          user: entry.user,
          type: "result",
          title: `Results published · ${competition.title}`,
          message: WINNER_POSITIONS.includes(entry.position)
            ? `Congratulations — you placed ${entry.position.replace(/_/g, " ")} in ${competition.title}.`
            : `The results for ${competition.title} are now published. Thank you for taking part.`,
          link: `/competitions/${competition.slug}`,
        }))
      );
    }
    await logActivity({
      institute: user.instituteId,
      actor: user,
      action: "competition.publish_results",
      entityType: "Competition",
      entityId: competition._id,
      summary: `Published results for ${competition.title}.`,
      meta: { entries: entries.length, awarded },
    });
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "competition.update",
    entityType: "Competition",
    entityId: competition._id,
    summary: `Updated competition ${updated.title}.`,
    meta: { fields: Object.keys(update) },
  });

  const [statusRow] = await CompetitionEntry.aggregate([
    { $match: { competition: competition._id } },
    {
      $group: {
        _id: null,
        approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, 1, 0] } },
        pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, 1, 0] } },
        total: { $sum: 1 },
      },
    },
  ]);

  return ok({ item: mapCompetition(updated, statusRow || {}) });
}

export async function DELETE(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireAdmin("manage_competitions");
  if (response) return response;
  if (!isObjectId(id)) return fail("Competition not found.", 404);

  await connectDB();
  const competition = await Competition.findOne({ _id: id, institute: user.instituteId }).lean();
  if (!competition) return fail("Competition not found.", 404);

  if (competition.status !== "cancelled") {
    await Competition.updateOne({ _id: competition._id }, { $set: { status: "cancelled" } });
    const entries = await CompetitionEntry.find({
      competition: competition._id,
      status: { $in: ["pending", "approved"] },
    })
      .select("user")
      .lean();
    await notifyMany(
      entries.map((entry) => ({
        institute: competition.institute,
        user: entry.user,
        type: "competition",
        title: `Competition cancelled · ${competition.title}`,
        message: "The organiser has cancelled this competition. Any updates will appear on your dashboard.",
        link: `/competitions/${competition.slug}`,
      }))
    );
  }

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "competition.cancel",
    entityType: "Competition",
    entityId: competition._id,
    summary: `Cancelled competition ${competition.title}.`,
  });

  return ok({ cancelled: true });
}
