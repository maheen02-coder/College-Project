import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import { logActivity } from "@/lib/activity";
import { competitionPhase, makeId, slugify } from "@/lib/utils";
import Competition from "@/lib/models/Competition";
import CompetitionEntry from "@/lib/models/CompetitionEntry";
import Society from "@/lib/models/Society";
import User from "@/lib/models/User";

export const dynamic = "force-dynamic";

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

function mapCompetition(competition, entryCount = 0) {
  const phase = competitionPhase(competition);
  const capacity = Number(competition.capacity) || 0;
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
  };
}

async function entryCounts(ids) {
  if (!ids.length) return {};
  const rows = await CompetitionEntry.aggregate([
    { $match: { competition: { $in: ids }, status: "approved" } },
    { $group: { _id: "$competition", count: { $sum: 1 } } },
  ]);
  return Object.fromEntries(rows.map((row) => [String(row._id), row.count]));
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  await connectDB();
  const institute = await getInstitute();
  if (!institute) return ok({ items: [], total: 0 });

  const now = new Date();
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 40, 1), 80);
  const scope = searchParams.get("scope") || "all";
  const q = (searchParams.get("q") || "").trim().toLowerCase();

  const query = { institute: institute._id, status: { $ne: "cancelled" } };

  const category = searchParams.get("category");
  if (category && category !== "All" && category !== "all") query.category = category;
  const type = searchParams.get("type");
  if (type && type !== "All" && type !== "all") query.type = type;

  const societyParam = (searchParams.get("society") || "").trim();
  if (societyParam) {
    const society = isObjectId(societyParam)
      ? await Society.findOne({ _id: societyParam, institute: institute._id }).lean()
      : await Society.findOne({ slug: societyParam.toLowerCase(), institute: institute._id }).lean();
    if (!society) return ok({ items: [], total: 0 });
    query.society = society._id;
  }

  if (scope === "upcoming") query.endAt = { $gte: now };
  else if (scope === "past") query.endAt = { $lt: now };

  const requestedSort = searchParams.get("sort");
  const sort =
    requestedSort === "latest"
      ? { startAt: -1 }
      : requestedSort === "soonest"
        ? { startAt: 1 }
        : scope === "past"
          ? { startAt: -1 }
          : { startAt: 1 };

  let competitions = await Competition.find(query)
    .populate("society", "name slug color")
    .sort(sort)
    .limit(160)
    .lean();

  if (q) {
    competitions = competitions.filter((competition) =>
      [competition.title, competition.excerpt, competition.category, competition.type, competition.venue, competition.prizeDetails]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  const counts = await entryCounts(competitions.map((competition) => competition._id));
  const items = competitions
    .slice(0, limit)
    .map((competition) => mapCompetition(competition, counts[String(competition._id)] || 0));

  return ok({ items, total: competitions.length });
}

const competitionSchema = z.object({
  title: z.string().trim().min(4, "Title is required.").max(140),
  excerpt: z.string().trim().max(300).optional().default(""),
  description: z.string().trim().min(20, "Add a description of at least 20 characters."),
  category: z.string().trim().min(1, "Select a category."),
  type: z.string().trim().min(1, "Select a competition type."),
  mode: z.enum(["individual", "team"]).optional().default("individual"),
  teamSize: z
    .object({ min: z.coerce.number().int().min(1), max: z.coerce.number().int().min(1) })
    .optional(),
  startAt: z.string().min(1, "Start time is required."),
  endAt: z.string().min(1, "End time is required."),
  registrationDeadline: z.string().min(1, "Registration deadline is required."),
  submissionDeadline: z.string().optional().default(""),
  venue: z.string().trim().min(2, "Venue is required."),
  capacity: z.coerce.number().int().min(1, "Capacity must be at least 1."),
  prizeDetails: z.string().trim().max(400).optional().default(""),
  rules: z.union([z.array(z.string()), z.string()]).optional().default([]),
  requirements: z.string().trim().max(2000).optional().default(""),
  poster: z.string().trim().max(500).optional().default(""),
  status: z
    .enum(["upcoming", "registration_open", "registration_closed", "ongoing", "completed", "cancelled"])
    .optional(),
  leaderboardPublished: z.boolean().optional().default(false),
  societyId: z.string().trim().optional().default(""),
  organizerId: z.string().trim().optional().default(""),
  organizer: z.string().trim().optional().default(""),
});

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_competitions");
  if (response) return response;

  const body = await readJson(request);
  const parsed = competitionSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  const startAt = new Date(data.startAt);
  const endAt = new Date(data.endAt);
  const registrationDeadline = new Date(data.registrationDeadline);
  const submissionDeadline = data.submissionDeadline ? new Date(data.submissionDeadline) : null;
  if ([startAt, endAt, registrationDeadline, submissionDeadline].filter(Boolean).some((date) => Number.isNaN(date.getTime()))) {
    return fail("Enter valid competition dates.", 422);
  }
  if (startAt >= endAt) return fail("End time must be after the start.", 422);
  if (registrationDeadline > startAt) {
    return fail("Registration deadline must be on or before the competition start.", 422);
  }
  if (submissionDeadline && (submissionDeadline < startAt || submissionDeadline > endAt)) {
    return fail("Submission deadline must fall within the competition window.", 422);
  }

  const teamMode = data.mode === "team";
  let teamSize = { min: 1, max: 1 };
  if (teamMode) {
    const min = Math.max(2, Number(data.teamSize?.min) || 2);
    const max = Math.max(min, Number(data.teamSize?.max) || min);
    teamSize = { min, max };
  }

  await connectDB();

  let societyId = null;
  if (data.societyId) {
    if (!isObjectId(data.societyId)) return fail("Select a valid society.", 422);
    const society = await Society.findOne({ _id: data.societyId, institute: user.instituteId }).lean();
    if (!society) return fail("Society not found.", 422);
    societyId = society._id;
  }

  let organizerId = user.id;
  let organizerName = user.name;
  const organizerRef = data.organizerId || data.organizer;
  if (organizerRef) {
    if (!isObjectId(organizerRef)) return fail("Select a valid organizer.", 422);
    const organizer = await User.findOne({ _id: organizerRef, institute: user.instituteId }).lean();
    if (!organizer) return fail("Organizer not found.", 422);
    organizerId = organizer._id;
    organizerName = organizer.name;
  }

  const baseSlug = slugify(data.title) || `competition-${makeId("C", 5).toLowerCase()}`;
  let slug = baseSlug;
  if (await Competition.exists({ institute: user.instituteId, slug })) {
    slug = `${baseSlug}-${makeId("C", 4).toLowerCase()}`;
  }

  const competition = await Competition.create({
    institute: user.instituteId,
    society: societyId || undefined,
    title: data.title,
    slug,
    excerpt: data.excerpt,
    description: data.description,
    poster: data.poster,
    category: data.category,
    type: data.type,
    mode: data.mode,
    teamSize,
    venue: data.venue,
    startAt,
    endAt,
    registrationDeadline,
    submissionDeadline: submissionDeadline || undefined,
    capacity: data.capacity,
    prizeDetails: data.prizeDetails,
    rules: toList(data.rules),
    requirements: data.requirements,
    organizer: organizerId,
    organizerName,
    status: data.status || "registration_open",
    leaderboardPublished: data.leaderboardPublished,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "competition.create",
    entityType: "Competition",
    entityId: competition._id,
    summary: `Published competition ${competition.title}.`,
  });

  const created = await Competition.findById(competition._id).populate("society", "name slug color").lean();
  return ok({ item: mapCompetition(created, 0) }, { status: 201 });
}
