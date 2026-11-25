import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireStudent } from "@/lib/api";
import { getSessionUser, hasAdminPermission, isAdmin } from "@/lib/auth";
import { notify } from "@/lib/notify";
import { competitionPhase, makeId } from "@/lib/utils";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";

export const dynamic = "force-dynamic";

function isObjectId(value) {
  return typeof value === "string" && /^[0-9a-fA-F]{24}$/.test(value);
}

function iso(value) {
  return value ? new Date(value).toISOString() : null;
}

function mapMembers(members, { publicView = false } = {}) {
  return (members || []).map((member) => ({
    name: member.name || "Member",
    rollNumber: publicView ? undefined : member.rollNumber || "",
    email: publicView ? undefined : member.email || "",
  }));
}

function mapEntry(entry, { publicView = false, leaderboardPublished = false } = {}) {
  const student = entry.user || {};
  const base = {
    id: String(entry._id),
    entryId: entry.entryId,
    teamName: entry.teamName || "",
    members: mapMembers(entry.members, { publicView }),
    status: entry.status,
    createdAt: iso(entry.createdAt),
    user: {
      id: String(student._id || ""),
      name: student.name || "Unknown student",
      avatar: student.avatar || "",
      department: student.department || "",
      rollNumber: publicView ? undefined : student.rollNumber || "",
      email: publicView ? undefined : student.email || "",
    },
  };
  if (publicView) {
    return {
      ...base,
      position: leaderboardPublished ? entry.position || "none" : null,
      score: leaderboardPublished ? entry.score ?? null : null,
    };
  }
  return {
    ...base,
    score: entry.score ?? null,
    position: entry.position || "none",
    remarks: entry.remarks || "",
    submissionLink: entry.submissionLink || "",
  };
}

export async function GET(request, { params }) {
  const { id } = await params;
  if (!isObjectId(id)) return fail("Competition not found.", 404);

  await connectDB();
  const competition = await Competition.findById(id).lean();
  if (!competition) return fail("Competition not found.", 404);

  const user = await getSessionUser();
  const sameInstitute = user && String(user.instituteId) === String(competition.institute);
  const staff = Boolean(sameInstitute && isAdmin(user) && hasAdminPermission(user, "manage_competitions"));

  const query = { competition: competition._id };
  if (!staff) query.status = "approved";

  const entries = await CompetitionEntry.find(query)
    .populate("user", "name email rollNumber department avatar")
    .sort({ createdAt: 1 })
    .lean();

  const rank = { winner: 0, runner_up: 1, second_runner_up: 2, participant: 3, none: 4 };
  const sorted = staff
    ? entries
    : entries
        .slice()
        .sort(
          (a, b) =>
            (rank[a.position] ?? 4) - (rank[b.position] ?? 4) ||
            (Number(b.score) || 0) - (Number(a.score) || 0)
        );

  return ok({
    items: sorted.map((entry) =>
      mapEntry(entry, {
        publicView: !staff,
        leaderboardPublished: staff ? true : Boolean(competition.leaderboardPublished),
      })
    ),
    total: sorted.length,
    leaderboardPublished: Boolean(competition.leaderboardPublished),
    canManage: staff,
  });
}

const memberSchema = z.object({
  name: z.string().trim().min(1, "Member name is required.").max(80),
  rollNumber: z.string().trim().max(40).optional().default(""),
  email: z.string().trim().max(120).optional().default(""),
});

const schema = z.object({
  teamName: z.string().trim().max(80).optional().default(""),
  members: z.array(memberSchema).max(12).optional().default([]),
  submissionLink: z.string().trim().max(500).optional().default(""),
});

export async function POST(request, { params }) {
  const { id } = await params;
  const { user, response } = await requireStudent();
  if (response) return response;
  if (user.verificationStatus !== "verified") {
    return fail("Your student account must be verified to enter competitions.", 403);
  }
  if (!isObjectId(id)) return fail("Competition not found.", 404);

  const body = await readJson(request);
  const parsed = schema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const { teamName, members, submissionLink } = parsed.data;

  await connectDB();
  const competition = await Competition.findById(id).lean();
  if (!competition) return fail("Competition not found.", 404);
  if (String(competition.institute) !== String(user.instituteId)) return fail("Competition not found.", 404);
  if (competition.status === "cancelled") return fail("This competition has been cancelled.", 409);

  const phase = competitionPhase(competition);
  if (phase === "completed") return fail("This competition has already ended.", 409);
  if (new Date(competition.registrationDeadline) < new Date()) {
    return fail("Registration is closed for this competition.", 409);
  }

  const capacity = Number(competition.capacity) || 0;
  const count = await CompetitionEntry.countDocuments({
    competition: competition._id,
    status: { $in: ["pending", "approved"] },
  });
  if (capacity && count >= capacity) return fail("This competition has reached full capacity.", 409);

  const existing = await CompetitionEntry.findOne({ competition: competition._id, user: user.id }).lean();
  if (existing) return fail("You have already entered this competition.", 409);

  const isTeam = competition.mode === "team";
  let entryMembers = [];
  if (isTeam) {
    if (teamName.length < 2) return fail("Enter a team name.", 422);
    const min = Number(competition.teamSize?.min) || 2;
    const max = Math.max(min, Number(competition.teamSize?.max) || min);
    const captainIncluded = members.some(
      (member) => member.name.trim().toLowerCase() === String(user.name || "").trim().toLowerCase()
    );
    const roster = captainIncluded
      ? members
      : [
          { name: user.name, rollNumber: user.matricRollNumber || user.rollNumber || "", email: user.email },
          ...members,
        ];
    if (roster.length < min) return fail(`Teams need at least ${min} members.`, 422);
    if (roster.length > max) return fail(`Teams can have at most ${max} members.`, 422);
    entryMembers = roster.map((member) => ({
      name: member.name.trim(),
      rollNumber: (member.rollNumber || "").trim(),
      email: (member.email || "").trim(),
    }));
  } else if (members.length) {
    entryMembers = members.map((member) => ({
      name: member.name.trim(),
      rollNumber: (member.rollNumber || "").trim(),
      email: (member.email || "").trim(),
    }));
  } else {
    entryMembers = [
      {
        name: user.name,
        rollNumber: user.matricRollNumber || user.rollNumber || "",
        email: user.email,
      },
    ];
  }

  let entry;
  try {
    entry = await CompetitionEntry.create({
      institute: competition.institute,
      competition: competition._id,
      user: user.id,
      entryId: makeId("KIPS-ENT", 6),
      teamName: isTeam ? teamName : "",
      members: entryMembers,
      submissionLink,
      status: competition.registrationType === "approval" ? "pending" : "approved",
    });
  } catch (error) {
    if (error?.code === 11000) return fail("You have already entered this competition.", 409);
    throw error;
  }

  await notify({
    instituteId: competition.institute,
    userId: user.id,
    type: "competition",
    title: `Entry received · ${competition.title}`,
    message:
      entry.status === "pending"
        ? `Your entry is awaiting review by the organiser.`
        : isTeam
          ? `Team "${teamName}" is registered for ${competition.title}.`
          : `You are registered for ${competition.title}.`,
    link: `/competitions/${competition.slug}`,
  });

  return ok(
    {
      item: {
        id: String(entry._id),
        entryId: entry.entryId,
        teamName: entry.teamName,
        members: entry.members,
        status: entry.status,
        submissionLink: entry.submissionLink,
        createdAt: iso(entry.createdAt),
        competition: {
          id: String(competition._id),
          title: competition.title,
          slug: competition.slug,
        },
      },
    },
    { status: 201 }
  );
}
