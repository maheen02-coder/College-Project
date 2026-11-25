import { z } from "zod";
import { connectDB } from "@/lib/db";
import { fail, firstIssue, ok, readJson, requireAdmin } from "@/lib/api";
import { getInstitute } from "@/lib/queries";
import { getSessionUser } from "@/lib/auth";
import { logActivity } from "@/lib/activity";
import { makeId, slugify } from "@/lib/utils";
import Event from "@/lib/models/Event";
import Recruitment from "@/lib/models/Recruitment";
import Society from "@/lib/models/Society";
import SocietyMember from "@/lib/models/SocietyMember";

export const dynamic = "force-dynamic";

function mapSociety(society, counts) {
  return {
    id: String(society._id),
    name: society.name,
    slug: society.slug,
    tagline: society.tagline,
    description: society.description,
    category: society.category,
    color: society.color,
    logo: society.logo,
    cover: society.cover,
    featured: Boolean(society.featured),
    foundedYear: society.foundedYear,
    meetingSchedule: society.meetingSchedule,
    memberCount: counts.members[String(society._id)] || 0,
    eventCount: counts.events[String(society._id)] || 0,
    openRecruitments: counts.recruitments[String(society._id)] || 0,
    leaders: counts.leaders[String(society._id)] || [],
    myRole: counts.myRoles?.[String(society._id)] || "",
    isActive: society.isActive,
  };
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const institute = await getInstitute();
  if (!institute) return ok({ items: [] });

  await connectDB();
  const query = { institute: institute._id, isActive: true };
  const category = searchParams.get("category");
  if (category && category !== "All") query.category = category;
  if (searchParams.get("featured") === "true" || searchParams.get("scope") === "featured") {
    query.featured = true;
  }

  let societies = await Society.find(query).sort({ featured: -1, name: 1 }).limit(100).lean();
  const q = (searchParams.get("q") || "").toLowerCase();
  if (q) {
    societies = societies.filter((s) =>
      [s.name, s.tagline, s.description, s.category, s.purpose].join(" ").toLowerCase().includes(q)
    );
  }

  let myRoles = {};
  if (searchParams.get("mine") === "1") {
    const user = await getSessionUser();
    if (!user) return fail("Sign in to view your societies.", 401);
    const memberships = await SocietyMember.find({
      institute: institute._id,
      user: user.id,
      status: "active",
    }).lean();
    myRoles = Object.fromEntries(memberships.map((row) => [String(row.society), row.role]));
    societies = societies.filter((s) => myRoles[String(s._id)]);
  }

  if (!societies.length) return ok({ items: [] });

  const ids = societies.map((s) => s._id);
  const [memberRows, leaders, eventRows, recruitmentRows] = await Promise.all([
    SocietyMember.aggregate([
      { $match: { society: { $in: ids }, status: "active" } },
      { $group: { _id: "$society", count: { $sum: 1 } } },
    ]),
    SocietyMember.find({
      society: { $in: ids },
      status: "active",
      role: { $in: ["president", "vice_president"] },
    })
      .populate("user", "name")
      .lean(),
    Event.aggregate([{ $match: { society: { $in: ids } } }, { $group: { _id: "$society", count: { $sum: 1 } } }]),
    Recruitment.find({ society: { $in: ids }, status: "open", closesAt: { $gt: new Date() } })
      .select("society")
      .lean(),
  ]);

  const members = Object.fromEntries(memberRows.map((row) => [String(row._id), row.count]));
  const events = Object.fromEntries(eventRows.map((row) => [String(row._id), row.count]));
  const recruitments = {};
  for (const row of recruitmentRows) {
    const key = String(row.society);
    recruitments[key] = (recruitments[key] || 0) + 1;
  }
  const leadersBySociety = {};
  for (const row of leaders) {
    if (!row.user) continue;
    const key = String(row.society);
    leadersBySociety[key] = leadersBySociety[key] || [];
    leadersBySociety[key].push({ name: row.user.name, role: row.role });
  }

  return ok({
    items: societies.map((s) => mapSociety(s, { members, events, recruitments, leaders: leadersBySociety, myRoles })),
  });
}

const createSchema = z.object({
  name: z.string().trim().min(2, "Society name is required.").max(80),
  tagline: z.string().trim().max(140).optional().default(""),
  description: z.string().trim().min(10, "Add a description of at least 10 characters.").max(4000),
  purpose: z.string().trim().max(1000).optional().default(""),
  activities: z.union([z.array(z.string()), z.string()]).optional().default([]),
  category: z.string().trim().max(60).optional().default("General"),
  color: z.string().trim().max(20).optional().default("#7c3aed"),
  logo: z.string().trim().max(300).optional().default(""),
  cover: z.string().trim().max(300).optional().default(""),
  foundedYear: z
    .union([z.literal(""), z.coerce.number().int().min(1900).max(2100)])
    .nullable()
    .optional()
    .default(null),
  email: z.string().trim().max(120).optional().default(""),
  meetingSchedule: z.string().trim().max(160).optional().default(""),
  featured: z.boolean().optional().default(false),
  isActive: z.boolean().optional().default(true),
});

function toList(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean);
  return String(value || "")
    .split("\n")
    .map((v) => v.trim())
    .filter(Boolean);
}

async function uniqueSlug(instituteId, name) {
  const base = slugify(name) || `society-${makeId("S", 4).toLowerCase()}`;
  let slug = base;
  let index = 2;
  while (await Society.exists({ institute: instituteId, slug })) {
    slug = `${base}-${index}`;
    index += 1;
  }
  return slug;
}

export async function POST(request) {
  const { user, response } = await requireAdmin("manage_societies");
  if (response) return response;

  const body = await readJson(request);
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) return fail(firstIssue(parsed.error), 422);
  const data = parsed.data;

  await connectDB();
  const slug = await uniqueSlug(user.instituteId, data.name);

  const society = await Society.create({
    institute: user.instituteId,
    name: data.name,
    slug,
    tagline: data.tagline,
    description: data.description,
    purpose: data.purpose,
    activities: toList(data.activities),
    category: data.category,
    color: data.color,
    logo: data.logo,
    cover: data.cover,
    foundedYear: data.foundedYear === "" ? null : data.foundedYear,
    email: data.email,
    meetingSchedule: data.meetingSchedule,
    featured: data.featured,
    isActive: data.isActive,
    createdBy: user.id,
  });

  await logActivity({
    institute: user.instituteId,
    actor: user,
    action: "society.create",
    entityType: "Society",
    entityId: society._id,
    summary: `Created society ${society.name}.`,
  });

  return ok(
    {
      item: {
        id: String(society._id),
        name: society.name,
        slug: society.slug,
        tagline: society.tagline,
        description: society.description,
        category: society.category,
        color: society.color,
        logo: society.logo,
        cover: society.cover,
        featured: society.featured,
        foundedYear: society.foundedYear,
        meetingSchedule: society.meetingSchedule,
        isActive: society.isActive,
      },
    },
    { status: 201 }
  );
}
